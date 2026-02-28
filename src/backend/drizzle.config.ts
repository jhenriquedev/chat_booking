import { defineConfig } from "drizzle-kit";

if (!process.env.POSTGRES_URL) {
  throw new Error(
    "POSTGRES_URL não definida. Defina a variável de ambiente antes de rodar drizzle-kit.",
  );
}

export default defineConfig({
  out: "./drizzle",
  schema: ["./shared/schema.ts", "./shared/schemas/*.ts"],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL,
  },
});
