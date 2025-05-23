import axios from 'axios';
import { IAuthenticationStrategy } from './strategies/interfaces/index.js';

/**
 * ## HttpClient
 * 
 * HTTP client for making requests to the server.
 * 
 * @description This class provides a configurable interface for making HTTP requests
 * to the server. Built on top of the Axios library, it offers a set of methods
 * for handling common HTTP verbs (GET, POST, PUT, PATCH, DELETE, HEAD) with
 * consistent error handling and authentication support.
 * 
 * Key features:
 * 
 * - Configurable authentication strategies that can be applied globally to all requests
 * - Automatic request ID generation for improved traceability
 * - Type-safe responses using TypeScript generics
 *  
 * @method setAuthenticationStrategy - Sets the current authentication strategy for the client to be applied to all subsequent requests.
 * @method clearAuthenticationStrategy - Clears the current authentication strategy, resulting in unauthenticated requests.
 * @method request - Makes a generic HTTP request with the current authentication strategy and specified configuration.
 * @method get - Performs a GET request to retrieve data from the server.
 * @method post - Performs a POST request to create new resources or submit data.
 * @method put - Performs a PUT request to update or replace existing resources.
 * @method patch - Performs a PATCH request to partially update existing resources.
 * @method delete - Performs a DELETE request to remove resources from the server.
 * @method head - Performs a HEAD request to retrieve metadata from the server.
 */
export class HttpClient {
  /**
   * ## axiosInstance
   * 
   * Axios instance used to make requests to the server.
   * 
   * @description This Axios instance is the core HTTP client used for all requests.
   * It is configured with the provided options and enhanced with interceptors to
   * handle authentication and request ID generation. The instance is created during class
   * initialization and remains constant throughout the lifecycle of the HttpClient.
   * 
   * All HTTP methods (get, post, etc.) ultimately use this instance to make their
   * requests, ensuring consistent behavior across all request types.
   * 
   * @private
   * @readonly
   */
  private readonly axiosInstance: Axios.AxiosInstance;

  /**
   * ## authenticationStrategy
   * 
   * Current authentication strategy for the client.
   * 
   * @description 
   * This property stores the active authentication strategy that will
   * be applied to all outgoing requests. The strategy is responsible for modifying
   * request configurations to include appropriate authentication headers or parameters.
   * 
   * Authentication strategies must implement the IAuthenticationStrategy interface,
   * which requires an authenticate method that transforms request configurations.
   * 
   * Common authentication strategies include:
   * 
   * - API key authentication
   * - Basic authentication
   * - Basic and token authentication
   * - Token authentication
   * 
   * The strategy can be changed during runtime using setAuthenticationStrategy() or
   * removed completely with clearAuthenticationStrategy().
   * 
   * @private
   */
  private authenticationStrategy?: IAuthenticationStrategy.IAuthenticationStrategy;
  
  /**
   * ## DEFAULT_CONFIGURATION_MAP
   * 
   * Default configuration values for the Axios instance.
   * 
   * @description This object defines the baseline configuration applied to all requests
   * when not explicitly overridden. It establishes consistent defaults for important
   * behaviors such as:
   * 
   * - headers: Default headers sent with every request (defaults to accepting all content types)
   * 
   * These defaults can be overridden during client initialization or on a per-request basis.
   * 
   * @private
   * @readonly
   */
  private readonly DEFAULT_CONFIGURATION_MAP: Required<Pick<{ headers: Record<string, string> }, 'headers'>> = { headers: { Accept: '*/*' } };

  /**
   * ## constructor
   * 
   * Creates a new HttpClient instance.
   * 
   * @description Initializes a new HttpClient instance with the provided configuration.
   * The constructor performs the following steps:
   * 
   * 1. Creates an Axios instance with merged default and custom configurations
   * 2. Sets up request interceptors for authentication and request ID generation
   * 
   * Configuration options include:
   * 
   * - headers: Default headers for all requests
   * - Any other valid Axios configuration options
   * 
   * @public
   * 
   * @constructor
   * 
   * @param configurationMap - Configuration object for customizing the HttpClient instance.
   * This parameter is optional; if not provided, default values will be used.
   */
  public constructor(
    /**
     * @public
     */
    public configurationMap?: { headers: Record<string, string> }
  ) {
    this.axiosInstance = this.createAxiosInstance(configurationMap);
    
    this.setupInterceptors();
  }

  /**
   * ## createAxiosInstance
   * 
   * Creates a new Axios instance with the provided configuration.
   * 
   * @description This method initializes and configures a new Axios instance by
   * merging the default configuration with any custom configuration provided.
   * The resulting instance serves as the foundation for all HTTP requests made
   * through this client.
   * 
   * The method follows these steps:
   * 
   * 1. Start with the default configuration (headers)
   * 2. Merge in any custom configuration provided
   * 3. Create and return a new Axios instance with the merged configuration
   * 
   * This approach ensures consistent behavior across all requests while allowing
   * for customization when needed.
   * 
   * @private
   * 
   * @param configurationMap - Custom configuration to merge with defaults.
   * Can include any valid Axios configuration options.
   * 
   * @returns A fully configured Axios instance ready for use.
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
   * ## setAuthenticationStrategy
   * 
   * Sets the current authentication strategy for the client to be applied to all subsequent requests.
   * 
   * @description This method assigns an authentication strategy that will be applied
   * to all subsequent requests made by this client. The strategy is responsible for
   * modifying request configurations to include appropriate authentication credentials.
   * 
   * Authentication strategies must implement the IAuthenticationStrategy interface,
   * which requires an authenticate method that transforms request configurations.
   * 
   * Common authentication strategies include:
   * 
   * - API key authentication
   * - Basic authentication
   * - Basic and token authentication
   * - Token authentication
   * 
   * The strategy can be changed at any time during the lifecycle of the HttpClient
   * to adapt to different authentication requirements.
   * 
   * @public
   * 
   * @param strategy - Authentication strategy to apply to all subsequent requests.
   * Must implement the IAuthenticationStrategy interface.
   */
  public setAuthenticationStrategy(strategy: IAuthenticationStrategy.IAuthenticationStrategy): void {
    this.authenticationStrategy = strategy;
  }

  /**
   * ## clearAuthenticationStrategy
   * 
   * Clears the current authentication strategy, resulting in unauthenticated requests.
   * 
   * @description This method removes the currently active authentication strategy,
   * resulting in unauthenticated requests being sent for all subsequent calls.
   * 
   * Use this method when:
   * 
   * - The user logs out
   * - Authentication credentials expire and cannot be refreshed
   * - Switching to a different authentication flow
   * - Testing unauthenticated endpoints
   * 
   * After calling this method, requests will be sent without any authentication
   * credentials until a new strategy is set using setAuthenticationStrategy().
   * 
   * @public
   */
  public clearAuthenticationStrategy(): void {
    this.authenticationStrategy = undefined;
  }

  /**
   * ## setupInterceptors
   * 
   * Configures request and response interceptors for the Axios instance.
   * 
   * @description This method sets up a request interceptor that enhances the
   * functionality of the HTTP client by:
   * 
   * - Adding a unique request ID header (X-Request-ID) to each request for traceability
   * - Applying the current authentication strategy to the request configuration
   * - Handling any errors that occur during the request preparation phase
   * 
   * The request ID is generated using crypto.randomUUID() to ensure uniqueness across
   * all requests, which is valuable for debugging and monitoring.
   * 
   * @private
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
   * ## request
   * 
   * Makes a generic HTTP request with the current authentication strategy and specified configuration.
   * 
   * @description This method is the core request handler for the HttpClient. It serves
   * as the foundation for all specialized HTTP methods (get, post, etc.) and provides
   * flexible configuration options for making custom requests.
   * 
   * The method performs the following steps:
   * 
   * 1. Merges the provided configuration with the method, URL, and data
   * 2. Applies the current authentication strategy through the request interceptor
   * 3. Sends the request to the server
   * 4. Returns the typed response or rejects with an error
   * 
   * The generic type parameter T allows for type-safe responses, ensuring that
   * the returned data matches the expected structure.
   * 
   * @public
   * 
   * @async
   * 
   * @template T - Type of the expected response data. This allows for type-safe
   * access to the response body properties.
   * 
   * @param method - HTTP method to use for the request (GET, POST, PUT, etc.).
   * Should be specified in uppercase.
   * 
   * @param url - Request URL. Can be a relative URL if baseURL is set in the
   * client configuration, or an absolute URL.
   * 
   * @param data - Request payload to send. For GET requests, this should be undefined.
   * For POST, PUT, PATCH requests, this typically contains the request body.
   * 
   * @param configurationMap - Additional request configuration options.
   * 
   * @returns Promise resolving to the typed response.
   * 
   * @throws If the request fails.
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
   * ## get
   * 
   * Performs a GET request to retrieve data from the server.
   * 
   * @description This method performs a GET request to retrieve data from the server.
   * GET requests are designed to be idempotent and safe, meaning they should not
   * change the server state and can be repeated without side effects.
   * 
   * Common use cases include:
   * 
   * - Fetching resources (users, products, etc.)
   * - Querying data with filters via query parameters
   * - Retrieving API metadata (status, version, etc.)
   * 
   * The request will automatically include any authentication strategy that has been
   * configured.
   * 
   * @public
   * 
   * @async
   * 
   * @template T - Type of the expected response data. Using a generic type parameter
   * enables type-safe access to the response body and ensures proper type checking.
   * 
   * @param url - Request URL. Can be a relative path (which will be appended to the baseURL
   * if configured) or an absolute URL.
   * 
   * @param configurationMap - Additional request configuration options.
   * 
   * @returns Promise resolving to an AxiosResponse object with data of type T.
   * 
   * @throws If the request fails.
   */
  public async get<T>(
    url: string, 
    configurationMap?: Partial<Axios.AxiosXHRConfig<any>>
  ): Promise<Axios.AxiosXHR<T>> {
    return this.request<T>('GET', url, undefined, configurationMap);
  }

  /**
   * ## post
   * 
   * Performs a POST request to create new resources or submit data.
   * 
   * @description This method performs a POST request to create new resources or submit data
   * to the server. POST requests typically modify server state and may not be idempotent
   * (repeating the same request may create multiple resources).
   * 
   * Common use cases include:
   * 
   * - Creating new resources (users, products, etc.)
   * - Submitting form data
   * - Uploading files
   * - Triggering complex processing on the server
   * - Authentication (login, token requests)
   * 
   * The request will automatically include any authentication strategy that has been
   * configured.
   * 
   * @public
   * 
   * @async
   * 
   * @template T - Type of the expected response data. Using a generic type parameter
   * enables type-safe access to the response body and ensures proper type checking.
   * 
   * @param url - Request URL. Can be a relative path (which will be appended to the baseURL
   * if configured) or an absolute URL.
   * 
   * @param data - Request payload to send in the request body.
   * 
   * @param configurationMap - Additional request configuration options.
   * 
   * @returns Promise resolving to an AxiosResponse object with data of type T.
   * 
   * @throws If the request fails.
   */
  public async post<T>(
    url: string, 
    data?: unknown, 
    configuration?: Partial<Axios.AxiosXHRConfig<any>>
  ): Promise<Axios.AxiosXHR<T>> {
    return this.request<T>('POST', url, data, configuration);
  }

  /**
   * ## put
   * 
   * Performs a PUT request to update or replace existing resources.
   * 
   * @description This method performs a PUT request to update or replace existing resources
   * on the server. PUT requests are designed to be idempotent, meaning that multiple identical
   * PUT requests should have the same effect as a single request.
   * 
   * Unlike PATCH requests which perform partial updates, PUT requests typically replace
   * the entire resource with the new representation. This means you should include all
   * required fields in the request payload, not just the fields you want to update.
   * 
   * Common use cases include:
   * 
   * - Replacing an existing resource completely
   * - Creating a resource when the client specifies the ID/URI (PUT to a specific resource URL)
   * - Updating multiple fields of a resource at once
   * 
   * The request will automatically include any authentication strategy that has been
   * configured.
   * 
   * @public
   * 
   * @async
   * 
   * @template T - Type of the expected response data. Using a generic type parameter
   * enables type-safe access to the response body and ensures proper type checking.
   * 
   * @param url - Request URL. Can be a relative path (which will be appended to the baseURL
   * if configured) or an absolute URL.
   * 
   * @param data - Request payload to send in the request body.
   * 
   * @param configurationMap - Additional request configuration options.
   * 
   * @returns Promise resolving to an AxiosResponse object with data of type T.
   * 
   * @throws If the request fails.
   */
  public async put<T>(
    url: string, 
    data?: unknown, 
    configurationMap?: Partial<Axios.AxiosXHRConfig<any>>
  ): Promise<Axios.AxiosXHR<T>> {
    return this.request<T>('PUT', url, data, configurationMap);
  }

  /**
   * ## patch
   * 
   * Performs a PATCH request to partially update existing resources.
   * 
   * @description This method performs a PATCH request to partially update an existing
   * resource on the server. Unlike PUT requests which typically replace the entire resource,
   * PATCH requests only update the fields provided in the request payload, leaving other
   * fields unchanged.
   * 
   * PATCH requests are designed for making partial modifications to resources and are
   * useful when you want to update only specific fields without having to send the
   * complete resource representation.
   * 
   * Common use cases include:
   * 
   * - Updating specific fields of a resource
   * - Performing atomic operations (increment/decrement counters, add/remove elements)
   * - Making changes that depend on current state (optimistic concurrency control)
   * 
   * The request will automatically include any authentication strategy that has been
   * configured.
   * 
   * @public
   * 
   * @async
   * 
   * @template T - Type of the expected response data. Using a generic type parameter
   * enables type-safe access to the response body and ensures proper type checking.
   * 
   * @param url - Request URL. Can be a relative path (which will be appended to the baseURL
   * if configured) or an absolute URL.
   * 
   * @param data - Request payload to send in the request body.
   * 
   * @param configurationMap - Additional request configuration options.
   * 
   * @returns Promise resolving to an AxiosResponse object with data of type T.
   * 
   * @throws If the request fails.
   */
  public async patch<T>(
    url: string, 
    data?: unknown, 
    configurationMap?: Partial<Axios.AxiosXHRConfig<any>>
  ): Promise<Axios.AxiosXHR<T>> {
    return this.request<T>('PATCH', url, data, configurationMap);
  }

  /**
   * ## delete
   * 
   * Performs a DELETE request to remove resources from the server.
   * 
   * @description This method performs a DELETE request to remove a resource from the server.
   * DELETE requests are designed to be idempotent, meaning that multiple identical DELETE
   * requests should have the same effect as a single request (the resource is removed).
   * 
   * DELETE requests typically do not include a request body, although some APIs may
   * accept a body for complex delete operations or batch deletions.
   * 
   * Common use cases include:
   * 
   * - Removing a specific resource (user, product, etc.)
   * - Soft deleting a resource (marking as deleted without physical removal)
   * - Batch deletion operations with specific criteria
   * - Clearing collections or caches
   * 
   * The request will automatically include any authentication strategy that has been
   * configured.
   * 
   * @public
   * 
   * @async
   * 
   * @template T - Type of the expected response data. Using a generic type parameter
   * enables type-safe access to the response body and ensures proper type checking.
   * 
   * @param url - Request URL. Can be a relative path (which will be appended to the baseURL
   * if configured) or an absolute URL.
   * 
   * @param configurationMap - Additional request configuration options.
   * 
   * @returns Promise resolving to an AxiosResponse object with data of type T.
   * 
   * @throws If the request fails.
   */
  public async delete<T>(
    url: string, 
    configurationMap?: Partial<Axios.AxiosXHRConfig<any>>
  ): Promise<Axios.AxiosXHR<T>> {
    return this.request<T>('DELETE', url, undefined, configurationMap);
  }

  /**
   * ## head
   * 
   * Performs a HEAD request to retrieve metadata from the server.
   * 
   * @description This method performs a HEAD request to retrieve metadata from the server.
   * HEAD requests are similar to GET requests but only return the response headers without
   * the response body. This is useful for checking resource availability, content length,
   * and other metadata without downloading the full resource.
   * 
   * Common use cases include:
   * 
   * - Checking if a resource exists
   * - Retrieving metadata (content type, content length, etc.)
   * - Testing server availability
   * 
   * The request will automatically include any authentication strategy that has been
   * configured.
   * 
   * @public
   * 
   * @async
   * 
   * @template T - Type of the expected response data. Using a generic type parameter
   * enables type-safe access to the response body and ensures proper type checking.
   * 
   * @param url - Request URL. Can be a relative path (which will be appended to the baseURL
   * if configured) or an absolute URL.
   * 
   * @param configurationMap - Additional request configuration options.
   * 
   * @returns Promise resolving to an AxiosResponse object with data of type T.
   * 
   * @throws If the request fails.
   */
  public async head<T>(
    url: string, 
    configurationMap?: Partial<Axios.AxiosXHRConfig<any>>
  ): Promise<Axios.AxiosXHR<T>> {
    return this.request<T>('HEAD', url, undefined, configurationMap);
  }
}
