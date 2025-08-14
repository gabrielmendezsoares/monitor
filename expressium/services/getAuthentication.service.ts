import { Request } from 'express';
import bcrypt from 'bcryptjs';
import JWT, { Secret } from 'jsonwebtoken';
import { StringValue } from 'ms';
import { PrismaClient } from '@prisma/client/storage/client.js';
import { IResponse, IResponseData } from '../interfaces/index.js';

const prisma = new PrismaClient();

/**
 * ## getAuthentication
 * 
 * Authenticates a user using Basic Auth and issues a signed JWT token.
 *
 * @description
 * This function validates credentials from the `Authorization` header using the Basic scheme,
 * verifies the user against the database, checks if the account is active, and generates a
 * JWT token with expiration metadata. The response includes user info, token, and expiry timestamp.
 *
 * It handles:
 * 
 * - Checking environment configuration (`JWT_SECRET`)
 * - Validating presence and format of the Authorization header
 * - Decoding and verifying Basic Auth credentials
 * - Fetching and verifying user account status
 * - Comparing passwords securely using bcrypt
 * - Calculating token expiration and signing the JWT
 * - Returning structured success or failure responses with appropriate HTTP status codes
 *
 * @param req - Express request object.
 *
 * @returns 
 * Returns a Promise that resolves to an response:
 * 
 * - Success: includes `username`, `roleList`, `token`, and `expiresIn`
 * - Error: includes `message` and `suggestion`
 */
export const getAuthentication = async (req: Request): Promise<IResponse.IResponse<IResponseData.IGetAuthenticationResponseData | IResponseData.IResponseData>> => {
  if (!process.env.JWT_SECRET) {
    return { 
      status: 500, 
      data: {
        message: 'The authentication process is temporarily unavailable.',
        suggestion: 'Please try again later or contact support if the issue persists.'
      }
    };
  }

  const reqHeadersAuthorization = req.headers.authorization;
  
  if (!reqHeadersAuthorization) {
    return {
      status: 400,
      data: {
        message: 'Missing Authorization header.',
        suggestion: 'Include an Authorization header using the Basic scheme: "Basic base64(username:password)"'
      }
    };
  }

  if (!reqHeadersAuthorization.startsWith('Basic ')) {
    return {
      status: 400,
      data: {
        message: 'Invalid Authorization scheme.',
        suggestion: 'Use the Basic authentication scheme: "Basic base64(username:password)"'
      }
    };
  }

  const [username, password] = Buffer
    .from(reqHeadersAuthorization.split(' ')[1], 'base64')
    .toString('ascii')
    .split(':');

  const user = await prisma.users.findUnique(
    {
      where: {
        application_type_username: {
          application_type: process.env.APPLICATION_TYPE as string,
          username
        }
      }
    }
  );

  if (!user) {
    return {
      status: 401,
      data: {
        message: 'Invalid username.',
        suggestion: 'Ensure the username is correct or register for an account if you don’t have one.'
      }
    };
  }
  
  if (!user.is_user_active) {
    return {
      status: 403,
      data: {
        message: 'Account is inactive.',
        suggestion: 'Contact your administrator to request account reactivation.'
      }
    };
  }
  
  if (!bcrypt.compareSync(password, new TextDecoder().decode(user.password))) {
    return {
      status: 401,
      data: {
        message: 'Incorrect password.',
        suggestion: 'Double-check your password or reset it if you’ve forgotten it.'
      }
    };
  }
  
  let expiresIn: number;
  
  const jwtExpiresInInt = parseInt((process.env.JWT_EXPIRES_IN ?? '1h').slice(0, -1));
  
  switch ((process.env.JWT_EXPIRES_IN ?? '1h').slice(-1)) {
    case 's': expiresIn = Date.now() + (jwtExpiresInInt * 1_000); break;
    case 'm': expiresIn = Date.now() + (jwtExpiresInInt * 60 * 1_000); break;
    case 'h': expiresIn = Date.now() + (jwtExpiresInInt * 60 * 60 * 1_000); break;
    case 'd': expiresIn = Date.now() + (jwtExpiresInInt * 24 * 60 * 60 * 1_000); break;
    default: expiresIn = Date.now() + (3_600 * 1_000);
  }
  
  return {
    status: 200,
    data: {
      data: {
        username,
        roleList: user.role_list,
        token: JWT.sign(
          {
            username,
            roleList: user.role_list,
            expiresIn
          },
          process.env.JWT_SECRET as Secret,
          { expiresIn: process.env.JWT_EXPIRES_IN as StringValue }
        ),
        expiresIn
      }
    }
  };
};
