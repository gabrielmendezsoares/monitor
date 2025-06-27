import { ICustomError } from "./interfaces/index.js";

/**
 * ## BaseError
 * 
 * Base error class for the application's error handling system.
 * 
 * @description BaseError serves as the foundation for all custom errors in the application.
 * It extends the native JavaScript Error class while implementing the ICustomError interface
 * to provide additional properties needed for comprehensive error handling.
 * 
 * This class captures and maintains:
 * 
 * - Descriptive error messages
 * - Application-specific error codes
 * - HTTP status codes for API responses
 * - Stack traces for debugging
 * 
 * Rather than being instantiated directly, BaseError should be extended by domain-specific
 * error classes that define their own error codes and default behaviors.
 */
export class BaseError extends Error implements ICustomError.ICustomError {   
  /**
   * ## constructor
   * 
   * Creates a new BaseError with enhanced error properties.
   * 
   * @description Initializes an error with a message, code, and status code.
   * It properly sets up the error name based on the constructor class and
   * captures the stack trace for debugging purposes.
   * 
   * The constructor calls the parent Error constructor with the message
   * and sets additional properties required by the ICustomError interface.
   * 
   * @param message - Human-readable description of the error.
   * @param code - Application-specific error code for programmatic handling.
   * @param status - HTTP status code for API responses.
   */
  public constructor(
    /**
     * @public
     */
    public message: string,

    /**
     * @public
     */
    public code: string,

    /**
     * @public
     */
    public status: number
  ) {
    super(message);

    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}
