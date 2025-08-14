import { NextFunction, Request, Response } from 'express';
import JWT from 'jsonwebtoken';
import { loggerUtil } from '../utils/index.js';
import { IResponse, IResponseData } from '../interfaces/index.js';
import { IDecodedTokenMap } from './interfaces/index.js';

/**
 * ## getAuthorization
 * 
 * Middleware to verify a JWT token and enforce optional role-based access.
 *
 * @description
 * Validates the JWT from the `Authorization` header using the Bearer scheme,
 * checks token validity, expiration, and not-before constraints, and verifies
 * that the user has any required roles. On success, attaches decoded token data
 * to `req.decodedTokenMap`.
 *
 * It handles:
 * 
 * - Checking environment configuration (`JWT_SECRET`)
 * - Validating presence and format of the Authorization header
 * - Verifying JWT signature and decoding token payload
 * - Validating token expiration and activation times
 * - Enforcing required user roles if provided
 * - Returning structured error responses with HTTP status codes
 *
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next middleware function.
 * @param roleList - Optional array of roles required for access.
 *
 * @returns 
 * Returns `void` or sends an error response. Proceeds to next middleware on success.
 */
export const getAuthorization = async (
  req: Request,
  res: Response,
  next: NextFunction,
  roleList?: string[]
): Promise<IResponse.IResponse<IResponseData.IResponseData> | void> => {
  if (!process.env.JWT_SECRET) {
    return { 
      status: 500, 
      data: {
        message: 'The authorization process is temporarily unavailable.',
        suggestion: 'Please try again later or contact support if the issue persists.'
      }
    };
  }

  const reqHeadersAuthorization = req.headers.authorization;

  if (!reqHeadersAuthorization) {
    res
      .status(400)
      .json(
        {
          message: 'Missing Authorization header.',
          suggestion: 'Include an Authorization header using the Bearer scheme: "Bearer <token>"'
        }
      );

    return;
  }

  if (!reqHeadersAuthorization.startsWith('Bearer ')) {
    res
    .status(400)
    .json(
      {
        message: 'Invalid Authorization scheme.',
        suggestion: 'Use the Bearer authentication scheme: "Bearer <token>"'
      }
    );

    return;
  }

  try {
    try {
      const token = reqHeadersAuthorization.split(' ')[1];
      const decodedTokenMap = JWT.verify(token, process.env.JWT_SECRET) as IDecodedTokenMap.IDecodedTokenMap;

      roleList?.forEach(
        (role: string): void => {
          if (!decodedTokenMap.roleList.includes(role)) {
            res
              .status(403)
              .json(
                {
                  message: 'Missing required role.',
                  suggestion: 'If you believe this is an error, contact your administrator to request appropriate access.'
                }
              );
            
            return;
          }
        }
      );

      if (decodedTokenMap.expiresIn && Date.now() > decodedTokenMap.expiresIn) {
        res
          .status(401)
          .json(
            {
              message: 'Authentication token has expired.',
              suggestion: 'Please sign in again to obtain a new token.'
            }
          );

        return;
      }

      (req as any).decodedTokenMap = decodedTokenMap;

      next();

      return;
    } catch(error: unknown) {
      if (error instanceof JWT.JsonWebTokenError) {
        res
          .status(401)
          .json(
            {
              message: 'Invalid authentication token.',
              suggestion: 'Ensure your token is valid and has not been tampered with.' 
            }
          );

        return;
      } else if (error instanceof JWT.NotBeforeError) {
        res
          .status(401)
          .json(
            {
              message: 'Authentication token is not yet active.',
              suggestion: 'Wait until the token’s start time before using it.'
            }
          );

        return;
      } else if (error instanceof JWT.TokenExpiredError) {
        res
          .status(401)
          .json(
            {
              message: 'Authentication token has expired.',
              suggestion: 'Please sign in again to obtain a new token.'
            }
          );

        return;
      }
      
      throw error;
    }
  } catch (error: unknown) {
    loggerUtil.error(error instanceof Error ? error.message : String(error));

    res
      .status(500)
      .json(
        { 
          message: 'The authorization process encountered a technical issue.',
          suggestion: 'Please try again later or contact support if the issue persists.'
        }
      );
  }
};
