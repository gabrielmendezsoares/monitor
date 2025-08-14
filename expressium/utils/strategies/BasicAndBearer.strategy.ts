import axios from 'axios';
import { IAuthenticationStrategy } from './interfaces/index.js';

/**
 * ## BasicAndBearerStrategy
 * 
 * Stateful strategy that uses Basic Auth to retrieve a token, then uses Bearer auth for requests.
 * 
 * @description
 * Performs initial authentication using Basic credentials to acquire a short-lived bearer token.
 * The token is cached and automatically refreshed before it expires, using configurable buffer time and extractors.
 * 
 * Suitable for APIs that:
 * 
 * - Require Basic authentication to obtain tokens
 * - Use short-lived access tokens (JWT, OAuth2)
 * - Require token renewal without re-authenticating on every request
 * 
 * Features:
 * 
 * - Auto token retrieval and refresh
 * - Manual token invalidation support
 * - Custom token/expiration extractors
 * - Supports any HTTP method for token acquisition
 * 
 * @method invalidateToken - Invalidates the currently cached token.
 * @method authenticate - Ensures a valid bearer token and adds it to the request headers.
 */
export class BasicAndBearerStrategy implements IAuthenticationStrategy.IAuthenticationStrategy {
  /**
   * ## token
   *
   * Cached bearer token retrieved via basic authentication.
   *
   * @description
   * This token is reused for outgoing requests until it expires
   * or is manually invalidated. A null value indicates no valid token.
   */
  private token: string | null = null;

  /**
   * ## expiresAt
   *
   * The epoch timestamp (in milliseconds) when the token will expire.
   *
   * @description
   * This is calculated by adding the token's lifetime to the current time,
   * minus the configured expiration buffer. It is checked before each request
   * to determine if a new token is needed.
   */
  private expiresAt: number = 0;

  /**
   * ## constructor
   * 
   * Instantiates a BasicAndBearerStrategy with full configuration for token lifecycle management.
   * 
   * @description
   * This constructor allows complete customization of the token acquisition process:
   * 
   * - HTTP method, URL, and credentials for the authentication request
   * - Optional headers, query params, and body payload
   * - Custom logic to extract token and expiration time from the response
   * - Expiration buffer to proactively refresh tokens
   * 
   * @param method - HTTP method to use for the authentication request (`get`, `post`, `put`, etc.).
   * @param url - Full URL of the authentication endpoint.
   * @param username - Optional basic auth username to obtain the token.
   * @param password - Optional basic auth password to obtain the token.
   * @param queryParameterMap - Optional query parameters to include in the request.
   * @param headerMap - Optional headers to include in the request.
   * @param body - Optional request body for token exchange (used for POST/PUT/PATCH).
   * @param tokenExtractor - Custom function to extract token from the response (default: `response.data?.data?.token`).
   * @param expirationExtractor - Custom function to extract expiration time in milliseconds (default: `expiresIn * 1000`).
   * @param expirationBuffer - Safety margin in ms before token expiry (default: 60,000 ms).
   * 
   * @throws
   * Error if required parameters are missing or invalid.
   */
  public constructor(
    private readonly method: string,
    private readonly url: string,
    private readonly username?: string,
    private readonly password?: string,
    private readonly queryParameterMap?: Record<string, any>,
    private readonly headerMap?: Record<string, any>,
    private readonly body?: any,
    private readonly tokenExtractor: (response: Axios.AxiosXHR<any>) => string = (response: Axios.AxiosXHR<any>): string => response.data?.data?.token,
    private readonly expirationExtractor: (response: Axios.AxiosXHR<any>) => number = (response: Axios.AxiosXHR<any>): number => (response.data?.data?.expiresIn || 3_600) * 1_000,
    private readonly expirationBuffer: number = 60_000
  ) {}

  /**
   * ## obtainToken
   * 
   * Authenticates using Basic credentials to retrieve a new bearer token.
   * 
   * @description
   * Sends a request to the configured authentication endpoint using the provided method, 
   * credentials, query params, headers, and optional body. Extracts token and expiration 
   * using custom extractor functions.
   * 
   * The result is cached until expiration.
   * 
   * @returns
   * A Promise resolving to the retrieved bearer token.
   * 
   * @throws
   * Error if the authentication request fails or the token cannot be extracted.
   */
  private async obtainToken(): Promise<string> {
    try {
      const isBodyMethod = ['post', 'put', 'patch'].includes(this.method);

      const configurationMap = {
        params: this.queryParameterMap,
        headers: this.headerMap,
        auth: {
          username: this.username,
          password: this.password
        }
      };

      const response = await (axios as any)[this.method](
        this.url,
        isBodyMethod ? this.body : configurationMap,
        isBodyMethod ? configurationMap : undefined
      );

      const token = this.tokenExtractor(response);
      const expiresIn = this.expirationExtractor(response);

      this.token = token;
      this.expiresAt = Date.now() + expiresIn - this.expirationBuffer;

      return token;
    } catch (error: unknown) {
      throw new Error(`Authentication failed: Unable to obtain token from ${ this.url }`);
    }
  }

  /**
   * ## isTokenValid
   * 
   * Checks if the current token is still valid.
   * 
   * @description
   * Returns `true` if a token exists and has not yet expired, factoring in
   * the configured expiration buffer. Otherwise, returns `false`.
   * 
   * @returns
   * Boolean indicating whether the token can be reused.
   */
  private isTokenValid(): boolean {
    return !!this.token && Date.now() < this.expiresAt;
  }

  /**
   * ## invalidateToken
   * 
   * Invalidates the currently cached token.
   * 
   * @description
   * Clears the stored token and resets the expiration timestamp. Ensures that a new token
   * will be fetched during the next `authenticate()` call.
   * 
   * Useful for:
   * 
   * - Forced logout flows
   * - Token revocation
   * - User switching
   */
  public invalidateToken(): void {
    this.token = null;
    this.expiresAt = 0;
  }

  /**
   * ## authenticate
   * 
   * Ensures a valid bearer token and adds it to the request headers.
   * 
   * @description
   * If a cached token is still valid, it is reused. If not, a new token is obtained
   * using the configured basic credentials. Adds the token to the `Authorization` header.
   * 
   * @param configurationMap - Axios request configuration to modify.
   * 
   * @returns
   * A Promise resolving to the updated config including the bearer token.
   * 
   * @throws
   * Error if the token cannot be acquired.
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
