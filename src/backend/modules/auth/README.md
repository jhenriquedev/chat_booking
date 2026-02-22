# Auth Module

Autenticacao e gerenciamento de sessao via JWT (HS256).

## Endpoints

### POST /api/auth/login

Autentica um usuario pelo telefone. Se o usuario nao existir, cria automaticamente (auto-cadastro).

**Acesso:** Publico

**Request Body:**

| Campo   | Tipo   | Obrigatorio | Descricao                            |
|---------|--------|-------------|--------------------------------------|
| `phone` | string | Sim         | Telefone internacional (+5511999999999) |
| `name`  | string | Nao         | Nome do usuario (usado no auto-cadastro) |

**Response 200:**

| Campo          | Tipo   | Descricao                                |
|----------------|--------|------------------------------------------|
| `accessToken`  | string | JWT (HS256) para autenticacao nas rotas  |
| `refreshToken` | string | Token opaco para renovar o access token  |
| `expiresIn`    | number | Tempo de expiracao do access token (seg) |
| `user.id`      | string | UUID do usuario                          |
| `user.name`    | string | Nome                                     |
| `user.phone`   | string | Telefone                                 |
| `user.role`    | string | USER, OPERATOR, TENANT ou OWNER          |
| `user.active`  | boolean| Status ativo                             |

**Regras de negocio:**

1. O telefone e convertido para hash SHA-256 (`phoneHash`) no servidor para busca indexada
2. Se nao encontrar usuario pelo `phoneHash`, cria um novo com role `USER`
3. Se o usuario existir mas estiver inativo (`active = false`), retorna `401 UNAUTHORIZED`
4. O JWT payload contem `sub` (userId), `role`, `tenantId` e `businessId`
5. Para roles `OPERATOR` e `TENANT`, o payload e enriquecido com lookup no banco (tenantId/businessId)
6. O refresh token e armazenado como hash SHA-256 no banco (nunca em texto plano)
7. Se `name` nao for informado no auto-cadastro, usa o proprio telefone como nome

**Erros:**

| Status | Code         | Quando                    |
|--------|--------------|---------------------------|
| 401    | UNAUTHORIZED | Usuario inativo           |
| 422    | VALIDATION_ERROR | Body invalido (Zod)  |

---

### POST /api/auth/refresh

Troca um refresh token valido por um novo par de access + refresh token (rotacao).

**Acesso:** Publico

**Request Body:**

| Campo          | Tipo   | Obrigatorio | Descricao                |
|----------------|--------|-------------|--------------------------|
| `refreshToken` | string | Sim         | Refresh token recebido no login |

**Response 200:**

| Campo          | Tipo   | Descricao                                |
|----------------|--------|------------------------------------------|
| `accessToken`  | string | Novo JWT                                 |
| `refreshToken` | string | Novo refresh token (o anterior e invalidado) |
| `expiresIn`    | number | Tempo de expiracao do access token (seg) |

**Regras de negocio:**

1. O refresh token recebido e convertido para hash SHA-256 e buscado no banco
2. Verifica se o token nao esta expirado (`expiresAt > now()`)
3. Verifica se o usuario associado existe e esta ativo
4. O token antigo e deletado do banco (rotacao — cada token so pode ser usado uma vez)
5. Gera novo par de tokens com os mesmos dados do payload atualizado

**Erros:**

| Status | Code          | Quando                                |
|--------|---------------|---------------------------------------|
| 401    | INVALID_TOKEN | Token inexistente ou expirado         |
| 401    | UNAUTHORIZED  | Usuario nao encontrado ou inativo     |

---

### POST /api/auth/logout

Invalida todos os refresh tokens do usuario autenticado.

**Acesso:** Autenticado (Bearer token)

**Request Body:** Nenhum

**Response 200:**

| Campo     | Tipo   | Descricao                    |
|-----------|--------|------------------------------|
| `message` | string | "Logout realizado com sucesso" |

**Regras de negocio:**

1. O userId e extraido do JWT (`session.sub`) — nao recebe input
2. Deleta **todos** os refresh tokens do usuario no banco
3. O access token continua valido ate expirar (stateless) — o logout invalida apenas refresh tokens

**Erros:**

| Status | Code         | Quando                     |
|--------|--------------|----------------------------|
| 401    | UNAUTHORIZED | Token ausente ou invalido  |

---

## Schemas (Zod)

| Schema                 | Arquivo           | Uso                        |
|------------------------|-------------------|----------------------------|
| `loginRequestSchema`   | types/dtos/dtos.ts | Validacao do body do login |
| `loginResponseSchema`  | types/dtos/dtos.ts | Response do login          |
| `refreshRequestSchema` | types/dtos/dtos.ts | Validacao do body do refresh |
| `refreshResponseSchema`| types/dtos/dtos.ts | Response do refresh        |
| `logoutResponseSchema` | types/dtos/dtos.ts | Response do logout         |
| `loginUserSchema`      | types/dtos/dtos.ts | Sub-schema do usuario no login |
| `errorResponseSchema`  | shared/dtos.ts     | Resposta padrao de erro    |
| `refreshTokenEntitySchema` | types/entities/entities.ts | Validacao da entidade refresh token |

## Seguranca

- **Access token**: JWT HS256, expira em 1 hora (configuravel via `ACCESS_TOKEN_EXPIRES_IN`)
- **Refresh token**: 64 hex chars aleatorios, armazenado como SHA-256 no banco, expira em 24 horas (configuravel via `REFRESH_TOKEN_EXPIRES_IN`)
- **Rotacao de refresh token**: cada uso gera um novo par, invalidando o anterior
- **Phone hash**: SHA-256 do telefone para busca indexada (telefone tambem armazenado em texto plano para exibicao)

## Arquitetura

```
1_module.ts    — Composicao: repository -> service -> handler -> register(app)
2_api.ts       — Definicao das 3 rotas OpenAPI (login, refresh, logout)
3_handler.ts   — IAuthHandler: extrai session/body, chama service, retorna response
4_service.ts   — IAuthService: hash, JWT, rotacao de tokens, regras de negocio
5_repository.ts — IAuthRepository: queries Drizzle (users, refresh_tokens, operators, tenants)
```
