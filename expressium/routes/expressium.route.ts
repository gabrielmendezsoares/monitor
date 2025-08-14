import { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import YAML from 'yamljs';
import { getAuthenticationController } from '../controllers/index.js';
import { getAuthorizationMiddleware } from '../middlewares/index.js';
import { projectUtil } from '../utils/index.js';
import { IResponse, IResponseData } from '../interfaces/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT_DIRECTORY = await projectUtil.findProjectRootDirectory(__dirname);

/**
 * ## router
 *
 * Central Express router instance for API endpoints.
 *
 * @description
 * This router serves as the main entry point for all registered application routes.
 * Routes are registered using `generateRoute()` to enforce a consistent structure,
 * versioning, and middleware integration across the API surface.
 */
export const router = Router();

/**
 * ## generateRoute
 *
 * Registers an API route on the central router with optional middleware and authorization.
 *
 * @description
 * Dynamically attaches an API endpoint to the main Express router. Supports optional
 * role-based authorization and middleware chaining. Common usage includes versioned
 * routing and route-level permissions enforcement.
 *
 * It handles:
 *
 * - HTTP method and path registration
 * - Optional ordered application of custom middleware
 * - Final controller execution as route handler
 * - Optional authorization using JWT middleware
 * - Optional role enforcement
 *
 * @param method - HTTP verb as string (`'get'`, `'post'`, `'put'`, etc.).
 * @param url - Full route path, including version if applicable (e.g., `'v1/resource'`).
 * @param middlewareRequestHandlerList - Optional list of Express middleware to apply in order.
 * @param mainRequestHandler - Final route handler that executes business logic.
 * @param requiresAuthorization - Whether the route requires JWT authorization (default: false).
 * @param roleList - Optional array of roles required to access the route.
 */
export const generateRoute = (
  method: string,
  url: string,
  middlewareRequestHandlerList: RequestHandler[] = [],
  mainRequestHandler: RequestHandler,
  requiresAuthorization: boolean = false,
  roleList?: string[]
): void => {
  if (requiresAuthorization) {
    middlewareRequestHandlerList.unshift(
      (
        req: Request, 
        res: Response, 
        next: NextFunction
      ): Promise<IResponse.IResponse<IResponseData.IResponseData> | void> => {
        return getAuthorizationMiddleware.getAuthorization(req, res, next, roleList);
      }
    );
  }

  (router as any)[method](url, ...middlewareRequestHandlerList, mainRequestHandler);
};

const swaggerDocument = YAML.load(`${ PROJECT_ROOT_DIRECTORY }/swagger.yml`);

generateRoute(
  'use',
  '/documentation',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument)
);

generateRoute(
  'get',
  '/v1/get/authentication',
  [],
  getAuthenticationController.getAuthentication
);
