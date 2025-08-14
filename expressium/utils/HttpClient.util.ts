import axios from 'axios';
import crypto from 'crypto';
import { IAuthenticationStrategy } from './strategies/interfaces/index.js';

/**
 * ## HttpClient
 *
 * A flexible and type-safe HTTP client built on top of Axios.
 *
 * @description
 * The `HttpClient` class provides a consistent interface for making HTTP requests with support
 * for configurable authentication strategies and automatic request enhancements (such as request IDs).
 * It wraps Axios to expose all standard HTTP verbs, while allowing injection of custom request behavior.
 *
 * Features:
 * 
 * - Customizable authentication using strategy pattern
 * - Automatically appends a unique `X-Request-ID` to every request
 * - Supports common HTTP verbs: GET, POST, PUT, PATCH, DELETE, HEAD
 * - Strongly typed response handling with generics
 *
 * @method setAuthenticationStrategy Sets an authentication strategy to apply to all requests.
 * @method clearAuthenticationStrategy Removes any currently applied authentication strategy.
 * @method request Makes a generic HTTP request with optional payload and configuration.
 * @method get Sends a GET request to retrieve data from the server.
 * @method post Sends a POST request to create resources or submit data.
 * @method put Sends a PUT request to fully update or replace a resource.
 * @method patch Sends a PATCH request to partially update a resource.
 * @method delete Sends a DELETE request to remove a resource.
 * @method head Sends a HEAD request to retrieve metadata without a response body.
 */
export class HttpClient {
  /**
   * Internal Axios instance used for all HTTP requests.
   *
   * @description
   * This instance is configured during client construction and enhanced
   * with request interceptors for authentication and request ID tracking.
   * It ensures consistent behavior across all request methods.
   */
  private readonly axiosInstance: Axios.AxiosInstance;

  /**
   * Currently active authentication strategy for modifying requests.
   *
   * @description
   * If defined, this strategy modifies outgoing request configurations
   * to include authentication credentials. It must implement the
   * `IAuthenticationStrategy` interface.
   */
  private authenticationStrategy?: IAuthenticationStrategy.IAuthenticationStrategy;
  
  /**
   * Default Axios configuration applied to all requests.
   *
   * @description
   * Defines baseline headers and configuration used during
   * Axios instance creation. Can be overridden via constructor or per request.
   */
  private readonly DEFAULT_CONFIGURATION_MAP: Required<Pick<{ headers: Record<string, string> }, 'headers'>> = { headers: { Accept: '*/*' } };

  /**
   * Creates a new HttpClient instance with optional configuration.
   *
   * @description
   * Constructs and configures an internal Axios instance. Adds
   * interceptors for request ID generation and authentication.
   *
   * @param configurationMap - Optional Axios configuration to override defaults.
   */
  public constructor(
    public configurationMap?: { headers: Record<string, string> }
  ) {
    this.axiosInstance = this.createAxiosInstance(configurationMap);
    
    this.setupInterceptors();
  }

  /**
   * Creates a new Axios instance with merged default and custom configuration.
   *
   * @description
   * Merges `DEFAULT_CONFIGURATION_MAP` with the user-provided configuration.
   * Used internally during class construction.
   *
   * @param configurationMap - Optional Axios config overrides.
   * 
   * @returns
   * Configured Axios instance.
   */
  private createAxiosInstance(configurationMap?: { headers: Record<string, string> }): Axios.AxiosInstance {
    return axios.create<any>(
      {
        headers: this.DEFAULT_CONFIGURATION_MAP.headers,
        ...configurationMap as Record<string, unknown>
      }
    ) as Axios.AxiosInstance;
  }

  /**
   * Sets the current authentication strategy to be applied to all requests.
   *
   * @description
   * Assigns an implementation of `IAuthenticationStrategy` that modifies
   * outgoing requests with authentication credentials.
   *
   * @param strategy - The authentication strategy to apply.
   */
  public setAuthenticationStrategy(strategy: IAuthenticationStrategy.IAuthenticationStrategy): void {
    this.authenticationStrategy = strategy;
  }

  /**
   * Removes the active authentication strategy.
   *
   * @description
   * Clears authentication from future requests. Useful for logout
   * flows, expired credentials, or switching strategies.
   */
  public clearAuthenticationStrategy(): void {
    this.authenticationStrategy = undefined;
  }

  /**
   * Sets up Axios request interceptors.
   *
   * @description
   * Adds the following behaviors to all outgoing requests:
   * 
   * - Attaches a unique `X-Request-ID` header
   * - Applies authentication if a strategy is set
   *
   * Called automatically during construction.
   */
  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      async (configurationMap: Axios.AxiosXHRConfig<any>): Promise<any> => {
        const updatedConfigurationMap = {
          ...configurationMap,
          headers: {
            ...configurationMap.headers,
            'X-Request-ID': crypto.randomUUID()
          }
        };

        return this.authenticationStrategy 
          ? await this.authenticationStrategy.authenticate(updatedConfigurationMap)
          : updatedConfigurationMap;
      },
      (error: unknown): Promise<never> => {
        return Promise.reject(error);
      }
    );
  }

  /**
   * Makes a generic HTTP request with optional payload and configuration.
   *
   * @template T Type of the expected response data.
   *
   * @param method - HTTP method (e.g., 'GET', 'POST', 'PUT').
   * @param url - The endpoint to request. Can be relative or absolute.
   * @param data - Optional request body payload.
   * @param configurationMap - Additional Axios request config.
   *
   * @returns
   * A promise resolving to the typed Axios response.
   *
   * @throws
   * If the request fails.
   */
  public async request<T>(
    method: string,
    url: string,
    data?: unknown,
    configurationMap: Axios.AxiosXHRConfig<any> | {} = {}
  ): Promise<Axios.AxiosXHR<T>> {
    return this.axiosInstance.request<T>(
      {
        method,
        url,
        data,
        ...configurationMap
      }
    );
  }

  /**
   * Sends a GET request to retrieve data from the server.
   *
   * @template T Type of the expected response data.
   *
   * @param url - The endpoint to request.
   * @param configurationMap - Optional request configuration.
   *
   * @returns
   * A promise resolving to an Axios response with data of type T.
   *
   * @throws
   * If the request fails.
   */
  public async get<T>(
    url: string, 
    configurationMap?: Partial<Axios.AxiosXHRConfig<any>>
  ): Promise<Axios.AxiosXHR<T>> {
    return this.request<T>('GET', url, undefined, configurationMap);
  }

  /**
   * Sends a POST request to create resources or submit data.
   *
   * @template T Type of the expected response data.
   *
   * @param url - The endpoint to request.
   * @param data - Payload to send in the request body.
   * @param configurationMap - Optional request configuration.
   *
   * @returns
   * A promise resolving to an Axios response with data of type T.
   *
   * @throws
   * If the request fails.
   */
  public async post<T>(
    url: string, 
    data?: unknown, 
    configurationMap?: Partial<Axios.AxiosXHRConfig<any>>
  ): Promise<Axios.AxiosXHR<T>> {
    return this.request<T>('POST', url, data, configurationMap);
  }

  /**
   * Sends a PUT request to fully update or replace a resource.
   *
   * @template T Type of the expected response data.
   *
   * @param url - The endpoint to request.
   * @param data - Full replacement payload.
   * @param configurationMap - Optional request configuration.
   *
   * @returns
   * A promise resolving to an Axios response with data of type T.
   *
   * @throws
   * If the request fails.
   */
  public async put<T>(
    url: string, 
    data?: unknown, 
    configurationMap?: Partial<Axios.AxiosXHRConfig<any>>
  ): Promise<Axios.AxiosXHR<T>> {
    return this.request<T>('PUT', url, data, configurationMap);
  }

  /**
   * Sends a PATCH request to partially update a resource.
   *
   * @template T Type of the expected response data.
   *
   * @param url - The endpoint to request.
   * @param data - Partial update payload.
   * @param configurationMap - Optional request configuration.
   *
   * @returns
   * A promise resolving to an Axios response with data of type T.
   *
   * @throws
   * If the request fails.
   */
  public async patch<T>(
    url: string, 
    data?: unknown, 
    configurationMap?: Partial<Axios.AxiosXHRConfig<any>>
  ): Promise<Axios.AxiosXHR<T>> {
    return this.request<T>('PATCH', url, data, configurationMap);
  }

  /**
   * Sends a DELETE request to remove a resource.
   *
   * @template T Type of the expected response data.
   *
   * @param url - The endpoint to request.
   * @param configurationMap - Optional request configuration.
   *
   * @returns
   * A promise resolving to an Axios response with data of type T.
   *
   * @throws
   * If the request fails.
   */
  public async delete<T>(
    url: string, 
    configurationMap?: Partial<Axios.AxiosXHRConfig<any>>
  ): Promise<Axios.AxiosXHR<T>> {
    return this.request<T>('DELETE', url, undefined, configurationMap);
  }

  /**
   * Sends a HEAD request to retrieve metadata without a response body.
   *
   * @template T Type of the expected response data.
   *
   * @param url - The endpoint to request.
   * @param configurationMap - Optional request configuration.
   *
   * @returns
   * A promise resolving to an Axios response with data of type T.
   *
   * @throws
   * If the request fails.
   */
  public async head<T>(
    url: string, 
    configurationMap?: Partial<Axios.AxiosXHRConfig<any>>
  ): Promise<Axios.AxiosXHR<T>> {
    return this.request<T>('HEAD', url, undefined, configurationMap);
  }
}
