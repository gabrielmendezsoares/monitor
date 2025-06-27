import axios from 'axios';
import { IAuthenticationStrategy } from './interfaces/index.js';

/**
 * ## BasicAndBearerStrategy
 * 
 * Complex authentication strategy that obtains a token using basic authentication 
 * and manages token lifecycle for subsequent API requests.
 * 
 * @description The BasicAndBearerStrategy class provides a sophisticated authentication 
 * strategy that uses basic authentication (username/password) to obtain a short-lived 
 * access token, which is then used for subsequent API request authorization.
 * 
 * Key features:
 * 
 * - Automatic token acquisition using basic authentication
 * - Transparent token refresh when expired
 * - Configurable token extraction and expiration handling
 * - Supports various HTTP methods for token retrieval
 * - Manual token invalidation capability
 * 
 * Particularly useful for APIs that:
 * 
 * - Require initial authentication via basic credentials to obtain an access token
 * - Use tokens for subsequent request authorization
 * - Have token expiration mechanisms requiring periodic token refresh
 * 
 * @method invalidateToken - Manually invalidates the current token, forcing a new token acquisition.
 * @method authenticate - Authenticates the request by adding a valid token to the configuration.
 */
export class BasicAndBearerStrategy implements IAuthenticationStrategy.IAuthenticationStrategy {
  /**
   * ## Token
   * 
   * The token obtained from the authentication endpoint.
   * 
   * @description Stores the authentication token used for subsequent API requests.
   * Obtained using Basic authentication credentials and stored until expiration.
   * A null value indicates no valid token is currently available.
   * 
   * @private
   */
  private token: string | null = null;

  /**
   * ## expiresAt
   * 
   * Timestamp (in milliseconds since epoch) indicating token expiration.
   * 
   * @description Used to determine token validity before making API requests.
   * The strategy automatically refreshes the token if it has expired or 
   * is about to expire based on the configured expiration buffer.
   * 
   * @private
   */
  private expiresAt: number = 0;

  /**
   * ## constructor
   * 
   * Creates a new BasicAndBearerStrategy instance.
   * 
   * @description Initializes the authentication strategy with parameters 
   * for obtaining and managing tokens.
   * 
   * @public
   * 
   * @constructor
   * 
   * @param method - HTTP method for authentication request ('get', 'post', 'put', 'patch', 'delete', 'head').
   * @param url - URL of the authentication endpoint to obtain the token.
   * @param username - Optional username for basic authentication to the token endpoint.
   * @param password - Optional password for basic authentication to the token endpoint.
   * @param queryParameterMap - Optional query parameters to send with the authentication request.
   * @param headerMap - Optional headers to send with the authentication request.
   * @param body - Optional request body to send with the authentication request.
   * @param tokenExtractor - Custom function to extract token from authentication response. Defaults to `response.data?.data?.token`.
   * @param expirationExtractor - Custom function to extract expiration time from authentication response. Defaults to `(response) => (response.data?.data?.expiresIn || 3_600) * 1_000`.
   * @param expirationBuffer - Time in milliseconds to renew token before actual expiration (default 60_000). Creates a safety margin.
   * 
   * @throws If invalid parameters are provided.
   */
  public constructor(
    /**
     * @private
     * @readonly
     */
    private readonly method: string,

    /**
     * @private
     * @readonly
     */
    private readonly url: string,

    /**
     * @private
     * @readonly
     */
    private readonly username?: string,
    
    /**
     * @private
     * @readonly
     */
    private readonly password?: string,
       
    /**
     * @private
     * @readonly
     */
    private readonly queryParameterMap?: Record<string, any>,

    /**
     * @private
     * @readonly
     */
    private readonly headerMap?: Record<string, any>,

    /**
     * @private
     * @readonly
     */
    private readonly body?: any,

    /**
     * @private
     * @readonly
     */
    private readonly tokenExtractor: (response: Axios.AxiosXHR<any>) => string = (response: Axios.AxiosXHR<any>): string => response.data?.data?.token,
    
    /**
     * @private
     * @readonly
     */
    private readonly expirationExtractor: (response: Axios.AxiosXHR<any>) => number = (response: Axios.AxiosXHR<any>): number => (response.data?.data?.expiresIn || 3_600) * 1_000,

    /**
     * @private
     * @readonly
     */
    private readonly expirationBuffer: number = 60_000
  ) {}

  /**
   * ## obtainToken
   * 
   * Obtains a new token from the authentication endpoint.
   * 
   * @description Sends an authentication request to the configured endpoint
   * using provided basic authentication credentials. Extracts the token and 
   * its expiration time using configured extractor functions.
   * 
   * Handles error cases and provides meaningful error messages if token
   * acquisition fails.
   * 
   * @private
   * 
   * @async
   * 
   * @returns Promise resolving to the token from the authentication endpoint.
   * 
   * @throws If authentication request fails or token cannot be extracted.
   */
  private async obtainToken(): Promise<string> {
    try {
      const response = await (axios as any)[this.method](
        this.url,
        (
          this.method === 'post'
          || this.method === 'put'
          || this.method === 'patch'
        )
          ? this.body
          : {
              auth: {
                username: this.username,
                password: this.password
              }
            },
        (
          this.method === 'post'
          || this.method === 'put'
          || this.method === 'patch'
        )
          ? {
              query: this.queryParameterMap,
              headers: this.headerMap,
              auth: {
                username: this.username,
                password: this.password
              }
            }
          : undefined
      );

      const token = this.tokenExtractor(response);
      const expiresIn = this.expirationExtractor(response);

      this.token = token;
      this.expiresAt = Date.now() + expiresIn - this.expirationBuffer;

      return token;
    } catch (error: unknown) {
      console.error('Failed to obtain token:', error instanceof Error ? error.message : String(error));
      
      throw new Error('Authentication failed: Unable to obtain token');
    }
  }

  /**
   * ## isTokenValid
   * 
   * Checks if the current token is valid and not expired.
   * 
   * @description Determines token validity by checking if:
   * 
   * - Token exists
   * - Current time is before the token's expiration
   * 
   * Includes the configured expiration buffer to ensure timely token refresh.
   * 
   * @private
   * 
   * @returns Boolean indicating token validity.
   */
  private isTokenValid(): boolean {
    return !!this.token && Date.now() < this.expiresAt;
  }

  /**
   * ## invalidateToken
   * 
   * Forces the strategy to obtain a new token on the next request.
   * 
   * @description Manually invalidates the current token by clearing it 
   * and resetting the expiration timestamp.
   * 
   * Useful in scenarios such as:
   * 
   * - Token compromise
   * - Authentication errors
   * - Server-side token invalidation
   * - User context switching
   * 
   * @public
   */
  public invalidateToken(): void {
    this.token = null;
    this.expiresAt = 0;
  }

  /**
   * ## authenticate
   * 
   * Authenticates the request by adding the token to the configuration.
   * 
   * @description Ensures a valid token is available by:
   * 
   * 1. Checking current token validity
   * 2. Obtaining a new token if needed
   * 3. Adding token to request headers
   * 4. Preserving existing headers
   * 
   * Follows OAuth 2.0 token usage specification (RFC 6750).
   * 
   * @async
   * 
   * @public
   * 
   * @param configurationMap - Axios request configuration to modify.
   * 
   * @returns Promise resolving to modified request configuration with token added.
   * 
   * @throws If token acquisition fails.
   */
  public async authenticate(configurationMap: Axios.AxiosXHRConfig<any>): Promise<Axios.AxiosXHRConfig<any>> {
    if (!this.isTokenValid()) {
      await this.obtainToken();
    }

    return {
      ...configurationMap,
      headers: {
        ...configurationMap.headers,
        Authorization: `Bearer ${ this.token }`
      }
    };
  }
}
