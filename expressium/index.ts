import 'dotenv/config';
import { Express } from 'express';
import fs from 'fs/promises';
import { IncomingMessage, Server, ServerResponse } from 'http';
import https from 'https';
import momentTimezone from 'moment-timezone';
import path from 'path';
import { fileURLToPath } from 'url';
import { expressiumRoute } from './routes/index.js';
import { cryptographyUtil, HttpClientUtil, loggerUtil, projectUtil, rateLimiterUtil } from './utils/index.js';
import { ApiKeyStrategy, BasicStrategy, BasicAndBearerStrategy, BearerStrategy } from './utils/strategies/index.js';
import { IAuthenticationStrategy } from './utils/strategies/interfaces/index.js';

/**
 * ## global
 *
 * Global type declarations for the Node.js environment.
 *
 * @description
 * Extends the global Node.js namespace with custom type definitions to support
 * utility methods and global enhancements. Enables type safety and autocompletion
 * for custom extensions to native JavaScript objects.
 */
declare global {
  /**
   * ## ObjectConstructor
   *
   * Augments the global `Object` interface with custom type-checking utilities.
   *
   * @description
   * Adds reusable type guard methods to the `Object` constructor to enhance
   * safety when handling unknown or dynamic values.
   */
  interface ObjectConstructor {
    /**
     * ## isObject
     *
     * Type guard for non-null objects.
     *
     * @description
     * Returns `true` if the input is a non-null object. By default, arrays are excluded,
     * but you can include them by passing `true` to `includeArrays`.
     *
     * @param element - The value to test.
     * @param includeArrays - Whether to treat arrays as objects (default: `false`).
     * 
     * @returns
     * `true` if the value is an object (excluding `null`, and optionally arrays).
     */
    isObject(element: unknown, includeArrays?: boolean): element is object;

    /**
     * ## isString
     *
     * Type guard for string values.
     *
     * @description
     * Checks whether a value is a string (primitive or `String` object)
     * using `Object.prototype.toString`, for more reliable results than `typeof`.
     *
     * @param element - The value to test.
     * 
     * @returns
     * `true` if the value is a string.
     */
    isString(element: unknown): element is string;
  }
}

Object.isObject = (element: unknown, includeArrays = false): element is object => {
  return element !== null && typeof element === 'object' && (includeArrays || !Array.isArray(element));
};

Object.isString = (element: unknown): element is string => {
  return Object.prototype.toString.call(element) === '[object String]';
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT_DIRECTORY = await projectUtil.findProjectRootDirectory(__dirname);
const SSL_DIRECTORY = path.resolve(PROJECT_ROOT_DIRECTORY, 'ssl');
const PORT = process.env.PORT ?? '3000';
const PERIODIC_LOG_INTERVAL = 60_000;
const SHUTDOWN_SIGNAL_LIST = ['SIGTERM', 'SIGINT'] as const;
const SHUTDOWN_TIMEOUT = 5_000;

await fs.mkdir(SSL_DIRECTORY, { recursive: true });

/**
 * ## setupGracefulShutdown
 *
 * Registers signal handlers to gracefully shut down the server.
 *
 * @description
 * Listens for termination signals (`SIGTERM`, `SIGINT`) and initiates a graceful shutdown:
 * 
 * - Logs the received signal
 * - Stops accepting new connections
 * - Allows in-flight requests to complete
 * - Forces exit after a 5-second timeout if not completed
 *
 * @param runningServerInstance - Active HTTP or HTTPS server instance to close.
 */
const setupGracefulShutdown = (runningServerInstance: Server<typeof IncomingMessage, typeof ServerResponse>): void => {
  SHUTDOWN_SIGNAL_LIST.forEach(
    (shutdownSignal: string): void => {
      process.on(
        shutdownSignal, 
        (): void => {
          console.log(`${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } [application]: ${ shutdownSignal } received. Shutting down the server`);

          runningServerInstance.close(
            (): void => {
              console.log(`${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } [application]: Server closed`);
              process.exit(0);
            }
          );
          
          setTimeout(
            (): void => {
              console.log(`${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } [application]: Forcing server shutdown after timeout`);
              process.exit(1);
            }, 
            SHUTDOWN_TIMEOUT
          ).unref();
        }
      );
    }
  );
};

/**
 * ## setupPeriodicLogging
 *
 * Sets up interval-based logging of server status.
 *
 * @description
 * Logs the current timestamp and server port every 60 seconds to aid in monitoring.
 * Uses `.unref()` to avoid blocking the process from exiting naturally.
 *
 * @returns
 * A `NodeJS.Timeout` object representing the interval timer.
 */
const setupPeriodicLogging = (): NodeJS.Timeout => {
  return setInterval(
    (): void => {
      console.log(`${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } [application]: Server running on port ${ PORT }`);
    }, 
    PERIODIC_LOG_INTERVAL
  ).unref();
};

/**
 * ## startServer
 *
 * Starts the server and manages lifecycle events.
 *
 * @description
 * Begins listening on the configured port. Sets up:
 * 
 * - Periodic logging of server status
 * - Graceful shutdown on termination signals
 *
 * Logs server startup and exits the process on critical failure.
 * 
 * @param serverInstance - The Express app or HTTP/HTTPS server instance to start.
 *
 * @returns
 * A Promise resolving to the running HTTP/HTTPS server.
 *
 * @throws
 * If server fails to start or encounters fatal errors.
 */
const startServer = async (serverInstance: Express | https.Server): Promise<Server<typeof IncomingMessage, typeof ServerResponse>> => {
  const RunningServerInstance = serverInstance.listen(
    PORT, 
    (): void => {
      console.log(`${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } [application]: Server started`);
      setupPeriodicLogging();
    }
  );
  
  setupGracefulShutdown(RunningServerInstance);

  return RunningServerInstance;
};

/**
 * ## loadSSLCertificates
 *
 * Loads SSL certificate and private key for HTTPS configuration.
 *
 * @description
 * Reads `server.crt` and `server.key` files from the SSL directory using `Promise.all`
 * for concurrent access.
 * 
 * @returns
 * A Promise resolving to an object with `cert` and `key` strings.
 *
 * @throws
 * If file reading fails due to missing or inaccessible certificate files.
 */
const loadSSLCertificates = async (): Promise<{ cert: string, key: string }> => {
  const [cert, key] = await Promise.all(
    [
      fs.readFile(path.join(SSL_DIRECTORY, 'server.crt'), 'utf8'),
      fs.readFile(path.join(SSL_DIRECTORY, 'server.key'), 'utf8')
    ]
  );
    
  return { cert, key };
};

/**
 * ## createServer
 *
 * Creates an HTTP or HTTPS server based on configuration.
 *
 * @description
 * If `useHttps` is `true`, reads SSL certificates and creates an HTTPS server.
 * Otherwise, returns the Express app for HTTP usage. This function does not start the server.
 * 
 * @param app - The Express application instance.
 * @param useHttps - Whether to create an HTTPS server (default: false).
 *
 * @returns
 * A Promise resolving to the HTTP or HTTPS server instance.
 *
 * @throws
 * If SSL certificate loading fails.
 */
const createServer = async (
  app: Express, 
  useHttps?: boolean
): Promise<Express | https.Server<typeof IncomingMessage, typeof ServerResponse>> => {
  if (!useHttps) {
    return app;
  }
  
  const { cert, key } = await loadSSLCertificates();

  return https.createServer({ cert, key }, app);
};

export { 
  expressiumRoute,
  cryptographyUtil, 
  HttpClientUtil,
  loggerUtil,
  projectUtil,
  rateLimiterUtil,
  ApiKeyStrategy, 
  BasicStrategy, 
  BasicAndBearerStrategy, 
  BearerStrategy,
  IAuthenticationStrategy,
  startServer,
  createServer
};
