import { NextFunction, Request, RequestHandler, Response } from 'express';
import momentTimezone from 'moment-timezone';
import { v4 } from 'uuid';

/**
 * ## generateController
 * 
 * Generates a controller function that wraps service functions with standardized request handling.
 * 
 * @description This function creates a standardized Express request handler that wraps service functions
 * with consistent error handling, logging, and response formatting. It implements the
 * Controller layer in the application's architecture, mediating between HTTP requests and
 * the business logic contained in service functions.
 * 
 * ### Key features of the generated controller:
 * 
 * - Performance monitoring: Logs execution time of each request using console.time/timeEnd
 * - Error handling: Catches and processes all errors with appropriate status codes
 * - Audit logging: Records timestamps and service execution details
 * - Clean separation: Maintains separation between HTTP concerns and business logic
 * 
 * ### Controller execution flow:
 * 
 * 1. Generate timestamp for request tracking and performance measurement
 * 2. Start performance timer for the request
 * 3. Execute the service function with request parameters and timestamp
 * 4. Send the service response directly to the client
 * 5. Handle any exceptions that occur during service execution
 * 6. Log performance metrics when execution completes
 * 
 * ### The controller handles two main scenarios:
 * 
 * 1. Successful execution: Returns service data with the specified status code
 * 2. Unhandled errors: Catches exceptions and returns a 500 error with standardized format
 * 
 * ### Response format:
 * 
 * - Success responses: Returns the service data object directly at the specified status code
 * - Error responses: `{ timestamp, status: false, statusCode: 500, method, path, query, headers, body, message, suggestion, ... }`
 * 
 * ### Logging behavior:
 * 
 * - Performance: Logs execution time for each controller invocation
 * - Errors: Logs detailed error information including service name, timestamp, and error message
 * 
 * @param serviceHandler - The service function to be wrapped by this controller.
 * Must be an async function that accepts (req, res, next, timestamp) parameters
 * and returns an object with `status` (HTTP status code) and `data` (response payload) properties.
 *
 * @returns An Express RequestHandler function that processes requests
 * through the service and handles the HTTP response lifecycle.
 * This handler implements the standard Express middleware signature (req, res, next).
 * 
 * @throws The controller itself doesn't throw errors, but instead catches them
 * and transforms them into appropriate HTTP responses with status code 500.
 * All errors from the service function will be caught, logged, and handled uniformly.
 */
export const generateController = (serviceHandler: Function): RequestHandler => {
  return async (
    req: Request, 
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const timestamp = momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss');
    const timer = `Application | Timestamp: ${ timestamp } | UUID: ${ v4() }`;
    
    console.time(timer);
    
    try {
      const { status, data } = await serviceHandler(req, res, next, timestamp);
      
      res.status(status).json(data);
    } catch (error: unknown) {
      console.log(`Error | Timestamp: ${ timestamp } | Path: expressium/src/controllers/app.controller.ts | Location: generateController | Error: ${ error instanceof Error ? error.message : String(error) }`);
      
      res
        .status(500)
        .json(
          { 
            timestamp,
            status: false,
            statusCode: 500,
            method: req.method,
            path: req.originalUrl || req.url,
            query: req.query,
            headers: req.headers,
            body: req.body,
            message: 'Something went wrong.',
            suggestion: 'Please try again later. If this issue persists, contact our support team for assistance.'
          }
        );
    } finally {
      console.timeEnd(timer);
    }
  };
};
