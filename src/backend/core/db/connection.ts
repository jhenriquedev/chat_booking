import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../config/config.js";

const client = postgres(config.POSTGRES_URL);

export const db = drizzle({ client });
