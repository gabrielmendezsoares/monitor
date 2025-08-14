import JWT from 'jsonwebtoken';

/**
 * ## IDecodedTokenMap
 * 
 * Structure for decoded JWT payloads used in authentication.
 *
 * @description
 * Extends the base `JwtPayload` from the `jsonwebtoken` library to include
 * custom application-specific fields commonly embedded in access tokens.
 *
 * Used after JWT verification to provide strong typing for user-related claims
 * within the decoded token, such as identity and access roles.
 *
 * Fields:
 * 
 * - `username`: Unique identifier of the authenticated user.
 * - `roleList`: List of roles assigned to the user.
 * - `expiresIn`: Token expiration time in milliseconds.
 */
export interface IDecodedTokenMap extends JWT.JwtPayload {
  username: string;
  roleList: string[];
  expiresIn: number;
}
