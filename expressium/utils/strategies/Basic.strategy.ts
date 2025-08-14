import { IAuthenticationStrategy } from './interfaces/index.js';

/**
 * ## BasicStrategy
 * 
 * Stateless strategy that appends basic credentials (username/password) to a request.
 * 
 * @description
 * Implements HTTP Basic Authentication by attaching the provided credentials
 * to the `auth` property of the request config, which Axios uses to generate the `Authorization` header.
 * 
 * Suitable for APIs that:
 * 
 * - Require HTTP Basic Auth (RFC 7617)
 * - Expect credentials per request
 * - Do not use session tokens or OAuth flows
 * 
 * @method authenticate - Injects credentials via Axios `auth` configuration.
 */
export class BasicStrategy implements IAuthenticationStrategy.IAuthenticationStrategy {
  /**
   * ## constructor
   * 
   * Initializes a new BasicStrategy instance.
   * 
   * @description
   * Accepts a username and password, which are used to populate the Axios `auth` field.
   * Axios will automatically encode them and set the `Authorization` header.
   * 
   * @param username - The username for basic authentication.
   * @param password - The password associated with the given username.
   * 
   * @throws
   * Error if either username or password is invalid or missing.
   */
  public constructor(
    private readonly username: string,
    private readonly password: string
  ) {}

  /**
   * ## authenticate
   * 
   * Injects basic authentication credentials into the request config.
   * 
   * @description
   * Assigns the username and password to the `auth` field in the request config.
   * Axios will handle encoding and header generation (e.g., `Authorization: Basic <base64>`).
   * 
   * @param configurationMap - Axios request configuration to modify.
   * 
   * @returns
   * Updated Axios config including basic auth credentials.
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
