/**
 * ## IAuthenticationStrategy
 *
 * Contract for pluggable authentication strategies.
 *
 * @description
 * Defines a strategy interface for applying authentication details to Axios HTTP requests.
 * This interface supports multiple authentication mechanisms (e.g., Bearer token, Basic Auth, API key)
 * and allows the application to remain decoupled from specific authentication implementations.
 *
 * Commonly used in modular or multi-tenant API clients where different endpoints require
 * different types of authentication.
 *
 * Strategy implementations may:
 *
 * - Add `Authorization` headers (Bearer, Basic, etc.)
 * - Add API keys via custom headers
 * - Modify request parameters conditionally
 * - Perform token retrieval or refresh asynchronously
 *
 * @method authenticate - Injects authentication information into an Axios request configuration.
 */
export interface IAuthenticationStrategy {
  /**
   * ## authenticate
   *
   * Applies authentication logic to the outgoing Axios request.
   *
   * @description
   * This method prepares an Axios request with the appropriate authentication mechanism.
   * It may operate synchronously (e.g., adding headers) or asynchronously (e.g., retrieving tokens).
   * The result is a modified Axios configuration object ready for submission.
   *
   * Examples of use:
   *
   * - Injecting a bearer token from cache or after a token exchange
   * - Setting up `auth` credentials for basic authentication
   * - Adding API keys to custom headers
   *
   * @param configurationMap - The Axios request configuration to enhance with authentication.
   *
   * @returns
   * A modified Axios configuration with authentication details, either synchronously or via Promise.
   */
  authenticate(configurationMap: Axios.AxiosXHRConfig<any>): Promise<Axios.AxiosXHRConfig<any>> | Axios.AxiosXHRConfig<any>;
}
