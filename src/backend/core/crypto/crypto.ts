import { createHash } from "node:crypto";

/** Hash SHA-256 para uso como chave de busca deterministica (telefone, etc.) */
export function hashPhone(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
