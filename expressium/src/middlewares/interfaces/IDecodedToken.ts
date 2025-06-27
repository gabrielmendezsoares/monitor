import JWT from 'jsonwebtoken';

/**
 * ## IDecodedToken
 * 
 * Interface for JWT token payload after successful verification and decoding.
 * 
 * @description This interface extends the JWT.JwtPayload interface from jsonwebtoken library
 * with application-specific claims required for authentication and authorization.
 * 
 * It contains:
 * 
 * - `username`: The unique identifier for the authenticated user
 * - `roleList`: Array of role identifiers assigned to the user for permission checks
 * - `expiresIn`: Number representing token expiration time (likely in seconds)
 * 
 * These properties, combined with standard JWT claims (iat, exp, sub, etc.), provide
 * all necessary information for access control decisions throughout the application.
 */
export interface IDecodedToken extends JWT.JwtPayload {
  username: string;
  roleList: string[];
  expiresIn: number;
}
