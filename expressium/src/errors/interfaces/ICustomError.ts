/**
 * ## ICustomError
 * 
 * Core interface for the application's standardized error objects.
 * 
 * @description Defines the required structure for all custom errors,
 * extending JavaScript's Error with application-specific metadata.
 * 
 * Properties:
 * 
 * - `message`: Human-readable error description
 * - `code`: Machine-processable error identifier/code
 * - `status`: HTTP status code to return to clients
 * - `name`: Error class/type name
 * - `stack`: Optional stack trace for debugging
 * 
 * This standardized structure enables consistent error handling,
 * logging, and client-side error responses.
 */
export interface ICustomError {
  message: string;
  code: string;
  status: number;
  name: string;
  stack?: string;
}
