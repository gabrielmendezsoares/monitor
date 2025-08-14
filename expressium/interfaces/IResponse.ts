/**
 * ## IResponse
 * 
 * Generic wrapper for all service-level responses.
 *
 * @description
 * Defines a standard structure for application responses that include an HTTP status code
 * and a typed payload. Used across services to maintain uniform response formatting and
 * to separate transport concerns from business logic.
 *
 * @template T - Type of the response payload.
 */
export interface IResponse<T> {
  status: number;
  data: T;
}
