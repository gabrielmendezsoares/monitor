import { IAuthenticationStrategy } from './interfaces/index.js';

/**
 * ## BasicStrategy
 * 
 * Simple authentication strategy that adds basic credentials to the request configuration.
 * 
 * @description The BasicStrategy class provides a straightforward authentication strategy
 * for APIs that require basic authentication (username and password).
 * 
 * Key features:
 * 
 * - Adds username and password to request configuration
 * - Automatically generates base64-encoded Authorization header
 * - Leverages Axios built-in basic authentication handling
 * - Stateless implementation with no token lifecycle management
 * 
 * Particularly useful for APIs that:
 * 
 * - Accept standard HTTP Basic Authentication
 * - Require simple credential-based authentication
 * - Don't implement token-based systems
 * 
 * @method authenticate - Authenticates the request by adding basic credentials to the configuration.
 */
export class BasicStrategy implements IAuthenticationStrategy.IAuthenticationStrategy {
  /**
   * ## constructor
   * 
   * Creates a new BasicStrategy instance.
   * 
   * @description Initializes the username and password for basic authentication credentials.
   * These credentials will be used to generate the appropriate Authorization header.
   * 
   * @public
   * 
   * @constructor
   * 
   * @param username - The username for basic authentication. This value will be encoded in the Authorization header.
   * @param password - The password for basic authentication. This value will be encoded in the Authorization header.
   * 
   * @throws If username or password are invalid or empty.
   */
  public constructor(
    /**
     * @private
     * @readonly
     */
    private readonly username: string,

    /**
     * @private
     * @readonly
     */
    private readonly password: string
  ) {}

  /**
   * ## authenticate
   * 
   * Authenticates the request by adding basic credentials to the configuration.
   * 
   * @description Adds the basic credentials to the request configuration's 'auth' property.
   * 
   * This method:
   * 
   * 1. Preserves existing configuration properties
   * 2. Adds the auth property with username and password
   * 3. Enables Axios to automatically generate the Authorization header
   * 
   * Follows HTTP Basic Authentication specification (RFC 7617).
   * 
   * @public
   * 
   * @param configurationMap - Axios request configuration to modify.
   * 
   * @returns Modified request configuration with the basic credentials added.
   */
  public authenticate(configurationMap: Axios.AxiosXHRConfig<any>): Axios.AxiosXHRConfig<any> {
    return {
      ...configurationMap,
      auth: {
        username: this.username,
        password: this.password
      }
    };
  }
}
