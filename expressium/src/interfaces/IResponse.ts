/**
 * ## IResponse
 * 
 * Generic wrapper interface for all service responses.
 * 
 * @description Provides a consistent response structure with an HTTP status code
 * and strongly-typed data payload. Services return this wrapper to maintain
 * separation between HTTP transport concerns and business data.
 * 
 * Contains:
 * 
 * - `status`: HTTP status code (e.g., 200, 400, 500)
 * - `data`: Typed payload containing the actual response data
 * 
 * @template T - The type of data payload contained in the response.
 */
export interface IResponse<T> {
  status: number;
  data: T;
}
