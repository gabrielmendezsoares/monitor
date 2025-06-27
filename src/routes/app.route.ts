import { NextFunction, Request, Response } from 'express';
import momentTimezone from 'moment-timezone';
import { generateRoute, router, IRouteMap } from '../../expressium/src/index.js';
import { appService } from "../services/index.js";

export const buildRoutes = (): void => {
  try {
    generateRoute(
      {
       method: 'get',
        version: 'v1',
        url: 'get/health',
        serviceHandler: appService.getHealth,
        requiresAuthorization: true
      } as IRouteMap.IRouteMap
    );

    router.use(
      (
        req: Request, 
        res: Response, 
        _next: NextFunction
      ): void => {
        res
          .status(404)
          .json(
            {
              timestamp: momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss'),
              status: false,
              statusCode: 404,
              method: req.method,
              path: req.originalUrl || req.url,
              query: req.query,
              headers: req.headers,
              body: req.body,
              message: 'Route not found.',
              suggestion: 'Please check the URL and HTTP method to ensure they are correct.'
            }
          );
      }
    );
  } catch (error: unknown) {
    console.log(`Error | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Path: src/routes/app.route.ts | Location: buildRoutes | Error: ${ error instanceof Error ? error.message : String(error) }`);
    process.exit(1);
  }
};
