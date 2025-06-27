export interface IMonitorApplicationHealthMap {
  isHealthy: boolean;
  data: {
    responseTime: {
      name: string;
      value: string;
    };
  };
}
