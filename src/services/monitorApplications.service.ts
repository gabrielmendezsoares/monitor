import momentTimezone from 'moment-timezone';
import { PrismaClient } from '@prisma/client/storage/client.js';
import { dateTimeFormatterUtil, HttpClientUtil, BasicAndBearerStrategy } from '../../expressium/src/index.js';
import { IMonitorApplication, IMonitorApplicationHealthMap, IMonitorApplicationMap, IPerformanceDataMap } from './interfaces/index.js';

const API_GATEWAY_API_V1_GET_AUTHENTICATION_URL = `http://${ process.env.SERVER_IP as string }:3043/api/v1/get/authentication`;
const API_GATEWAY_API_v1_GET_API_DATA_MAP_URL = `http://${ process.env.SERVER_IP as string }:3043/api/v1/get/api-data-map`;

const REQUEST_TIMEOUT = 30_000;

const prisma = new PrismaClient();

const measureExecutionTime = async (handler: Function, ...argumentList: unknown[]): Promise<IPerformanceDataMap.IPerformanceDataMap> => {
  const startTime = performance.now();
  
  try {
    const response = await handler(...argumentList);
    const elapsedMiliseconds = Math.round(performance.now() - startTime);
    
    return { 
      response, 
      elapsedMiliseconds 
    };
  } catch (error: unknown) {
    const elapsedMiliseconds = Math.round(performance.now() - startTime);
    
    return { 
      response: undefined, 
      elapsedMiliseconds
    };
  }
};

const fetchMonitorApplicationHealth = async (monitorApplication: IMonitorApplication.IMonitorApplication): Promise<IMonitorApplicationHealthMap.IMonitorApplicationHealthMap> => {
  const httpClientInstance = new HttpClientUtil.HttpClient();

  httpClientInstance.setAuthenticationStrategy(
    new BasicAndBearerStrategy.BasicAndBearerStrategy(
      'get',
      API_GATEWAY_API_V1_GET_AUTHENTICATION_URL,
      process.env.API_GATEWAY_USERNAME as string,
      process.env.API_GATEWAY_PASSWORD as string,
      undefined,
      undefined,
      undefined,
      (response: Axios.AxiosXHR<any>): string => response.data.data.token,
      (response: Axios.AxiosXHR<any>): number => response.data.data.expiresIn
    )
  );

  const { 
    response, 
    elapsedMiliseconds 
  } = await measureExecutionTime((): Promise<Axios.AxiosXHR<unknown>> => httpClientInstance.post(API_GATEWAY_API_v1_GET_API_DATA_MAP_URL, { filterMap: { id: monitorApplication.apis_id } }, { timeout: REQUEST_TIMEOUT }));

  if (!response?.data?.status) {
    return { 
      isHealthy: false,
      data : {
        responseTime: {
          name: 'Tempo de resposta',
          value: `${ elapsedMiliseconds.toFixed(1) }ms`
        }
      }
    };
  }

  const api = await prisma.apis.findUnique({ where: { id: monitorApplication.apis_id } });
  
  if (!api) {
    return { 
      isHealthy: false,
      data : {
        responseTime: {
          name: 'Tempo de resposta',
          value: `${ elapsedMiliseconds.toFixed(1) }ms`
        }
      }
    };
  }

  const subResponse = response.data?.data?.[api.name];

  if (!subResponse) {
    return { 
      isHealthy: false,
      data : {
        responseTime: {
          name: 'Tempo de resposta',
          value: `${ elapsedMiliseconds.toFixed(1) }ms`
        }
      }
    };
  }
  
  if (!subResponse.monitor) {
    return { 
      isHealthy: subResponse.status,
      data : {
        responseTime: {
          name: 'Tempo de resposta',
          value: `${ elapsedMiliseconds.toFixed(1) }ms`
        }
      }
    };
  }

  return { 
    isHealthy: true,
    data : {
      ...subResponse.monitor,
      responseTime: {
        name: 'Tempo de resposta',
        value: `${ elapsedMiliseconds.toFixed(1) }ms`
      }
    }
  };
};

const formatMonitorApplicationInformation = (monitorApplication: IMonitorApplication.IMonitorApplication, statusTransitionDate: Date, healthDataMap: IMonitorApplicationHealthMap.IMonitorApplicationHealthMap): string => {
  return Object.values(healthDataMap.data).reduce(
    (accumulator: string, object: { name: string, value: unknown }): string => {
      return `${ accumulator }\n- ${ object.name }: ${ object.value }`;
    },
    `[${ monitorApplication.application_type }]\n- Desde: ${ dateTimeFormatterUtil.formatDuration((momentTimezone().utc().toDate().getTime() - statusTransitionDate.getTime()) / 60_000) }`
  );
};

const updateMonitorApplicationStatus = async (monitorApplication: IMonitorApplication.IMonitorApplication, isActive: boolean, utcDate: Date): Promise<IMonitorApplication.IMonitorApplication> => {
  return prisma.monitor_applications.update(
    {
      where: { id: monitorApplication.id },
      data: {
        is_alive: isActive,
        is_alive_transition_notified_by_monitor: true,
        is_alive_transition_at: utcDate
      }
    }
  );
};

const processMonitorApplication = async (monitorApplication: IMonitorApplication.IMonitorApplication, isPeriodicWarn?: boolean): Promise<IMonitorApplicationMap.IMonitorApplicationMap | null> => {
  try {
    const monitorApplicationHealthMap = await fetchMonitorApplicationHealth(monitorApplication);
    let monitorApplicationMap = null;
    
    if (isPeriodicWarn) {
      monitorApplicationMap = { 
        isHealthy: monitorApplication.is_alive, 
        information: formatMonitorApplicationInformation(monitorApplication, monitorApplication.is_alive_transition_at, monitorApplicationHealthMap) 
      };
    } else {
      if (monitorApplicationHealthMap.isHealthy && !monitorApplication.is_alive) {
        const utcDate = momentTimezone().utc().toDate();
  
        await updateMonitorApplicationStatus(monitorApplication, true, utcDate);
  
        monitorApplicationMap = { 
          isHealthy: true, 
          information: formatMonitorApplicationInformation(monitorApplication, utcDate, monitorApplicationHealthMap)
        };
      } else if (!monitorApplicationHealthMap.isHealthy && monitorApplication.is_alive) {
        const utcDate = momentTimezone().utc().toDate();
  
        await updateMonitorApplicationStatus(monitorApplication, false, utcDate);
  
        monitorApplicationMap = { 
          isHealthy: false, 
          information: formatMonitorApplicationInformation(monitorApplication, utcDate, monitorApplicationHealthMap)
        };
      } else if (!monitorApplication.is_alive_transition_notified_by_monitor) {
        await updateMonitorApplicationStatus(monitorApplication, monitorApplication.is_alive, monitorApplication.is_alive_transition_at);
  
        monitorApplicationMap = { 
          isHealthy: monitorApplication.is_alive, 
          information: formatMonitorApplicationInformation(monitorApplication, monitorApplication.is_alive_transition_at, monitorApplicationHealthMap) 
        };
      }
    }
    
    return monitorApplicationMap;
  } catch (error: unknown) {
    console.log(`Error | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Path: src/services/monitorApplications.service.ts | Location: processMonitorApplication | Error: ${ error instanceof Error ? error.message : String(error) }`);
   
    return null;
  }
};

const sendMonitoringReport = async (onlineMonitorApplicationMapList: string[], offlineMonitorApplicationMapList: string[]): Promise<void> => {
  if (onlineMonitorApplicationMapList.length === 0 && offlineMonitorApplicationMapList.length === 0) {
    return;
  }

  const httpClientInstance = new HttpClientUtil.HttpClient();

  const messageList = [
    '📌 *MONITOR DE SERVIÇOS* 📌',
    onlineMonitorApplicationMapList.length > 0  ? `\n\n🟢 *DISPONÍVEIS (${ onlineMonitorApplicationMapList.length })* 🟢\n\n${ onlineMonitorApplicationMapList.join('\n\n') }` : '',
    offlineMonitorApplicationMapList.length > 0 ? `\n\n🔴 *INDISPONÍVEIS (${ offlineMonitorApplicationMapList.length })* 🔴\n\n${ offlineMonitorApplicationMapList.join('\n\n') }` : '',
    `\n\n🌐 *Servidor:* ${ process.env.SERVER_IP as string }`,
    `\n📊 *Total monitorado:* ${ onlineMonitorApplicationMapList.length + offlineMonitorApplicationMapList.length }`
  ];
  
  try {
    await httpClientInstance.post(
      `https://v5.chatpro.com.br/${ process.env.CHAT_PRO_INSTANCE_ID }/api/v1/send_message`,
      {
        message: messageList.join(''),
        number: process.env.CHAT_PRO_NUMBER
      },
      { 
        headers: { Authorization: process.env.CHAT_PRO_BEARER_TOKEN },
        params: { instance_id: process.env.CHAT_PRO_INSTANCE_ID }
      }
    );
  } catch (error: unknown) {
    console.log(`Error | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Path: src/services/monitorApplications.service.ts | Location: sendMonitoringReport | Error: ${ error instanceof Error ? error.message : String(error) }`);
  }
};

export const monitorApplications = async (isPeriodicWarn?: boolean): Promise<void> => {
  try {
    const monitorApplicationList = await prisma.monitor_applications.findMany({ where: { is_monitor_application_active: true } });
    const monitorApplicationMapList = await Promise.all(monitorApplicationList.map(async (monitorApplication: IMonitorApplication.IMonitorApplication): Promise<IMonitorApplicationMap.IMonitorApplicationMap | null> => await processMonitorApplication(monitorApplication, isPeriodicWarn)));
    const monitorApplicationMapFilteredList = monitorApplicationMapList.filter((monitorApplicationMap: IMonitorApplicationMap.IMonitorApplicationMap | null): boolean => monitorApplicationMap !== null) as IMonitorApplicationMap.IMonitorApplicationMap[];
    const onlineMonitorApplicationMapList = monitorApplicationMapFilteredList.filter((monitorApplicationMap: IMonitorApplicationMap.IMonitorApplicationMap): boolean => monitorApplicationMap.isHealthy).map((monitorApplicationMap: IMonitorApplicationMap.IMonitorApplicationMap): string => monitorApplicationMap.information);
    const offlineMonitorApplicationMapList = monitorApplicationMapFilteredList.filter((monitorApplicationMap: IMonitorApplicationMap.IMonitorApplicationMap): boolean => !monitorApplicationMap.isHealthy).map((monitorApplicationMap: IMonitorApplicationMap.IMonitorApplicationMap): string => monitorApplicationMap.information);
    
    await sendMonitoringReport(onlineMonitorApplicationMapList, offlineMonitorApplicationMapList);
  } catch (error: unknown) {
    console.log(`Error | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Path: src/services/monitorApplications.service.ts | Location: monitorApplications | Error: ${ error instanceof Error ? error.message : String(error) }`);
  }
};
