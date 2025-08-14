import { JsonValue } from "@prisma/client/runtime/library";

/**
 * ## IResponseData
 * 
 * Basic structure for API error or informational messages.
 *
 * @description
 * Used in responses that convey human-readable messages and optional suggestions, particularly
 * in error handling scenarios (e.g., 400, 404, 500). Helps provide meaningful client feedback
 * when a request cannot be fulfilled as expected.
 */
export interface IResponseData {
  message: string;
  suggestion: string;
}

/**
 * ## IGetAuthenticationResponseData
 * 
 * Structure of payload returned upon successful authentication.
 *
 * @description
 * Returned by authentication endpoints after verifying credentials. Encapsulates
 * user identity details, assigned roles (stored as a `JsonValue`), a signed JWT token,
 * and token expiration time. Used by clients to initiate authenticated sessions.
 */
export interface IGetAuthenticationResponseData {
  data: {
    username: string;
    roleList: JsonValue;
    token: string;
    expiresIn: number;
  };
}
