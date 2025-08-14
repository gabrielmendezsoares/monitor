import { Request, Response } from 'express';
import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit';

/**
 * ## rateLimiter
 *
 * Returns a configured Express middleware for rate limiting.
 *
 * @description
 * This function creates and returns a rate limiter middleware using `express-rate-limit`.
 * It helps prevent abuse and excessive traffic by limiting the number of requests
 * a client (IP) can make within a defined time window.
 *
 * Configuration values are read from environment variables:
 *
 * - `RATE_LIMIT_WINDOW_MS`: Time window in milliseconds (e.g., 60000 for 1 minute)
 * - `RATE_LIMIT_MAX_REQUESTS`: Maximum number of allowed requests per IP in the time window
 *
 * If a client exceeds the allowed number of requests, a `429 Too Many Requests` response is returned.
 *
 * @returns
 * Express middleware that enforces rate limiting rules.
 */
export const rateLimiter = (): RateLimitRequestHandler => {
  return rateLimit(
    {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000'),
      limit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100'),
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (
        _req: Request,
        res: Response
      ): void => {
        res
          .status(429)
          .json(
            {
              message: 'Request rate limit exceeded.',
              suggestion: 'You’ve reached the maximum number of allowed requests. Please wait a moment and try again.'
            }
          );
      }
    }
  );
};
