import { createHash, randomBytes } from "node:crypto";
import { sign } from "hono/jwt";
import type { Config } from "../../core/config/config.js";
import { hashPhone } from "../../core/crypto/crypto.js";
import type { Result } from "../../core/result/result.js";
import { Result as R } from "../../core/result/result.js";
import type { Role, SessionPayload } from "../../core/session/session.guard.js";
import type { IAuthRepository } from "./5_repository.js";
import type { LoginRequest, LoginResponse, RefreshResponse } from "./types/dtos/dtos.js";
import { AuthErrorCode } from "./types/enums/enums.js";

export interface IAuthService {
  login(input: LoginRequest): Promise<Result<LoginResponse>>;
  refresh(rawRefreshToken: string): Promise<Result<RefreshResponse>>;
  logout(userId: string): Promise<Result<{ message: string }>>;
}

const VALID_ROLES = new Set<string>(["USER", "OPERATOR", "TENANT", "OWNER"]);

/** Valida que o role do DB é um Role válido */
function parseRole(role: string): Role | null {
  return VALID_ROLES.has(role) ? (role as Role) : null;
}

export function createAuthService(config: Config, repository: IAuthRepository): IAuthService {
  /** Hash SHA-256 do refresh token */
  function hashToken(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  /** Gera refresh token aleatório (64 hex chars) */
  function generateRefreshToken(): string {
    return randomBytes(32).toString("hex");
  }

  /** Monta SessionPayload com tenantId/businessId baseado no role */
  async function buildSessionPayload(userId: string, role: Role): Promise<Result<SessionPayload>> {
    let tenantId: string | null = null;
    let businessId: string | null = null;

    if (role === "OPERATOR") {
      const opResult = await repository.findOperatorByUserId(userId);
      if (opResult.isErr()) return R.fail(opResult.error);
      if (!opResult.value) {
        return R.fail({
          code: AuthErrorCode.UNAUTHORIZED,
          message: "Operador não possui registro ativo",
        });
      }
      tenantId = opResult.value.tenantId;
      businessId = opResult.value.businessId;
    } else if (role === "TENANT") {
      const tenantResult = await repository.findTenantByUserId(userId);
      if (tenantResult.isErr()) return R.fail(tenantResult.error);
      if (!tenantResult.value) {
        return R.fail({
          code: AuthErrorCode.UNAUTHORIZED,
          message: "Tenant não possui registro ativo",
        });
      }
      tenantId = tenantResult.value.tenantId;
    }

    return R.ok({ sub: userId, role, tenantId, businessId });
  }

  /** Assina JWT access token com HS256 */
  async function signAccessToken(payload: SessionPayload): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return sign(
      { ...payload, iat: now, exp: now + config.ACCESS_TOKEN_EXPIRES_IN },
      config.JWT_SECRET,
      "HS256",
    );
  }

  return {
    /** Login: find-or-create user, gera par de tokens */
    async login(input: LoginRequest): Promise<Result<LoginResponse>> {
      // 1. Gera hash do telefone e busca user
      const phoneHash = hashPhone(input.phone);
      const userResult = await repository.findUserByPhoneHash(phoneHash);
      if (userResult.isErr()) return R.fail(userResult.error);

      let user = userResult.value;

      // 2. Se não existe, cria
      if (!user) {
        const createResult = await repository.createUser({
          name: input.name ?? input.phone,
          phone: input.phone,
          phoneHash,
        });
        if (createResult.isErr()) return R.fail(createResult.error);
        user = createResult.value;
      }

      // 3. Verifica se está ativo
      if (!user.active) {
        return R.fail({ code: AuthErrorCode.USER_INACTIVE, message: "Conta de usuário inativa" });
      }

      // 4. Valida role do DB
      const role = parseRole(user.role);
      if (!role) {
        return R.fail({ code: AuthErrorCode.UNAUTHORIZED, message: "Role de usuário inválido" });
      }

      // 5. Monta payload do JWT (com lookup de tenantId/businessId)
      const payloadResult = await buildSessionPayload(user.id, role);
      if (payloadResult.isErr()) return R.fail(payloadResult.error);

      // 6. Gera access token
      const accessToken = await signAccessToken(payloadResult.value);

      // 7. Gera refresh token, hash, armazena no DB
      const rawRefreshToken = generateRefreshToken();
      const refreshTokenHash = hashToken(rawRefreshToken);
      const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_EXPIRES_IN * 1000);

      const storeResult = await repository.createRefreshToken({
        userId: user.id,
        token: refreshTokenHash,
        expiresAt,
      });
      if (storeResult.isErr()) return R.fail(storeResult.error);

      return R.ok({
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: config.ACCESS_TOKEN_EXPIRES_IN,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role,
          active: user.active,
        },
      });
    },

    /** Refresh: valida refresh token, rotaciona par */
    async refresh(rawRefreshToken: string): Promise<Result<RefreshResponse>> {
      // 1. Hash do token recebido
      const tokenHash = hashToken(rawRefreshToken);

      // 2. Busca no DB (verifica expiração)
      const findResult = await repository.findRefreshTokenByHash(tokenHash);
      if (findResult.isErr()) return R.fail(findResult.error);

      if (!findResult.value) {
        return R.fail({
          code: AuthErrorCode.INVALID_TOKEN,
          message: "Refresh token inválido ou expirado",
        });
      }

      const existingToken = findResult.value;

      // 3. Busca o usuário
      const userResult = await repository.findUserById(existingToken.userId);
      if (userResult.isErr()) return R.fail(userResult.error);

      if (!userResult.value || !userResult.value.active) {
        return R.fail({
          code: AuthErrorCode.UNAUTHORIZED,
          message: "Usuário não encontrado ou inativo",
        });
      }

      const user = userResult.value;

      // 4. Deleta token antigo (rotação)
      const deleteResult = await repository.deleteRefreshTokenById(existingToken.id);
      if (deleteResult.isErr()) return R.fail(deleteResult.error);

      // 5. Valida role e monta novo payload
      const role = parseRole(user.role);
      if (!role) {
        return R.fail({ code: AuthErrorCode.UNAUTHORIZED, message: "Role de usuário inválido" });
      }
      const payloadResult = await buildSessionPayload(user.id, role);
      if (payloadResult.isErr()) return R.fail(payloadResult.error);

      // 6. Novo access token
      const accessToken = await signAccessToken(payloadResult.value);

      // 7. Novo refresh token
      const newRawRefreshToken = generateRefreshToken();
      const newRefreshTokenHash = hashToken(newRawRefreshToken);
      const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_EXPIRES_IN * 1000);

      const storeResult = await repository.createRefreshToken({
        userId: user.id,
        token: newRefreshTokenHash,
        expiresAt,
      });
      if (storeResult.isErr()) return R.fail(storeResult.error);

      return R.ok({
        accessToken,
        refreshToken: newRawRefreshToken,
        expiresIn: config.ACCESS_TOKEN_EXPIRES_IN,
      });
    },

    /** Logout: invalida todos os refresh tokens do usuário */
    async logout(userId: string): Promise<Result<{ message: string }>> {
      const deleteResult = await repository.deleteAllRefreshTokensByUserId(userId);
      if (deleteResult.isErr()) return R.fail(deleteResult.error);

      return R.ok({ message: "Logout realizado com sucesso" });
    },
  };
}
