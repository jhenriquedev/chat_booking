import { z } from "zod";

/**
 * Schema de validação de variáveis de ambiente.
 * Todas as envs obrigatórias do backend são validadas aqui no startup.
 * Se faltar algo, o processo falha cedo com mensagem clara.
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),

  // Postgres
  POSTGRES_URL: z.string().min(1, "POSTGRES_URL is required"),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Auth
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_EXPIRES_IN: z.coerce.number().default(3600), // 1 hora
  REFRESH_TOKEN_EXPIRES_IN: z.coerce.number().default(86400), // 24 horas
});

export type Config = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const config: Config = parsed.data;
