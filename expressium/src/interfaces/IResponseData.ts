import { JsonValue } from "@prisma/client/runtime/library";

/**
 * ## IResponseData
 * 
 * Standard structure for HTTP response data objects.
 * 
 * @description Defines a consistent format for API responses with comprehensive
 * request context and operation metadata.
 * 
 * Properties:
 * 
 * - `timestamp`: When the response was generated
 * - `status`: Boolean indicating operation success
 * - `statusCode`: HTTP status code
 * - `method`: HTTP method used (GET, POST, etc.)
 * - `path`: Endpoint path accessed
 * - `query`: URL query parameters received
 * - `headers`: HTTP headers received
 * - `body`: Request body data received
 * - `message`: Human-readable status/result message
 * - `suggestion`: Optional guidance for the client
 */
export interface IResponseData {
  timestamp: string;
  status: boolean;
  statusCode: number;
  method: string;
  path: string;
  query: Record<string, any>;
  headers: Record<string, any>;
  body: any;
  message: string;
  suggestion: string;
}

/**
 * ## IGetAuthenticationResponseData
 * 
 * Specialized response structure for authentication operations.
 * 
 * @description Extends the standard response pattern with authentication-specific
 * data in a nested `data` object.
 * 
 * Contains standard response fields plus a `data` object with:
 * 
 * - `username`: Authenticated user identifier
 * - `roleList`: User roles stored as Prisma JsonValue
 * - `token`: JWT authentication token for subsequent requests
 * - `expiresIn`: Token expiration time information
 */
export interface IGetAuthenticationResponseData {
  timestamp: string;
  status: boolean;
  statusCode: number;
  method: string;
  path: string;
  query: Record<string, any>;
  headers: Record<string, any>;
  body: any;
  data: {
    username: string;
    roleList: JsonValue;
    token: string;
    expiresIn: number;
  };
}
