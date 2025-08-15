export interface IResponseData {
  message: string;
  suggestion: string;
}

export interface IGetHealthResponseData {
  monitor: {
    cpuUsage: {
      name: string;
      value: string;
      isListeningModifiedEvent?: boolean;
    };
    memoryUsage: {
      name: string;
      value: string;
      isListeningModifiedEvent?: boolean;
    };
    port: {
      name: string;
      value: string;
      isListeningModifiedEvent?: boolean;
    };
    logLevel: {
      name: string;
      value: string;
      isListeningModifiedEvent?: boolean;
    };
  };
}
