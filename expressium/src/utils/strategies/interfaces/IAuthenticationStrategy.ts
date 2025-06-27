/**
 * ## IAuthenticationStrategy
 * 
 * Interface for implementing custom authentication strategies.
 * 
 * @description Defines a contract for strategies that add authentication 
 * information to Axios HTTP requests. Follows the strategy pattern to allow
 * multiple authentication methods (JWT, Basic Auth, API keys, etc.).
 */
export interface IAuthenticationStrategy {
  /**
   * ## authenticate
   * 
   * Authenticates an Axios request by modifying its configuration.
   * 
   * @description Prepares the request with necessary authentication details,
   * typically by adding authorization headers or tokens. May perform 
   * synchronous or asynchronous operations.
   * 
   * @param configurationMap - The Axios request configuration to modify.
   * 
   * @returns Modified request configuration with authentication details.
   */
  authenticate(configurationMap: Axios.AxiosXHRConfig<any>): Promise<Axios.AxiosXHRConfig<any>> | Axios.AxiosXHRConfig<any>;
}
