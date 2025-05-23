export interface IApplicationHealthMap {
  isHealthy: boolean;
  data: {
    cpuUsage?: {
      name: string;
      value: string;
    };
    memoryUsage?: {
      name: string;
      value: string;
    };
    responseTime: {
      name: string;
      value: string;
    };
  };
}
