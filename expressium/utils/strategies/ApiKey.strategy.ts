import { IAuthenticationStrategy } from './interfaces/index.js';

/**
 * ## ApiKeyStrategy
 * 
 * Stateless authentication strategy for header-based API key injection.
 * 
 * @description
 * Adds an API key to a configurable request header. Does not manage session or token lifecycles,
 * making it ideal for simple key-authenticated APIs.
 * 
 * Suitable for APIs that:
 * 
 * - Require a static API key per request
 * - Use custom header names (e.g., `X-API-Key`, `api-key`)
 * - Do not support OAuth or token refresh
 * 
 * @method authenticate - Attaches the API key to a specified header.
 */
export class ApiKeyStrategy implements IAuthenticationStrategy.IAuthenticationStrategy {
  /**
   * ## constructor
   * 
   * Creates a new ApiKeyStrategy instance.
   * 
   * @description
   * Accepts a static API key and an optional custom header name.
   * The key will be added to each request via the specified header (default: `X-API-Key`).
   * 
   * @param key - The API key to include in request headers.
   * @param headerName - Optional name of the header to store the key. Defaults to `X-API-Key`.
   * 
   * @throws
   * Error if the key is empty or invalid.
   */
  public constructor(
    private readonly key: string,
    private readonly headerName: string = 'X-API-Key'
  ) {}

  /**
   * ## authenticate
   * 
   * Adds an API key to a specified header in the request config.
   * 
   * @description
   * Inserts the API key under a configurable header name (default: `X-API-Key`).
   * Existing headers are preserved.
   * 
   * @param configurationMap - Axios request configuration to modify.
   * 
   * @returns
   * Updated Axios request config including the API key.
   */
  public authenticate(configurationMap: Axios.AxiosXHRConfig<any>): Axios.AxiosXHRConfig<any> {
    return {
      ...configurationMap,
      headers: {
        ...configurationMap.headers,
        [this.headerName]: this.key
      }
    };
  }
}
