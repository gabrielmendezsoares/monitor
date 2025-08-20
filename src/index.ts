import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import { createRequire } from 'module';
import schedule from 'node-schedule';
import { expressiumRoute, loggerUtil, startServer, createServer } from '../expressium/index.js';
import { appRoute } from './routes/index.js';
import { monitorApplicationsService } from './services/index.js';

const require = createRequire(import.meta.url);

const helmet = require('helmet');

const MONITORING_INTERVAL = 60_000;

const createSequentialInterval = async (
  handler: () => Promise<void>, 
  interval: number
): Promise<void> => {
  const executeWithDelay = async (): Promise<void> => {
    await handler();
    setTimeout(executeWithDelay, interval).unref();
  };

  executeWithDelay();
};

const buildServer = async (): Promise<void> => {
  try {
    const app = express();

    app.use(cors());
    app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }));
    app.use(express.json());
    appRoute.buildRoutes();
    app.use('/api', expressiumRoute.router);

    app.use(
      (
        _req: Request, 
        res: Response
      ): void => {
        res
          .status(404)
          .json(
            {
              message: 'Route not found.',
              suggestion: 'Please check the URL and HTTP method to ensure they are correct.'
            }
          );
      }
    );

    const serverInstance = await createServer(app);
    
    await startServer(serverInstance as Express);

    await createSequentialInterval(
      monitorApplicationsService.monitorApplications, 
      MONITORING_INTERVAL
    );
    
    schedule.scheduleJob(
      {
        dayOfWeek: [1, 2, 3, 4, 5],
        hour: [9, 14],
        minute: 0
      },
      async (): Promise<void> => await monitorApplicationsService.monitorApplications(true) 
    );
  } catch (error: unknown) {
    loggerUtil.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

buildServer();
