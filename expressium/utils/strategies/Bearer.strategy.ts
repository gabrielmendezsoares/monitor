import { IAuthenticationStrategy } from './interfaces/index.js';

/**
 * ## BearerStrategy
 * 
 * Stateless authentication strategy that appends a bearer token to request headers.
 * 
 * @description
 * Implements token-based authentication using the Bearer scheme. This strategy simply attaches
 * a static token to the `Authorization` header of every request and assumes no token expiration or refresh logic.
 * 
 * Suitable for APIs that:
 * 
 * - Use OAuth 2.0 or JWT bearer tokens
 * - Require simple header-based token injection
 * - Do not enforce session-based or renewable tokens
 * 
 * @method authenticate - Adds the bearer token to the `Authorization` header of the request.
 */
export class BearerStrategy implements IAuthenticationStrategy.IAuthenticationStrategy {
  /**
   * ## constructor
   * 
   * Creates a new BearerStrategy instance.
   * 
   * @description
   * Initializes the strategy with a static bearer token.
   * This token will be attached to all outgoing requests via the `Authorization` header.
   * 
   * @param token - The bearer token to use for authentication. It must be a valid non-empty string.
   * 
   * @throws
   * Error if the token is invalid or empty.
   */
  public constructor(
    private readonly token: string
  ) {}

  /**
   * ## authenticate
   * 
   * Attaches a bearer token to the request headers.
   * 
   * @description
   * Adds the `Authorization` header to the request configuration using the Bearer scheme.
   * The header format is: `Authorization: Bearer <token>`.
   * 
   * @param configurationMap - Axios request configuration to modify.
   * 
   * @returns
   * Modified Axios request configuration including the bearer token.
   */
  public authenticate(configurationMap: Axios.AxiosXHRConfig<any>): Axios.AxiosXHRConfig<any> {
    return {
      ...configurationMap,
      headers: {
        ...configurationMap.headers,
        Authorization: `Bearer ${ this.token }`
      }
    };
  }
}
