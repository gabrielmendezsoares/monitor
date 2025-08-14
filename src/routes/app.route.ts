import { expressiumRoute, loggerUtil } from '../../expressium/index.js';
import { getHealthController } from '../controllers/index.js';

export const buildRoutes = (): void => {
  try {
    expressiumRoute.generateRoute(
      'get',
      '/v1/get/health',
      [],
      getHealthController.getHealth,
      true
    );
  } catch (error: unknown) {
    loggerUtil.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};
