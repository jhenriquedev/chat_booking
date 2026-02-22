import { spawn } from 'node:child_process';
import { createAppError, result, type AppError, type Result } from '../helpers/index';

/**
 * Options used to run Drizzle migrations for a given module.
 *
 * This adapter centralizes how the project interacts with the
 * `drizzle-kit` CLI so that any module can reuse the same
 * conventions (environment, error handling, logging, etc.).
 */
export interface DrizzleMigrationOptions {
  /**
   * Logical module name, used only for logging and error messages.
   * Example: "PartnersBFF".
   */
  moduleName: string;
  /**
   * Path to the drizzle configuration file relative to the project
   * root, for example: "drizzle.partnersbff.config.ts".
   */
  configPath: string;
  /**
   * Name of the environment variable that holds the connection
   * string for the target database.
   *
   * Example: "PARTNERS_BFF_POSTGRES_DB".
   */
  envConnectionKey: string;
}

/**
 * Runs Drizzle migrations using the `drizzle-kit migrate` command.
 *
 * The function is environment‑agnostic: it only requires that the
 * caller provides a configuration file path and an environment key
 * where the connection string is stored.
 *
 * Behaviour:
 * - If the connection string is missing, returns `CONFIG_KEY_MISSING`;
 * - If the CLI exits with code 0, returns `Success<void>`;
 * - If the CLI exits with non‑zero code but the output suggests that
 *   the database is already up‑to‑date (no pending migrations), the
 *   function returns `Success<void>` with a soft warning;
 * - Any other non‑zero exit code is wrapped as `DRIZZLE_MIGRATION_FAILED`.
 */
export const runDrizzleMigrations = async (
  options: DrizzleMigrationOptions,
): Promise<Result<void, AppError>> => {
  const connectionString = process.env[options.envConnectionKey];
  if (!connectionString || connectionString.length === 0) {
    return result
      .Error<
        void,
        AppError
      >(createAppError('CONFIG_KEY_MISSING', `Drizzle migrations: missing connection string environment key ${options.envConnectionKey} for module ${options.moduleName}`))
      .unwrap();
  }

  return await new Promise<Result<void, AppError>>((resolve) => {
    const args = ['drizzle-kit', 'migrate', `--config=${options.configPath}`];

    const child = spawn('npx', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        DATABASE_URL: connectionString,
      },
      shell: process.platform === 'win32',
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve(result.Success<void, AppError>(undefined).unwrap());
        return;
      }

      const combined = `${stdout}\n${stderr}`.toLowerCase();
      const alreadyUpToDate =
        combined.includes('no pending migrations') ||
        combined.includes('already up to date') ||
        combined.includes('already at latest');

      if (alreadyUpToDate) {
        // Soft warning: migrations were likely já aplicadas. Tratamos
        // como sucesso para nao quebrar deploys ou watch flows. Logs
        // do comando `drizzle-kit` já estarao no console padrão.
        resolve(result.Success<void, AppError>(undefined).unwrap());
        return;
      }

      resolve(
        result
          .Error<void, AppError>(
            createAppError(
              'DRIZZLE_MIGRATION_FAILED',
              `Drizzle migrations failed for module ${options.moduleName}`,
              {
                details: {
                  exitCode: code,
                  configPath: options.configPath,
                },
              },
            ),
          )
          .unwrap(),
      );
    });
  });
};
