import { ICustomError } from "./interfaces/index.js";
import { BaseError } from './Base.error.js';

/**
 * ## ApiError
 * 
 * Specialized error class for API-specific error handling and HTTP response generation.
 * 
 * @description ApiError extends BaseError to handle API-specific error scenarios, providing
 * appropriate HTTP status codes and formatted error messages suitable for API responses.
 * This class standardizes error handling for API operations and ensures consistent error
 * communication to clients.
 * 
 * The class maintains HTTP status codes, error codes, and descriptive messages that can be
 * used to generate standardized API error responses. It also preserves stack traces for
 * server-side debugging while offering a client-friendly error representation.
 * 
 * Use this class for all errors that will be communicated through API responses to ensure
 * consistent error handling across the application's external interfaces.
 */
export class ApiError extends BaseError implements ICustomError.ICustomError {
  /**
   * ## constructor
   * 
   * Creates a new ApiError instance with API-specific error properties.
   * 
   * @description Initializes an API error with message, code, and HTTP status code.
   * Provides default values appropriate for general API errors while allowing
   * customization for specific error scenarios.
   * 
   * The constructor passes all parameters to the BaseError parent class to ensure
   * proper error initialization, including stack trace capture.
   * 
   * @param message - Human-readable error description suitable for API responses.
   * @param code - Machine-readable error code for client-side error handling (defaults to 'API_ERROR').
   * @param status - HTTP status code for the response (defaults to 500 Internal Server Error).
   */
  public constructor(
    /**
     * @public
     */
    public message: string,

    /**
     * @public
     */
    public code: string = 'API_ERROR',

    /**
     * @public
     */
    public status: number = 500
  ) {
    super(
      message, 
      code,
      status
    );
  }
}
