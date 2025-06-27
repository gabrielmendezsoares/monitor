import cors from 'cors';
import 'dotenv/config';
import { Express, Request, Response } from 'express';
import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit';
import fs from 'fs/promises';
import https, { Server } from 'https';
import { createRequire } from 'module';
import momentTimezone from 'moment-timezone';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);

const helmet = require('helmet');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOGS_DIRECTORY = path.join(__dirname, '../logs');
const SSL_DIRECTORY = path.resolve(__dirname, '../ssl');

/**
 * ## getAccessLog
 * 
 * Creates an access log file in a dedicated logs directory.
 *
 * @description Ensures the logs directory exists and opens a file handle for logging HTTP requests.
 * Creates the directory structure if it doesn't exist using recursive creation.
 * The log file is opened in append mode ('a'), ensuring new logs are added without overwriting existing content.
 * 
 * @async
 * 
 * @returns File handle for the access log file.
 * 
 * @throws Will throw if directory creation or file opening fails due to filesystem errors.
 */
export const getAccessLog = async (): Promise<fs.FileHandle> => {
  await fs.mkdir(LOGS_DIRECTORY, { recursive: true });

  return await fs.open(path.join(LOGS_DIRECTORY, 'access.log'), 'a');
};

/**
 * ## getRateLimiter
 * 
 * Creates a rate limiter middleware for the Express application.
 *
 * @description Configures rate limiting middleware to prevent excessive requests from a single IP.
 * The limiter enforces constraints based on environment variables:
 * 
 * - RATE_LIMIT_MAX_REQUESTS: Defines requests allowed per IP
 * - RATE_LIMIT_WINDOW_MS: Defines time window in milliseconds
 * 
 * When rate limit is exceeded, returns a 429 status with JSON response containing:
 * 
 * - Current timestamp
 * - Request details (method, path, query, headers, body)
 * - Informative message and suggestion
 * 
 * @returns Configured Express rate limit middleware.
 */
export const getRateLimiter = (): RateLimitRequestHandler => {
  return rateLimit(
    {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS as string, 10),
      limit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS as string, 10),
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (
        req: Request,
        res: Response
      ): void => {
        res
          .status(429)
          .json(
            {
              timestamp: momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss'),
              status: false,
              statusCode: 429,
              method: req.method,
              path: req.originalUrl || req.url,
              query: req.query,
              headers: req.headers,
              body: req.body,
              message: 'Too many requests from this IP.',
              suggestion: 'Please wait before trying again.'
            }
          );
      }
    }
  );
};

/**
 * ## configureApp
 * 
 * Configures an Express application with security middleware.
 *
 * @description Initializes Express with:
 * 
 * - Security: Helmet security headers
 * - Processing: CORS support
 * 
 * @async
 * 
 * @param app - The Express application instance to configure..
 * 
 * @returns Configured Express application.
 * 
 * @throws Will throw if access log creation fails.
 */
const configureApp = async (app: Express): Promise<Express> => {
  app.use(cors());
  app.use(helmet());

  return app;
};

/**
 * ## loadSSLCertificates
 * 
 * Loads SSL certificates from filesystem for HTTPS server.
 *
 * @description Reads SSL certificate and private key files from the SSL directory:
 * 
 * - cert.pem: SSL certificate file
 * - key.pem: Private key file
 * 
 * Files must be in PEM format (Base64 encoded DER certificate).
 * Uses Promise.all for concurrent file reading.
 * 
 * @async
 * 
 * @returns Object with certificate and key strings.
 * 
 * @throws Will throw if directory access fails or certificate files are missing/invalid.
 */
const loadSSLCertificates = async (): Promise<{ cert: string, key: string }> => {
  const [cert, key] = await Promise.all(
    [
      fs.readFile(path.join(SSL_DIRECTORY, 'cert.pem'), 'utf8'),
      fs.readFile(path.join(SSL_DIRECTORY, 'key.pem'), 'utf8')
    ]
  );
    
  return { cert, key };
};

/**
 * ## createServer
 * 
 * Creates a server with the configured Express application, using HTTPS when specified.
 *
 * @description This function performs a server setup process:
 * 
 * 1. Configures the Express application with security middleware
 * 2. If HTTPS is enabled via useHttps parameter:
 * 
 *    - Loads SSL certificates concurrently while configuring the app
 *    - Creates and returns an HTTPS server with the configured application and certificates
 * 
 * 3. If HTTPS is disabled, returns the configured Express application directly.
 * 
 * The resulting server (or Express app) is ready to listen on a port but is not yet started.
 * 
 * @async
 * 
 * @param app - Express application instance.
 * @param useHttps - Optional boolean to specify if HTTPS should be used (default is false).
 * 
 * @returns Express app (HTTP) or HTTPS server.
 * 
 * @throws Will throw if app configuration or SSL certificate loading fails.
 */
export const createServer = async (app: Express, useHttps?: boolean): Promise<Express | Server> => {
  if (!useHttps) {
    return configureApp(app);
  }
  
  const [configuredApp, { cert, key }] = await Promise.all(
    [
      configureApp(app),
      loadSSLCertificates()
    ]
  );

  return https.createServer({ cert, key }, configuredApp);
};
