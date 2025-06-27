import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import JWT, { Secret } from 'jsonwebtoken';
import { StringValue } from 'ms';
import { PrismaClient } from '@prisma/client/storage/client.js';
import { IResponse, IResponseData } from '../interfaces/index.js';

const prisma = new PrismaClient();

/**
 * ## getAuthentication
 * 
 * Authenticates a user using Basic Authentication credentials and generates a JWT token.
 * 
 * @description This function performs the initial authentication process using Basic Authentication
 * credentials provided in the request header. It validates the credentials against
 * stored user data and generates a JWT token for subsequent authorized requests.
 * 
 * The function handles:
 * 
 * - Environment variables validation (JWT_SECRET, JWT_EXPIRES_IN)
 * - Basic Auth header presence and format validation
 * - Username and password extraction and decoding
 * - User existence and active status verification in the database
 * - Password verification using bcrypt's secure comparison
 * - JWT token generation with dynamic expiration time calculation
 * - Standardized response formatting with detailed status messages
 * 
 * ### Authentication Flow:
 * 
 * 1. Validate environment variables (JWT_SECRET, JWT_EXPIRES_IN)
 * 2. Check presence and format of Authorization header
 * 3. Extract and decode Basic Auth credentials
 * 4. Retrieve user data from database based on username and application type
 * 5. Verify user exists and is active
 * 6. Compare provided password with stored hash using bcrypt
 * 7. Calculate token expiration time based on JWT_EXPIRES_IN format
 * 8. Generate JWT token with user data and expiration
 * 9. Return success response with token or appropriate error response
 * 
 * ### Error Scenarios:
 * 
 * - Missing JWT_SECRET or JWT_EXPIRES_IN: 500 Internal Server Error
 * - Missing Authorization header: 400 Bad Request
 * - Invalid Basic Auth format: 400 Bad Request
 * - User not found: 401 Unauthorized
 * - Inactive user account: 403 Forbidden
 * - Password mismatch: 401 Unauthorized
 * - Database or other technical errors: 500 Internal Server Error
 * 
 * ### Token Expiration Format:
 * 
 * The function supports various time units for JWT_EXPIRES_IN:
 * 
 * - 's': seconds (e.g., '60s')
 * - 'm': minutes (e.g., '30m')
 * - 'h': hours (e.g., '24h')
 * - 'd': days (e.g., '7d')
 * - Default: 1 hour if format is unrecognized
 * 
 * ### Response Structure:
 * 
 * Success response (200) includes:
 * 
 * - timestamp, status (true), statusCode, method, path, query, body
 * - data object containing:
 * 
 *   - username
 *   - roleList
 *   - JWT token
 *   - expiresIn timestamp
 * 
 * Error responses include:
 * 
 * - timestamp, status (false), statusCode, method, path, query, body
 * - message: Description of the error
 * - suggestion: Recommended action to resolve the issue
 * 
 * @param req - Express Request object containing auth headers and body
 * @param _res - Express Response object (unused but required for middleware signature)
 * @param _next - Express NextFunction (unused but required for middleware signature)
 * @param timestamp - Current timestamp string for logging and response generation
 * 
 * @returns Promise resolving to IResponse containing either:
 * 
 * - Success (200): JWT token and user data
 * - Error (400/401/403/500): Appropriate error message and suggestion
 */
export const getAuthentication = async (
  req: Request,
  _res: Response,
  _next: NextFunction,
  timestamp: string
): Promise<IResponse.IResponse<IResponseData.IGetAuthenticationResponseData | IResponseData.IResponseData>> => {
  if (!process.env.JWT_SECRET) {
    return { 
      status: 500, 
      data: {
        timestamp,
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
    };
  }

  if (!process.env.JWT_EXPIRES_IN) {
    return { 
      status: 500, 
      data: {
        timestamp,
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
    };
  }

  const reqHeadersAuthorization = req.headers.authorization;
  
  if (!reqHeadersAuthorization) {
    return { 
      status: 400, 
      data: { 
        timestamp,
        status: false,
        statusCode: 400,
        method: req.method,
        path: req.originalUrl || req.url,
        query: req.query,
        headers: req.headers,
        body: req.body,
        message: 'Authorization header required for secure access.',
        suggestion: 'Add the Authorization header with format: "Basic base64(username:password)".' 
      }
    };
  }
  
  if (!reqHeadersAuthorization.startsWith('Basic ')) {
    return { 
      status: 400, 
      data: { 
        timestamp,
        status: false,
        statusCode: 400,
        method: req.method,
        path: req.originalUrl || req.url,
        query: req.query,
        headers: req.headers,
        body: req.body,
        message: 'Authorization must use Basic authentication scheme.',
        suggestion: 'Format should be: "Basic" followed by base64 encoded "username:password".' 
      }
    };
  }

  try {
    const [
      username, 
      password
    ] = Buffer
      .from(reqHeadersAuthorization.split(' ')[1], 'base64')
      .toString('ascii')
      .split(':');

    const user = await prisma.users.findUnique(
      {
        where: {
          application_type_username: {
            application_type: process.env.APPLICATION_TYPE as string,
            username
          }
        }
      }
    );

    if (!user) {
      return {
        status: 401,
        data: {
          timestamp,
          status: false,
          statusCode: 401,
          method: req.method,
          path: req.originalUrl || req.url,
          query: req.query,
          headers: req.headers,
          body: req.body,
          message: 'User not found in our system.',
          suggestion: 'Verify your username or register a new account if needed.' 
        }
      };
    }

    if (!user.is_user_active) {
      return { 
        status: 403, 
        data: {
          timestamp,
          status: false,
          statusCode: 403,
          method: req.method,
          path: req.originalUrl || req.url,
          query: req.query,
          headers: req.headers,
          body: req.body,
          message: 'This account has been deactivated.',
          suggestion: 'Contact your administrator to reactivate this account.' 
        }
      };
    }

    if (!bcrypt.compareSync(password, new TextDecoder().decode(user.password))) {
      return { 
        status: 401, 
        data: {
          timestamp,
          status: false,
          statusCode: 401,
          method: req.method,
          path: req.originalUrl || req.url,
          query: req.query,
          headers: req.headers,
          body: req.body,
          message: 'Password verification failed.',
          suggestion: 'Check your password and try again. Reset your password if needed.' 
        }
      };
    }

    let expiresIn: number;
    
    const jwtExpiresInInt = parseInt(process.env.JWT_EXPIRES_IN.slice(0, -1), 10);
    
    switch (process.env.JWT_EXPIRES_IN.slice(-1)) {
      case 's': expiresIn = Date.now() + (jwtExpiresInInt * 1_000); break;
      case 'm': expiresIn = Date.now() + (jwtExpiresInInt * 60 * 1_000); break;
      case 'h': expiresIn = Date.now() + (jwtExpiresInInt * 60 * 60 * 1_000); break;
      case 'd': expiresIn = Date.now() + (jwtExpiresInInt * 24 * 60 * 60 * 1_000); break;
      default: expiresIn = Date.now() + (3_600 * 1_000);
    }
   
    return {
      status: 200,
      data: {
        timestamp,
        status: true,
        statusCode: 200,
        method: req.method,
        path: req.originalUrl || req.url,
        query: req.query,
        headers: req.headers,
        body: req.body,
        data: {
          username,
          roleList: user.role_list,
          token: JWT.sign(
            {
              username,
              roleList: user.role_list,
              expiresIn
            },
            process.env.JWT_SECRET as Secret,
            { expiresIn: process.env.JWT_EXPIRES_IN as StringValue }
          ),
          expiresIn
        }
      }
    };
  } catch (error: unknown) {
    console.log(`Error | Timestamp: ${ timestamp } | Path: expressium/src/services/app.service.ts | Location: getAuthentication | Error: ${ error instanceof Error ? error.message : String(error) }`);

    return {
      status: 500,
      data: {
        timestamp,
        status: false,
        statusCode: 500,
        method: req.method,
        path: req.originalUrl || req.url,
        query: req.query,
        headers: req.headers,
        body: req.body,
        message: 'Authentication process encountered a technical issue.',
        suggestion: 'Our team has been notified. Please try again in a few minutes.' 
      }
    };
  };
};
