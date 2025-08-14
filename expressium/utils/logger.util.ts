import fs from 'fs/promises';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { findProjectRootDirectory } from './project.util.js';

const require = createRequire(import.meta.url);

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT_DIRECTORY = await findProjectRootDirectory(__dirname);
const LOGS_DIRECTORY = path.join(PROJECT_ROOT_DIRECTORY, 'logs');

await fs.mkdir(LOGS_DIRECTORY, { recursive: true });

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * ## createRotateTransport
 *
 * Initializes a rotating log file transport for structured log persistence.
 *
 * @description
 * Creates a `winston-daily-rotate-file` transport for writing log messages
 * to disk with automatic daily rotation. Log files are split by level and timestamp,
 * symlinked to current logs for easy access, and rotated based on size or date.
 *
 * @param filename - Log filename pattern (e.g., `error-%DATE%.log`).
 * @param level - Logging level to associate with the transport.
 * @param maxSize - Maximum size before rotating a log file (default: `'10m'`).
 * @param maxFiles - Maximum retention period for old logs (default: `'7d'`).
 *
 * @returns
 * A configured Winston DailyRotateFile transport.
 */
const createRotateTransport = (
  filename: string, 
  level: string, 
  maxSize: string = '10m',
  maxFiles: string = '7d' 
): any => {
  return new DailyRotateFile(
    {
      filename: path.join(LOGS_DIRECTORY, filename),
      datePattern: 'YYYY-MM-DD',
      maxSize,
      maxFiles,
      format: fileFormat,
      level,
      auditFile: path.join(LOGS_DIRECTORY, `.${ level }-audit.json`),
      createSymlink: true,
      symlinkName: `${ level }-current.log`
    }
  );
};

const errorLogsTransport = createRotateTransport('error-%DATE%.log', 'error', process.env.ERROR_LOG_MAX_SIZE, process.env.ERROR_LOG_MAX_FILES);
const warnLogsTransport = createRotateTransport('warn-%DATE%.log', 'warn', process.env.WARN_LOG_MAX_SIZE, process.env.WARN_LOG_MAX_FILES);
const infoLogsTransport = createRotateTransport('info-%DATE%.log', 'info', process.env.INFO_LOG_MAX_SIZE, process.env.INFO_LOG_MAX_FILES);
const debugLogsTransport = createRotateTransport('debug-%DATE%.log', 'debug', process.env.DEBUG_LOG_MAX_SIZE, process.env.DEBUG_LOG_MAX_FILES);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    ({ timestamp, level, message, ...meta }: any): string => {
      let log = `${ timestamp } [${ level }]: ${ message }`;
      
      if (Object.keys(meta).length > 0) {
        log += ` ${ JSON.stringify(meta) }`;
      }
      
      return log;
    }
  )
);

/**
 * ## logger
 *
 * Winston logger instance with file rotation, level-based filtering, and error handling.
 *
 * @description
 * Configures the main Winston logger with:
 * 
 * - Daily rotating log files for `error`, `warn`, `info`, and `debug`
 * - Console logging with timestamp and colorization
 * - Centralized exception and rejection handlers
 *
 * Supports structured JSON logs for persistent storage, and colorized readable logs for console output.
 */
export const logger = winston.createLogger(
  {
    level: process.env.LOG_LEVEL || 'info',
    format: fileFormat,
    transports: [
      new winston.transports.Console(
        {
          format: consoleFormat,
          level: process.env.LOG_LEVEL || 'info'
        }
      ),
      errorLogsTransport,
      warnLogsTransport,
      infoLogsTransport,
      debugLogsTransport
    ],
    exceptionHandlers: [
      new winston.transports.Console({ format: consoleFormat }),
      new DailyRotateFile(
        {
          filename: path.join(LOGS_DIRECTORY, 'exception-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: process.env.EXCEPTION_LOG_MAX_SIZE ?? '10m',
          maxFiles: process.env.EXCEPTION_LOG_MAX_FILES ?? '7d',
          format: fileFormat,
          auditFile: path.join(LOGS_DIRECTORY, '.exception-audit.json')
        }
      )
    ],
    rejectionHandlers: [
      new winston.transports.Console({ format: consoleFormat }),
      new DailyRotateFile(
        {
          filename: path.join(LOGS_DIRECTORY, 'rejection-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: process.env.REJECTION_LOG_MAX_SIZE ?? '10m',
          maxFiles: process.env.REJECTION_LOG_MAX_FILES ?? '7d',
          format: fileFormat,
          auditFile: path.join(LOGS_DIRECTORY, '.rejection-audit.json')
        }
      )
    ],
    exitOnError: false
  }
);

/**
 * ## error
 *
 * Logs an error-level message with optional metadata.
 *
 * @description
 * Used for critical failures and exceptions in the application. These logs are captured
 * in both the console and rotating error log files. Useful for debugging runtime crashes
 * or unexpected states.
 *
 * @param message - The error message to log.
 * @param meta - Optional object containing additional context or stack trace data.
 *
 * @returns
 * The Winston logger instance for chaining or inspection.
 */
export const error = (message: string, meta: any = {}): any => logger.error(message, meta);

/**
 * ## warn
 *
 * Logs a warning that may indicate potential issues or soft failures.
 *
 * @description
 * Used for events that are noteworthy but not necessarily breaking functionality.
 * These are stored separately in `warn-%DATE%.log` and shown in the console.
 *
 * @param message - Warning message describing the potential issue.
 * @param meta - Optional metadata or diagnostic info.
 *
 * @returns
 * The Winston logger instance for chaining.
 */
export const warn = (message: string, meta: any = {}): any => logger.warn(message, meta);

/**
 * ## info
 *
 * Records general application lifecycle events and operations.
 *
 * @description
 * Ideal for logging normal events like service startups, route hits, or configuration loads.
 * Captured in both `info-%DATE%.log` and console with timestamp formatting.
 *
 * @param message - The informational message to log.
 * @param meta - Optional data providing context.
 *
 * @returns
 * The Winston logger instance.
 */
export const info = (message: string, meta: any = {}): any => logger.info(message, meta);

/**
 * ## debug
 *
 * Logs detailed debugging information for development and diagnostics.
 *
 * @description
 * Intended for inspecting function inputs, internal states, and system behavior during development.
 * This level is typically turned off in production environments.
 *
 * @param message - The debug message to log.
 * @param meta - Optional object containing trace data or internal state snapshots.
 *
 * @returns
 * The Winston logger instance.
 */
export const debug = (message: string, meta: any = {}): any => logger.debug(message, meta);
