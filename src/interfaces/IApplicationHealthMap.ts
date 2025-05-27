export interface IApplicationHealthMap {
  isHealthy: boolean;
  data: {
    responseTime: {
      name: string;
      value: string;
    };
  };
}
