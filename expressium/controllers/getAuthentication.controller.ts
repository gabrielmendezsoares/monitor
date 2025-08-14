import { Request, Response } from 'express';
import { getAuthenticationService } from '../services/index.js';
import { loggerUtil } from '../utils/index.js';

/**
 * ## getAuthentication
 * 
 * Controller for handling authentication requests.
 *
 * @description
 * Delegates the authentication logic to the service layer, processes the response,
 * and returns a JSON response with the appropriate HTTP status code.
 *
 * In case of an unhandled error, logs the error and returns a 500 Internal Server Error
 * with a generic error message and suggestion.
 *
 * @param req - Express request object.
 * @param res - Express response object.
 *
 * @returns
 * Sends a JSON response with status code and authentication result.
 */
export const getAuthentication = async (
  req: Request, 
  res: Response
): Promise<void> => {
  try {
    const { status, data } = await getAuthenticationService.getAuthentication(req);
    
    res.status(status).json(data);
  } catch (error: unknown) {
    loggerUtil.error(error instanceof Error ? error.message : String(error));

    res
      .status(500)
      .json(
        { 
          message: 'The authentication process encountered a technical issue.',
          suggestion: 'Please try again later or contact support if the issue persists.'
        }
      );
  }
};
