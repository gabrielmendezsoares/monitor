import { NextFunction, Request, Response } from 'express';
import JWT from 'jsonwebtoken';
import momentTimezone from 'moment-timezone';
import { IResponse, IResponseData } from '../interfaces/index.js';
import { IDecodedToken } from './interfaces/index.js';

/**
 * ## getAuthorization
 * 
 * Authorizes requests using JWT token verification and role-based access control.
 * 
 * @description This middleware function validates JWT tokens provided in the Authorization
 * header for API requests after initial authentication. It verifies
 * the token signature, expiration, and attaches the decoded user information
 * to the request object for downstream middleware and route handlers.
 * 
 * The function handles:
 * 
 * - JWT token presence verification in the Authorization header
 * - Environment variable validation (JWT_SECRET)
 * - Token signature verification using the secret from environment variables
 * - Token expiration checking against the embedded timestamp
 * - Role-based access control through optional roleList parameter
 * - Detailed error handling for various JWT error types
 * - Standardized error response format with timestamps and suggestions
 * 
 * ### Authorization Flow:
 * 
 * 1. Check for JWT_SECRET in environment variables
 * 2. Verify Authorization header presence
 * 3. Decode and verify JWT token
 * 4. Validate user roles if roleList is provided
 * 5. Check token expiration
 * 6. Attach user data to request object
 * 7. Call next() to continue the middleware chain
 * 
 * ### Error Scenarios:
 * 
 * - Missing JWT_SECRET: 500 Internal Server Error
 * - Missing Authorization header: 401 Unauthorized
 * - Invalid token signature: 401 Unauthorized
 * - Token not yet active: 401 Unauthorized
 * - Expired token: 401 Unauthorized 
 * - Insufficient role permissions: 401 Unauthorized
 * - Unexpected errors: 500 Internal Server Error
 * 
 * Each error response includes detailed information about the error cause,
 * a user-friendly message, and suggestions for resolution.
 * 
 * @param req - Express Request object containing auth header and body.
 * @param res - Express Response object for sending responses.
 * @param next - Express NextFunction for continuing the middleware chain.
 * @param roleList - Optional array of user roles to check against the token's roleList. 
 * 
 * @returns Promise resolving to void (continues middleware chain) or IResponse object (for error cases).
 */
export const getAuthorization = async (
  req: Request,
  res: Response,
  next: NextFunction,
  roleList?: string[]
): Promise<IResponse.IResponse<IResponseData.IResponseData> | void> => {
  if (!process.env.JWT_SECRET) {
    res
      .status(500)
      .json(
        {
          timestamp: momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss'),
          status: false,
          statusCode: 500,
          method: req.method,
          path: req.originalUrl || req.url,
          query: req.query,
          headers: req.headers,
          body: req.body,
          message: 'API configuration not found.',
          suggestion: 'The requested API type is not properly configured in the system.' 
        }
      );
    
    return;
  }

  const reqHeadersAuthorization = req.headers.authorization;

  if (!reqHeadersAuthorization) {
    res
      .status(401)
      .json(
        {
          timestamp: momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss'),
          status: false,
          statusCode: 401,
          method: req.method,
          path: req.originalUrl || req.url,
          query: req.query,
          headers: req.headers,
          body: req.body,
          message: 'Authentication token is missing.',
          suggestion: 'Include a token in the Authorization header.'
        }
      );

    return;
  }

  try {
    try {
      const decodedToken = JWT.verify(
        reqHeadersAuthorization.startsWith('Bearer ') 
          ? reqHeadersAuthorization.split(' ')[1] 
          : reqHeadersAuthorization, 
        process.env.JWT_SECRET
      ) as IDecodedToken.IDecodedToken;

      roleList?.forEach(
        (role: string): void => {
          if (!decodedToken.roleList.includes(role)) {
            res
              .status(401)
              .json(
                {
                  timestamp: momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss'),
                  status: false,
                  statusCode: 401,
                  method: req.method,
                  path: req.originalUrl || req.url,
                  query: req.query,
                  headers: req.headers,
                  body: req.body,
                  message: 'Insufficient permissions.',
                  suggestion: 'Contact your administrator for access to this resource.'
                }
              );
            
            return;
          }
        }
      );

      if ('expiresIn' in decodedToken && Date.now() > decodedToken.expiresIn) {
        res
          .status(401)
          .json(
            {
              timestamp: momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss'),
              status: false,
              statusCode: 401,
              method: req.method,
              path: req.originalUrl || req.url,
              query: req.query,
              headers: req.headers,
              body: req.body,
              message: 'Your session has expired.',
              suggestion: 'Please log in again to obtain a new token.' 
            }
          );

        return;
      }

      (req as any).user = decodedToken;

      next();

      return;
    } catch(error: unknown) {
      if (error instanceof JWT.JsonWebTokenError) {
        console.log(`Error | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Path: expressium/src/middlewares/app.middleware.ts | Location: getAuthorization | Error: ${ error instanceof Error ? error.message : String(error) }`);

        res
          .status(401)
          .json(
            {
              timestamp: momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss'),
              status: false,
              statusCode: 401,
              method: req.method,
              path: req.originalUrl || req.url,
              query: req.query,
              headers: req.headers,
              body: req.body,
              message: 'Invalid authentication token.',
              suggestion: 'Please ensure you are using a valid, unmodified token.' 
            }
          );

        return;
      } else if (error instanceof JWT.NotBeforeError) {
        console.log(`Error | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Path: expressium/src/middlewares/app.middleware.ts | Location: getAuthorization | Error: ${ error instanceof Error ? error.message : String(error) }`);

        res
          .status(401)
          .json(
            {
              timestamp: momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss'),
              status: false,
              statusCode: 401,
              method: req.method,
              path: req.originalUrl || req.url,
              query: req.query,
              headers: req.headers,
              body: req.body,
              message: 'Token not yet active.',
              suggestion: 'This token cannot be used until its activation time.' 
            }
          );

        return;
      } else if (error instanceof JWT.TokenExpiredError) {
        console.log(`Error | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Path: expressium/src/middlewares/app.middleware.ts | Location: getAuthorization | Error: ${ error instanceof Error ? error.message : String(error) }`);

        res
          .status(401)
          .json(
            {
              timestamp: momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss'),
              status: false,
              statusCode: 401,
              method: req.method,
              path: req.originalUrl || req.url,
              query: req.query,
              headers: req.headers,
              body: req.body,
              message: 'Your authentication token has expired.',
              suggestion: 'Please log in again to continue using the API.' 
            }
          );

        return;
      }
      
      throw error;
    }
  } catch (error: unknown) {
    console.log(`Error | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Path: expressium/src/middlewares/app.middleware.ts | Location: getAuthorization | Error: ${ error instanceof Error ? error.message : String(error) }`);

    res
      .status(500)
      .json(
        {
          timestamp: momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss'),
          status: false,
          statusCode: 500,
          method: req.method,
          path: req.originalUrl || req.url,
          query: req.query,
          headers: req.headers,
          body: req.body,
          message: 'Authorization process encountered a technical issue.',
          suggestion: 'Our team has been notified. Please try again in a few minutes.' 
        }
      );

    return;
  }
};
