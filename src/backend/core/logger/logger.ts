import { config } from "../config/config.js";

type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

const isProd = config.NODE_ENV === "production";

function emit(level: LogLevel, message: string, payload?: LogPayload): void {
  if (isProd) {
    const entry = { level, message, timestamp: new Date().toISOString(), ...payload };
    const line = JSON.stringify(entry);
    if (level === "error") {
      process.stderr.write(`${line}\n`);
    } else {
      process.stdout.write(`${line}\n`);
    }
    return;
  }

  // Dev: formato legível com cores
  const colors: Record<LogLevel, string> = {
    info: "\x1b[36m",
    warn: "\x1b[33m",
    error: "\x1b[31m",
  };
  const reset = "\x1b[0m";
  const prefix = `${colors[level]}[${level.toUpperCase()}]${reset}`;
  const extra = payload ? ` ${JSON.stringify(payload)}` : "";

  if (level === "error") {
    console.error(`${prefix} ${message}${extra}`);
  } else {
    console.log(`${prefix} ${message}${extra}`);
  }
}

export const logger = {
  info: (message: string, payload?: LogPayload) => emit("info", message, payload),
  warn: (message: string, payload?: LogPayload) => emit("warn", message, payload),
  error: (message: string, payload?: LogPayload) => emit("error", message, payload),
};
