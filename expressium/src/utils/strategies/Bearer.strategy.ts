import { IAuthenticationStrategy } from './interfaces/index.js';

/**
 * ## BearerStrategy
 * 
 * Simple authentication strategy that adds a token to the headers of a request.
 * 
 * @description The BearerStrategy class provides a simple authentication strategy
 * for APIs that require token-based access, such as OAuth 2.0 or JWT authentication systems.
 * 
 * Key features:
 * 
 * - Adds token to Authorization header with 'Bearer' prefix
 * - Follows OAuth 2.0 token usage specification (RFC 6750)
 * - Preserves existing headers in the request configuration
 * - Stateless implementation with no token lifecycle management
 * 
 * Particularly useful for APIs that:
 * 
 * - Use standard token-based authentication
 * - Accept tokens via the Authorization header
 * - Don't require complex token lifecycle management
 * 
 * @method authenticate - Authenticates the request by adding the token to the headers.
 */
export class BearerStrategy implements IAuthenticationStrategy.IAuthenticationStrategy {
  /**
   * ## constructor
   * 
   * Creates a new BearerStrategy instance.
   * 
   * @description Initializes the token for authentication.
   * This token will be used to generate the Authorization header.
   * 
   * @public
   * 
   * @constructor
   * 
   * @param token - The token to use for authentication. This value will be sent with each request.
   * 
   * @throws If the token is empty or invalid.
   */
  public constructor(
    /**
     * @private
     * @readonly
     */
    private readonly token: string
  ) {}

  /**
   * ## authenticate
   * 
   * Authenticates the request by adding the token to the headers.
   * 
   * @description Adds the token to the Authorization header of the request configuration.
   * 
   * This method:
   * 
   * 1. Preserves existing headers
   * 2. Adds or updates the Authorization header
   * 3. Prefixes the token with 'Bearer ' as per OAuth 2.0 specification
   * 
   * Follows OAuth 2.0 token usage specification (RFC 6750).
   * 
   * @public
   * 
   * @param configurationMap - Axios request configuration to modify.
   * 
   * @returns Modified request configuration with the token added to the Authorization header.
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
