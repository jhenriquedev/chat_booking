export { config, type Config } from "./config/config.js";
export { hashPhone } from "./crypto/crypto.js";
export {
  type Container,
  type ModuleFactory,
  type FeatureFactory,
  registerModules,
} from "./container/container.js";
export { db } from "./db/connection.js";
export { errorHandler, respondError } from "./error/error.handler.js";
export { loggerMiddleware, getCorrelationId } from "./logger/logger.middleware.js";
export { Result, type AppError } from "./result/result.js";
export {
  sessionGuard,
  getSession,
  hasRole,
  requireRole,
  type Role,
  type SessionPayload,
} from "./session/session.guard.js";
