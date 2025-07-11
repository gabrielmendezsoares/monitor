import momentTimezone from 'moment-timezone';
import { PrismaClient } from '@prisma/client/storage/client.js';
import { dateTimeFormatterUtil, HttpClientUtil, BasicAndBearerStrategy } from '../../expressium/src/index.js';
import { IMonitorApplication, IMonitorApplicationHealthMap, IMonitorApplicationMap, IPerformanceDataMap } from './interfaces/index.js';

const API_GATEWAY_API_V1_GET_AUTHENTICATION_URL = `http://${ process.env.SERVER_IP as string }:3043/api/v1/get/authentication`;
const API_GATEWAY_API_v1_GET_API_DATA_MAP_URL = `http://${ process.env.SERVER_IP as string }:3043/api/v1/get/api-data-map`;

const REQUEST_TIMEOUT = 60_000;

const prisma = new PrismaClient();

const measureExecutionTime = async (
  handler: Function, 
  ...argumentList: unknown[]
): Promise<IPerformanceDataMap.IPerformanceDataMap> => {
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

const fetchMonitorApplicationHealthMap = async (monitorApplication: IMonitorApplication.IMonitorApplication): Promise<IMonitorApplicationHealthMap.IMonitorApplicationHealthMap> => {
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

const formatMonitorApplicationInformation = (
  monitorApplication: IMonitorApplication.IMonitorApplication, 
  monitorApplicationHealthMap: IMonitorApplicationHealthMap.IMonitorApplicationHealthMap,
  isAliveTransitionAt: Date
): string => {
  return Object.values(monitorApplicationHealthMap.data).reduce(
    (accumulator: string, object: { name: string, value: unknown }): string => `${ accumulator }\n- ${ object.name }: ${ object.value }`,
    `[${ monitorApplication.application_type }]\n- Desde: ${ dateTimeFormatterUtil.formatDuration((momentTimezone().utc().toDate().getTime() - isAliveTransitionAt.getTime()) / 60_000) }`
  );
};

const updateMonitorApplicationAliveStatus = async (
  monitorApplication: IMonitorApplication.IMonitorApplication, 
  isAlive: boolean, 
  isAliveTransitionAt: Date
): Promise<IMonitorApplication.IMonitorApplication> => {
  return prisma.monitor_applications.update(
    {
      where: { id: monitorApplication.id },
      data: {
        is_alive: isAlive,
        is_alive_transition_notified_by_monitor: true,
        is_alive_transition_at: isAliveTransitionAt
      }
    }
  );
};

const processMonitorApplication = async (
  monitorApplication: IMonitorApplication.IMonitorApplication, 
  isPeriodicWarn?: boolean
): Promise<IMonitorApplicationMap.IMonitorApplicationMap | null> => {
  try {
    const monitorApplicationHealthMap = await fetchMonitorApplicationHealthMap(monitorApplication);

    let monitorApplicationMap = null;
    
    if (isPeriodicWarn) {
      monitorApplicationMap = { 
        isHealthy: monitorApplication.is_alive, 
        information: formatMonitorApplicationInformation(monitorApplication, monitorApplicationHealthMap, monitorApplication.is_alive_transition_at) 
      };
    } else {
      if (monitorApplicationHealthMap.isHealthy && !monitorApplication.is_alive) {
        const isAliveTransitionAt = momentTimezone().utc().toDate();
  
        await updateMonitorApplicationAliveStatus(monitorApplication, true, isAliveTransitionAt);
  
        monitorApplicationMap = { 
          isHealthy: true, 
          information: formatMonitorApplicationInformation(monitorApplication, monitorApplicationHealthMap, isAliveTransitionAt)
        };
      } else if (!monitorApplicationHealthMap.isHealthy && monitorApplication.is_alive) {
        const isAliveTransitionAt = momentTimezone().utc().toDate();
  
        await updateMonitorApplicationAliveStatus(monitorApplication, false, isAliveTransitionAt);
  
        monitorApplicationMap = { 
          isHealthy: false, 
          information: formatMonitorApplicationInformation(monitorApplication, monitorApplicationHealthMap, isAliveTransitionAt)
        };
      } else if (!monitorApplication.is_alive_transition_notified_by_monitor) {
        await updateMonitorApplicationAliveStatus(monitorApplication, monitorApplication.is_alive, monitorApplication.is_alive_transition_at);
  
        monitorApplicationMap = { 
          isHealthy: monitorApplication.is_alive, 
          information: formatMonitorApplicationInformation(monitorApplication, monitorApplicationHealthMap, monitorApplication.is_alive_transition_at) 
        };
      }
    }
    
    return monitorApplicationMap;
  } catch (error: unknown) {
    console.log(`Error | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Path: src/services/monitorApplications.service.ts | Location: processMonitorApplication | Error: ${ error instanceof Error ? error.message : String(error) }`);
   
    return null;
  }
};

const sendMonitoringReport = async (
  monitorApplicationMapInformationOnlineList: string[], 
  monitorApplicationMapInformationOfflineList: string[]
): Promise<void> => {
  if (monitorApplicationMapInformationOnlineList.length === 0 && monitorApplicationMapInformationOfflineList.length === 0) {
    return;
  }

  const httpClientInstance = new HttpClientUtil.HttpClient();

  const messageList = [
    '📌 *MONITOR DE SERVIÇOS* 📌',
    monitorApplicationMapInformationOnlineList.length > 0  ? `\n\n🟢 *DISPONÍVEIS (${ monitorApplicationMapInformationOnlineList.length })* 🟢\n\n${ monitorApplicationMapInformationOnlineList.join('\n\n') }` : '',
    monitorApplicationMapInformationOfflineList.length > 0 ? `\n\n🔴 *INDISPONÍVEIS (${ monitorApplicationMapInformationOfflineList.length })* 🔴\n\n${ monitorApplicationMapInformationOfflineList.join('\n\n') }` : '',
    `\n\n🌐 *Servidor:* ${ process.env.SERVER_IP as string }`,
    `\n📊 *Total monitorado:* ${ monitorApplicationMapInformationOnlineList.length + monitorApplicationMapInformationOfflineList.length }`
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
    const monitorApplicationMapInformationOnlineList = monitorApplicationMapFilteredList.filter((monitorApplicationMap: IMonitorApplicationMap.IMonitorApplicationMap): boolean => monitorApplicationMap.isHealthy).map((monitorApplicationMap: IMonitorApplicationMap.IMonitorApplicationMap): string => monitorApplicationMap.information);
    const monitorApplicationMapInformationOfflineList = monitorApplicationMapFilteredList.filter((monitorApplicationMap: IMonitorApplicationMap.IMonitorApplicationMap): boolean => !monitorApplicationMap.isHealthy).map((monitorApplicationMap: IMonitorApplicationMap.IMonitorApplicationMap): string => monitorApplicationMap.information);
    
    await sendMonitoringReport(monitorApplicationMapInformationOnlineList, monitorApplicationMapInformationOfflineList);
  } catch (error: unknown) {
    console.log(`Error | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Path: src/services/monitorApplications.service.ts | Location: monitorApplications | Error: ${ error instanceof Error ? error.message : String(error) }`);
  }
};
