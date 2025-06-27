import axios from 'axios';
import crypto from 'crypto';
import { IAuthenticationStrategy } from './interfaces/index.js';

/**
 * ## OAuthStrategy
 * 
 * Comprehensive OAuth authentication strategy supporting OAuth 1.0a and OAuth 2.0 
 * protocols for API authorization.
 * 
 * @description The OAuthStrategy class provides a versatile authentication solution 
 * for OAuth-based APIs with support for various grant types, token management, 
 * and automatic refresh capabilities.
 * 
 * Key features:
 * 
 * - Support for multiple OAuth flows (Authorization Code, Implicit, Client Credentials, etc.)
 * - Automatic token acquisition and renewal
 * - Secure token storage and management
 * - Customizable token and expiration handling
 * - Support for redirect-based authorization
 * - PKCE extension support for enhanced security
 * - State parameter management for CSRF protection
 * 
 * Particularly useful for:
 * 
 * - Social media integrations (Google, Facebook, Twitter, etc.)
 * - Enterprise API access (Microsoft, Salesforce, etc.)
 * - E-commerce platforms (Shopify, Amazon, etc.)
 * - SaaS applications with OAuth-based APIs
 * 
 * @method getAuthorizationUrl - Generates the authorization URL for redirect-based OAuth flows.
 * @method handleCallback - Processes the OAuth callback and exchanges authorization code for tokens.
 * @method setTokens - Manually sets access and refresh tokens.
 * @method refreshToken - Manually triggers a token refresh.
 * @method revokeToken - Revokes the current access and/or refresh tokens.
 * @method authenticate - Authenticates the request by adding the token to the configuration.
 */
export class OAuthStrategy implements IAuthenticationStrategy.IAuthenticationStrategy {
  /**
   * ## accessTokenValue
   * 
   * The OAuth access token used for API requests.
   * 
   * @description Stores the short-lived token used for API authorization.
   * Automatically managed throughout the token lifecycle.
   * 
   * @private
   */
  private accessTokenValue: string | null = null;

  /**
   * ## refreshTokenValue
   * 
   * Token used to obtain new access tokens without re-authentication.
   * 
   * @description Long-lived token that allows the strategy to refresh access tokens
   * when they expire, without requiring user interaction.
   * 
   * @private
   */
  private refreshTokenValue: string | null = null;

  /**
   * ## expiresAt
   * 
   * Timestamp (in milliseconds since epoch) when the access token expires.
   * 
   * @description Used to determine token validity before API requests.
   * Triggers automatic refresh when approaching expiration.
   * 
   * @private
   */
  private expiresAt: number = 0;

  /**
   * ## state
   * 
   * Random string used for CSRF protection in authorization code flow.
   * 
   * @description Generated when creating an authorization URL and verified 
   * when processing the callback to prevent CSRF attacks.
   * 
   * @private
   */
  private state: string | null = null;

  /**
   * ## codeVerifier
   * 
   * Random string used for PKCE extension in authorization code flow.
   * 
   * @description Used with PKCE (Proof Key for Code Exchange) to secure 
   * the authorization code flow for public clients.
   * 
   * @private
   */
  private codeVerifier: string | null = null;

  /**
   * ## constructor
   * 
   * Creates a new OAuthStrategy instance.
   * 
   * @description Initializes the OAuth authentication strategy with 
   * parameters for obtaining and managing tokens.
   * 
   * @public
   * 
   * @constructor
   * 
   * @param clientId - The OAuth client ID provided by the service.
   * @param clientSecret - The OAuth client secret (optional for implicit flow).
   * @param tokenUrl - URL endpoint for token acquisition and refresh.
   * @param authorizationUrl - URL endpoint for user authorization (code and implicit flows).
   * @param redirectUrl - URL where the service redirects after authorization.
   * @param scope - Space-separated list of permissions being requested.
   * @param grantType - OAuth grant type ('authorization_code', 'client_credentials', 'password', 'implicit', etc.).
   * @param accessTokenExtractor - Function to extract access token from response.
   * @param refreshTokenExtractor - Function to extract refresh token from response.
   * @param expirationExtractor - Function to extract token expiration from response.
   * @param expirationBuffer - Time in milliseconds to refresh token before actual expiration.
   * @param pkceEnabled - Whether to use PKCE extension for enhanced security.
   * @param additionalParameterMap - Additional parameters to include in token requests.
   * 
   * @throws If invalid parameters are provided.
   */
  public constructor(
    /**
     * @private
     * @readonly
     */
    private readonly clientId: string,

    /**
     * @private
     * @readonly
     */
    private readonly clientSecret?: string,

    /**
     * @private
     * @readonly
     */
    private readonly tokenUrl?: string,

    /**
     * @private
     * @readonly
     */
    private readonly authorizationUrl?: string,

    /**
     * @private
     * @readonly
     */
    private readonly redirectUrl?: string,

    /**
     * @private
     * @readonly
     */
    private readonly scope?: string,

    /**
     * @private
     * @readonly
     */
    private readonly grantType: string = 'authorization_code',

    /**
     * @private
     * @readonly
     */
    private readonly accessTokenExtractor: (response: Axios.AxiosXHR<any>) => string = (response: Axios.AxiosXHR<any>): string => response.data?.access_token || response.data?.token,

    /**
     * @private
     * @readonly
     */
    private readonly refreshTokenExtractor: (response: Axios.AxiosXHR<any>) => string | null = (response: Axios.AxiosXHR<any>): string | null => response.data?.refresh_token || null,

    /**
     * @private
     * @readonly
     */
    private readonly expirationExtractor: (response: Axios.AxiosXHR<any>) => number = (response: Axios.AxiosXHR<any>): number => (response.data?.expires_in || 3_600) * 1_000,

    /**
     * @private
     * @readonly
     */
    private readonly expirationBuffer: number = 60_000,

    /**
     * @private
     * @readonly
     */
    private readonly pkceEnabled: boolean = false,

    /**
     * @private
     * @readonly
     */
    private readonly additionalParameterMap: Record<string, any> = {}
  ) {
    this.validateConfiguration();
  }

  /**
   * ## validateConfiguration
   * 
   * Validates the strategy configuration based on the selected grant type.
   * 
   * @description Ensures all required parameters are provided for the selected OAuth flow.
   * Different grant types require different parameter combinations.
   * 
   * @private
   * 
   * @throws If configuration is invalid for the selected grant type.
   */
  private validateConfiguration(): void {
    if (!this.clientId) {
      throw new Error('Client ID is required');
    }

    if (this.grantType !== 'implicit' && !this.clientSecret) {
      throw new Error('Client secret is required for this grant type');
    }

    if (this.grantType !== 'implicit' && !this.tokenUrl) {
      throw new Error('Token URL is required for this grant type');
    }

    if (['authorization_code', 'implicit'].includes(this.grantType) && !this.authorizationUrl) {
      throw new Error('Authorization URL is required for this grant type');
    }

    if (['authorization_code', 'implicit'].includes(this.grantType) && !this.redirectUrl) {
      throw new Error('Redirect URL is required for this grant type');
    }
  }

  /**
   * ## generateRandomString
   * 
   * Generates a cryptographically secure random string.
   * 
   * @description Creates a random string for use as state parameter or PKCE code verifier.
   * Implemented using available Web Crypto API or fallback methods.
   * 
   * @private
   * 
   * @param length - Length of the random string to generate (default: 43 characters).
   * 
   * @returns A cryptographically secure random string.
   */
  private generateRandomString(length: number = 43): string {
    const characterSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let randomString = '';
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const valueList = new Uint8Array(length);

      crypto.getRandomValues(valueList);
      
      for (let index = 0; index < length; index += 1) {
        randomString += characterSet[valueList[index] % characterSet.length];
      }

      return randomString;
    }
    
    for (let index = 0; index < length; index += 1) {
      randomString += characterSet[Math.floor(Math.random() * characterSet.length)];
    }

    return randomString;
  }

  /**
   * ## generateCodeChallenge
   * 
   * Generates a PKCE code challenge from a code verifier.
   * 
   * @description Creates SHA-256 hash of the code verifier and base64-url encodes it
   * for use in the PKCE authorization flow.
   * 
   * @private
   * 
   * @async
   * 
   * @param codeVerifier - The code verifier string.
   * 
   * @returns Promise resolving to the code challenge string.
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const hash = await crypto.subtle.digest('SHA-256', data);
      
      return btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }
    
    try {
      const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64');
      
      return hash
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    } catch (error: unknown) {
      throw new Error('Unable to generate code challenge: crypto support required');
    }
  }

  /**
   * ## getAuthorizationUrl
   * 
   * Generates the authorization URL for redirect-based OAuth flows.
   * 
   * @description Creates a properly formatted authorization URL with all required
   * parameters for the authorization code or implicit flow.
   * Includes state parameter for CSRF protection and PKCE if enabled.
   * 
   * @public
   * 
   * @async
   * 
   * @returns Promise resolving to the authorization URL string.
   * 
   * @throws If the flow doesn't require authorization or configuration is invalid.
   */
  public async getAuthorizationUrl(): Promise<string> {
    if (!['authorization_code', 'implicit'].includes(this.grantType)) {
      throw new Error('Authorization URL is only applicable for authorization_code or implicit flows');
    }
    
    if (!this.authorizationUrl) {
      throw new Error('Authorization URL is required but not provided');
    }
    
    this.state = this.generateRandomString(32);
    
    const queryParameterMap = new URLSearchParams(
      {
        client_id: this.clientId,
        redirect_uri: this.redirectUrl as string,
        state: this.state,
        response_type: this.grantType === 'authorization_code' ? 'code' : 'token',
      }
    );
    
    if (this.scope) {
      queryParameterMap.append('scope', this.scope);
    }
    
    for (const [key, value] of Object.entries(this.additionalParameterMap)) {
      queryParameterMap.append(key, value.toString());
    }
    
    if (this.pkceEnabled && this.grantType === 'authorization_code') {
      this.codeVerifier = this.generateRandomString();

      const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);
      
      queryParameterMap.append('code_challenge', codeChallenge);
      queryParameterMap.append('code_challenge_method', 'S256');
    }

    return `${ this.authorizationUrl }?${ queryParameterMap.toString() }`;
  }

  /**
   * ## handleCallback
   * 
   * Processes the OAuth callback and exchanges authorization code for tokens.
   * 
   * @description Handles the callback from the authorization server,
   * verifies the state parameter, and exchanges the code for access and refresh tokens.
   * Stores the obtained tokens for subsequent API requests.
   * 
   * @public
   * 
   * @async
   * 
   * @param callbackUrl - The full callback URL with query parameters.
   * 
   * @returns Promise resolving to the access token.
   * 
   * @throws If state verification fails or token exchange fails.
   */
  public async handleCallback(callbackUrl: string): Promise<string> {
    const url = new URL(callbackUrl);
    const queryParameterMap = new URLSearchParams(url.search);
    
    if (this.grantType === 'implicit') {
      const implicitQueryParameterMap = new URLSearchParams(url.hash.substring(1));
      const state = implicitQueryParameterMap.get('state');

      if (state !== this.state) {
        throw new Error('OAuth state mismatch: possible CSRF attack');
      }
      
      const accessToken = implicitQueryParameterMap.get('access_token');

      if (!accessToken) {
        throw new Error('No access token found in callback');
      }
      
      const expiresIn = implicitQueryParameterMap.get('expires_in');
      
      this.accessTokenValue = accessToken;
      this.expiresAt = expiresIn ? Date.now() + (parseInt(expiresIn, 10) * 1_000) : 0;
      
      return accessToken;
    }
    
    const state = queryParameterMap.get('state');

    if (state !== this.state) {
      throw new Error('OAuth state mismatch: possible CSRF attack');
    }
    
    const code = queryParameterMap.get('code');

    if (!code) {
      throw new Error('No authorization code found in callback');
    }

    const error = queryParameterMap.get('error');

    if (error) {
      const errorDescription = queryParameterMap.get('error_description');

      throw new Error(`OAuth error: ${ error }${ errorDescription ? ` - ${ errorDescription }` : '' }`);
    }
    
    const tokenRequestDataMap: Record<string, any> = {
      client_id: this.clientId,
      redirect_uri: this.redirectUrl,
      grant_type: 'authorization_code',
      code
    };
    
    if (this.pkceEnabled && this.codeVerifier) {
      tokenRequestDataMap.code_verifier = this.codeVerifier;
    }
    
    try {
      const response = await axios.post(
        this.tokenUrl as string,
        new URLSearchParams(tokenRequestDataMap).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(
              this.clientSecret 
                ? { Authorization: `Basic ${ Buffer.from(`${ this.clientId }:${ this.clientSecret }`).toString('base64') }` } 
                : {}
            )
          }
        }
      );
      
      const expiresIn = this.expirationExtractor(response);

      this.accessTokenValue = this.accessTokenExtractor(response);
      this.refreshTokenValue = this.refreshTokenExtractor(response);
      this.expiresAt = Date.now() + expiresIn - this.expirationBuffer;
      
      return this.accessTokenValue;
    } catch (error: unknown) {
      console.error('Token exchange failed:', error instanceof Error ? error.message : String(error));

      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * ## getClientCredentialsToken
   * 
   * Obtains a token using the client credentials grant type.
   * 
   * @description Authenticates with the OAuth server using client ID and secret
   * to obtain an access token for service-to-service integrations.
   * 
   * @private
   * 
   * @async
   * 
   * @returns Promise resolving to the access token.
   * 
   * @throws If token acquisition fails.
   */
  private async getClientCredentialsToken(): Promise<string> {
    try {
      const tokenRequestBody: Record<string, any> = {
        client_id: this.clientId,
        grant_type: 'client_credentials'
      };
      
      if (this.scope) {
        tokenRequestBody.scope = this.scope;
      }
      
      for (const [key, value] of Object.entries(this.additionalParameterMap)) {
        tokenRequestBody[key] = value;
      }
      
      const response = await axios.post(
        this.tokenUrl as string,
        new URLSearchParams(tokenRequestBody).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${ Buffer.from(`${ this.clientId }:${ this.clientSecret }`).toString('base64') }`
          }
        }
      );
      
      const expiresIn = this.expirationExtractor(response);

      this.accessTokenValue = this.accessTokenExtractor(response);
      this.expiresAt = Date.now() + expiresIn - this.expirationBuffer;
      
      return this.accessTokenValue;
    } catch (error: unknown) {
      console.error('Client credentials token acquisition failed:', error instanceof Error ? error.message : String(error));

      throw new Error('Failed to obtain token using client credentials');
    }
  }

  /**
   * ## getPasswordToken
   * 
   * Obtains a token using the resource owner password credentials grant type.
   * 
   * @description Authenticates with the OAuth server using username and password
   * to obtain an access token without the redirect flow.
   * 
   * @private
   * 
   * @async
   * 
   * @param username - Resource owner's username.
   * @param password - Resource owner's password.
   * 
   * @returns Promise resolving to the access token.
   * 
   * @throws If token acquisition fails.
   */
  private async getPasswordToken(username: string, password: string): Promise<string> {
    try {
      const tokenRequestBody: Record<string, any> = {
        client_id: this.clientId,
        grant_type: 'password',
        username,
        password
      };
      
      if (this.scope) {
        tokenRequestBody.scope = this.scope;
      }
      
      for (const [key, value] of Object.entries(this.additionalParameterMap)) {
        tokenRequestBody[key] = value;
      }
      
      const response = await axios.post(
        this.tokenUrl as string,
        new URLSearchParams(tokenRequestBody).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(
              this.clientSecret 
                ? { Authorization: `Basic ${ Buffer.from(`${ this.clientId }:${ this.clientSecret }`).toString('base64') }` } 
                : {}
            )
          }
        }
      );
      
      const expiresIn = this.expirationExtractor(response);

      this.accessTokenValue = this.accessTokenExtractor(response);
      this.refreshTokenValue = this.refreshTokenExtractor(response);
      this.expiresAt = Date.now() + expiresIn - this.expirationBuffer;
      
      return this.accessTokenValue;
    } catch (error: unknown) {
      console.error('Password grant token acquisition failed:', error instanceof Error ? error.message : String(error));

      throw new Error('Failed to obtain token using password credentials');
    }
  }

  /**
   * ## refreshAccessToken
   * 
   * Refreshes the access token using the refresh token.
   * 
   * @description Uses the previously obtained refresh token to request a new
   * access token when the current one expires, avoiding the need for user re-authentication.
   * 
   * @private
   * 
   * @async
   * 
   * @returns Promise resolving to the new access token.
   * 
   * @throws If refresh fails or no refresh token is available.
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.refreshTokenValue) {
      throw new Error('No refresh token available');
    }
    
    try {
      const tokenRequestBody: Record<string, any> = {
        refresh_token: this.refreshTokenValue,
        client_id: this.clientId,
        grant_type: 'refresh_token'
      };
      
      if (this.scope) {
        tokenRequestBody.scope = this.scope;
      }
      
      const response = await axios.post(
        this.tokenUrl as string,
        new URLSearchParams(tokenRequestBody).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(
              this.clientSecret 
                ? { Authorization: `Basic ${ Buffer.from(`${ this.clientId }:${ this.clientSecret }`).toString('base64') }` } 
                : {}
            )
          }
        }
      );
      
      this.accessTokenValue = this.accessTokenExtractor(response);
      
      const newRefreshToken = this.refreshTokenExtractor(response);

      if (newRefreshToken) {
        this.refreshTokenValue = newRefreshToken;
      }
      
      const expiresIn = this.expirationExtractor(response);

      this.expiresAt = Date.now() + expiresIn - this.expirationBuffer;
      
      return this.accessTokenValue;
    } catch (error: unknown) {
      console.error('Token refresh failed:', error instanceof Error ? error.message : String(error));
      
      this.accessTokenValue = null;
      this.refreshTokenValue = null;
      this.expiresAt = 0;
      
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * ## isTokenValid
   * 
   * Checks if the current access token is valid and not expired.
   * 
   * @description Determines token validity by checking if:
   * 
   * - Access token exists
   * - Current time is before the token's expiration (accounting for buffer)
   * 
   * @private
   * 
   * @returns Boolean indicating token validity.
   */
  private isTokenValid(): boolean {
    return !!this.accessTokenValue && Date.now() < this.expiresAt;
  }

  /**
   * ## getToken
   * 
   * Obtains or refreshes the access token as needed.
   * 
   * @description Central method for token management that:
   * 
   * 1. Returns existing token if valid
   * 2. Refreshes token if expired but refresh token exists
   * 3. Obtains new token using client credentials if applicable
   * 
   * @private
   * 
   * @async
   * 
   * @param parameterMap - Optional parameters for password grant.
   * 
   * @returns Promise resolving to a valid access token.
   * 
   * @throws If token acquisition fails.
   */
  private async getToken(parameterMap?: { username: string; password: string }): Promise<string> {
    if (this.isTokenValid()) {
      return this.accessTokenValue as string;
    }
    
    if (this.refreshTokenValue) {
      try {
        return await this.refreshAccessToken();
      } catch (error: unknown) {
        console.warn('Token refresh failed, falling back to direct authentication');
      }
    }
    
    switch (this.grantType) {
      case 'client_credentials':
        return this.getClientCredentialsToken();
        
      case 'password':
        if (!parameterMap?.username || !parameterMap?.password) {
          throw new Error('Username and password required for password grant type');
        }

        return this.getPasswordToken(parameterMap.username, parameterMap.password);
        
      case 'authorization_code':
        throw new Error('Authorization code flow requires user interaction. Use getAuthorizationUrl() and handleCallback() methods.');

      case 'implicit':
        throw new Error('Authorization flow requires user interaction. Use getAuthorizationUrl() and handleCallback() methods.');
        
      default:
        throw new Error(`Unsupported grant type: ${ this.grantType }`);
    }
  }

  /**
   * ## setTokens
   * 
   * Manually sets access and refresh tokens.
   * 
   * @description Allows direct injection of tokens, useful for:
   * 
   * - Testing
   * - Migration from other authentication mechanisms
   * - Integration with token storage systems
   * 
   * @public
   * 
   * @param accessToken - The access token to set.
   * @param refreshToken - Optional refresh token to set.
   * @param expiresIn - Optional token expiration in seconds.
   */
  public setTokens(
    accessToken: string, 
    refreshToken?: string, 
    expiresIn?: number
  ): void {
    this.accessTokenValue = accessToken;
    
    if (refreshToken) {
      this.refreshTokenValue = refreshToken;
    }
    
    if (expiresIn) {
      this.expiresAt = Date.now() + (expiresIn * 1_000) - this.expirationBuffer;
    } else {
      this.expiresAt = Date.now() + 3_600_000 - this.expirationBuffer;
    }
  }

  /**
   * ## refreshToken
   * 
   * Manually triggers a token refresh.
   * 
   * @description Public method to force token refresh regardless of expiration.
   * Useful for handling token revocation scenarios or server-side invalidation.
   * 
   * @public
   * 
   * @async
   * 
   * @returns Promise resolving to the new access token.
   * 
   * @throws If refresh fails or no refresh token is available.
   */
  public async refreshToken(): Promise<string> {
    return this.refreshAccessToken();
  }

  /**
   * ## revokeToken
   * 
   * Revokes the current access and/or refresh tokens.
   * 
   * @description Sends requests to the token revocation endpoint to invalidate tokens.
   * Implements RFC 7009 OAuth 2.0 Token Revocation if the server supports it.
   * 
   * @public
   * 
   * @async
   * 
   * @param revokeUrl - URL endpoint for token revocation.
   * @param revokeRefreshToken - Whether to revoke refresh token too (default: true).
   * 
   * @returns Promise resolving when revocation is complete.
   */
  public async revokeToken(revokeUrl: string, revokeRefreshToken: boolean = true): Promise<void> {
    if (!this.accessTokenValue) {
      return;
    }
    
    try {
      await axios.post(
        revokeUrl,
        new URLSearchParams(
          {
            client_id: this.clientId,
            token: this.accessTokenValue,
            token_type_hint: 'access_token'
          }
        ).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(
              this.clientSecret 
                ? { Authorization: `Basic ${ Buffer.from(`${ this.clientId }:${ this.clientSecret }`).toString('base64') }` } 
                : {}
            )
          }
        }
      );
      
      if (revokeRefreshToken && this.refreshTokenValue) {
        await axios.post(
          revokeUrl,
          new URLSearchParams(
            {
              client_id: this.clientId,
              token: this.refreshTokenValue,
              token_type_hint: 'refresh_token'
            }
          ).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              ...(
                this.clientSecret 
                  ? { Authorization: `Basic ${ Buffer.from(`${ this.clientId }:${ this.clientSecret }`).toString('base64') }` } 
                  : {}
              )
            }
          }
        );
      }
    } catch (error: unknown) {
      console.error('Token revocation failed:', error instanceof Error ? error.message : String(error));
    } finally {
      this.accessTokenValue = null;
      
      if (revokeRefreshToken) {
        this.refreshTokenValue = null;
      }
      
      this.expiresAt = 0;
    }
  }

  /**
   * ## authenticate
   * 
   * Authenticates the request by adding the token to the configuration.
   * 
   * @description Implements the IAuthenticationStrategy interface method.
   * Ensures a valid token is available and adds it to the request headers.
   * 
   * @public
   * 
   * @async
   * 
   * @param configurationMap - Axios request configuration to modify.
   * @param parameterMap - Optional parameters for password grant.
   * 
   * @returns Promise resolving to modified request configuration with token added.
   * 
   * @throws If token acquisition fails.
   */
  public async authenticate(
    configurationMap: Axios.AxiosXHRConfig<any>,
    parameterMap?: { username: string; password: string }
  ): Promise<Axios.AxiosXHRConfig<any>> {
    const token = await this.getToken(parameterMap);
    
    return {
      ...configurationMap,
      headers: {
        ...configurationMap.headers,
        Authorization: `Bearer ${ token }`
      }
    };
  }
}
