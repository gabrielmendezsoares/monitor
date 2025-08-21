import momentTimezone from 'moment-timezone';
import { isDeepEqual, isObjectType } from 'remeda';
import { monitor_applications, PrismaClient } from '@prisma/client/storage/client.js';
import { InputJsonObject } from '@prisma/client/storage/runtime/library.js';
import { HttpClientUtil, loggerUtil, BasicAndBearerStrategy } from '../../expressium/index.js';
import { IMonitorApplicationHealthMap, IMonitorApplicationMap, IMonitorApplicationMessageMap, IPerformanceDataMap, IProperty } from './interfaces/index.js';

const SERVER_IP = process.env.SERVER_IP ?? '127.0.0.1';
const API_GATEWAY_API_V1_GET_AUTHENTICATION_URL = `http://${ SERVER_IP }:3043/api/v1/get/authentication`;
const API_GATEWAY_API_V1_CREATE_API_DATA_URL = `http://${ SERVER_IP }:3043/api/v1/create/api-data`;
const REQUEST_TIMEOUT = 60_000;

const prisma = new PrismaClient();

const measureExecutionTime = async (
  handler: Function, 
  ...argumentList: unknown[]
): Promise<IPerformanceDataMap.IPerformanceDataMap> => {
  const startTime = performance.now();
  
  try {
    const response = await handler(...argumentList);
    
    return { 
      response, 
      elapsedMiliseconds: Math.round(performance.now() - startTime)
    };
  } catch {
    return { elapsedMiliseconds: Math.round(performance.now() - startTime) };
  }
};

const fetchMonitorApplicationHealthMap = async (monitorApplication: monitor_applications): Promise<IMonitorApplicationHealthMap.IMonitorApplicationHealthMap> => {
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
  } = await measureExecutionTime(
    (): Promise<Axios.AxiosXHR<unknown>> => {
      return httpClientInstance.post(
        API_GATEWAY_API_V1_CREATE_API_DATA_URL, 
        { filterMap: { id: monitorApplication.api_gateway_api_id } }, 
        { timeout: REQUEST_TIMEOUT }
      );
    }
  );

  const defaultRetentionMap = {
    responseTime: {
      name: 'Tempo de resposta',
      value: `${ elapsedMiliseconds.toFixed(1) }ms`
    }
  };

  if (!response?.data?.data) {
    return { 
      isHealthy: false,
      propertyRetentionMap: defaultRetentionMap
    };
  }

  const api = await prisma.api_gateway_apis.findUnique({ where: { id: monitorApplication.api_gateway_api_id } });
  const subResponse = api ? response.data.data[api.name] : null;
  const subResponseDataMonitor = subResponse?.data?.monitor as Record<string, IProperty.IProperty> | undefined;

  if (!isObjectType(subResponseDataMonitor)) {
    return { 
      isHealthy: subResponse.status,
      propertyRetentionMap: defaultRetentionMap
    };
  }

  const monitorApplicationResponseMap = monitorApplication.response_map as Record<string, IProperty.IProperty> | null;
  const subResponseDataMonitorKeySet = new Set(Object.keys(subResponseDataMonitor));
  const monitorApplicationResponseMapKeySet = monitorApplicationResponseMap ? new Set(Object.keys(monitorApplicationResponseMap)) : null;
  const propertyAddedMap: Record<string, IProperty.IProperty> = {};
  const propertyModifiedMap: Record<string, IProperty.IProperty> = {};
  
  subResponseDataMonitorKeySet.forEach(
    (key: string): void => {
      const newProperty = subResponseDataMonitor[key];

      if (!monitorApplicationResponseMapKeySet?.has(key)) {
        propertyAddedMap[key] = newProperty;
      } else if (
        isObjectType(newProperty) &&
        newProperty.value !== undefined &&
        newProperty.isListeningModifiedEvent
      ) {
        const oldProperty = monitorApplicationResponseMap?.[key];
      
        if (
          isObjectType(newProperty.value) && 
          isObjectType(oldProperty?.value)
            ? !isDeepEqual(newProperty.value, oldProperty.value)
            : newProperty.value !== oldProperty?.value
        ) {
          propertyModifiedMap[key] = newProperty;
        }
      }
    }
  );

  const propertyRemovedSet = new Set<string>();

  monitorApplicationResponseMapKeySet?.forEach(
    (key: string): void => {
      if (!subResponseDataMonitorKeySet.has(key)) {
        propertyRemovedSet.add(key);
      }
    }
  );

  const propertyRetentionMap: Record<string, IProperty.IProperty> = {
    ...Object.fromEntries(
      [...subResponseDataMonitorKeySet]
        .filter((key: string): boolean => !propertyAddedMap[key] && !propertyModifiedMap[key] && !propertyRemovedSet.has(key))
        .map((key: string): [string, IProperty.IProperty] => [key, subResponseDataMonitor[key]])
    ),
    ...defaultRetentionMap
  };

  return { 
    isHealthy: true,
    responseMap: subResponseDataMonitor,
    propertyAddedMap,
    propertyModifiedMap,
    propertyRemovedSet,
    propertyRetentionMap
  };
};

const updateMonitorApplication = async (
  monitorApplication: monitor_applications, 
  isAlive: boolean, 
  isAliveTransitionAt: Date,
  updatedAt: Date,
  responseMap?: InputJsonObject
): Promise<void> => {
  await prisma.monitor_applications.update(
    {
      where: { id: monitorApplication.id },
      data: {
        response_map: responseMap,
        is_alive: isAlive,
        is_alive_transition_at: isAliveTransitionAt,
        updated_at: updatedAt
      }
    }
  );
};

const formatDuration = (totalMinutes: number): string => {
  totalMinutes = Math.floor(totalMinutes);

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes / 60) % 24);
  const minutes = Math.floor(totalMinutes % 60);

  const partList = [
    days > 0 && `${ days }d`,
    hours > 0 && `${ hours }h`,
    minutes > 0 && `${ minutes }m`
  ].filter(Boolean);

  return partList.length ? partList.join(" ") : "0m";
};

const formatMonitorApplicationMessageMap = (
  monitorApplication: monitor_applications, 
  monitorApplicationHealthMap: IMonitorApplicationHealthMap.IMonitorApplicationHealthMap,
  isAliveTransitionAt?: Date
): IMonitorApplicationMessageMap.IMonitorApplicationMessageMap => {
  const messagePrefix = `[${ monitorApplication.application_type }]`;

  const propertyRetentionMessagePrefix = isAliveTransitionAt 
    ? `${ messagePrefix }\n= Desde: _${ formatDuration((momentTimezone().utc().toDate().getTime() - isAliveTransitionAt.getTime()) / 60_000) }_` 
    : messagePrefix;

  return {
    propertyAddedMessage: monitorApplicationHealthMap.propertyAddedMap && Object.keys(monitorApplicationHealthMap.propertyAddedMap).length
      ? Object
          .values(monitorApplicationHealthMap.propertyAddedMap)
          .reduce((accumulator: string, property: IProperty.IProperty): string => `${ accumulator }\n+ ${ property.name }: _${ property.value }_`, messagePrefix)
      : undefined,
    propertyModifiedMessage: monitorApplicationHealthMap.propertyModifiedMap && Object.keys(monitorApplicationHealthMap.propertyModifiedMap).length
      ? Object
          .values(monitorApplicationHealthMap.propertyModifiedMap)
          .reduce((accumulator: string, property: IProperty.IProperty): string => `${ accumulator }\n~ ${ property.name }: _${ property.value }_`, messagePrefix)
      : undefined,
    propertyRemovedMessage: monitorApplicationHealthMap.propertyRemovedSet && monitorApplicationHealthMap.propertyRemovedSet.size
      ? Array
          .from(monitorApplicationHealthMap.propertyRemovedSet)
          .reduce((accumulator: string, name: string): string => `${ accumulator }\n- ${ name }`, messagePrefix)
      : undefined,
    propertyRetentionMessage: Object
      .values(monitorApplicationHealthMap.propertyRetentionMap)
      .reduce((accumulator: string, property: IProperty.IProperty): string => `${ accumulator }\n= ${ property.name }: _${ property.value }_`, propertyRetentionMessagePrefix)
  };
};

const processMonitorApplication = async (
  monitorApplication: monitor_applications, 
  isPeriodicWarn?: boolean
): Promise<IMonitorApplicationMap.IMonitorApplicationMap | null> => {
  try {
    const monitorApplicationHealthMap = await fetchMonitorApplicationHealthMap(monitorApplication);
    const isAliveTransitioned = monitorApplicationHealthMap.isHealthy !== monitorApplication.is_alive;
    const hasPropertyAdded = !!(monitorApplicationHealthMap.propertyAddedMap && Object.keys(monitorApplicationHealthMap.propertyAddedMap).length);
    const hasPropertyModified = !!(monitorApplicationHealthMap.propertyModifiedMap && Object.keys(monitorApplicationHealthMap.propertyModifiedMap).length);
    const hasPropertyRemoved = !!(monitorApplicationHealthMap.propertyRemovedSet && monitorApplicationHealthMap.propertyRemovedSet.size);

    if (
      isPeriodicWarn ||
      isAliveTransitioned || 
      hasPropertyAdded ||
      hasPropertyModified ||
      hasPropertyRemoved
    ) {
      let isHealthy = monitorApplication.is_alive;
      let isAliveTransitionAt = monitorApplication.is_alive_transition_at;

      const updatedAt = momentTimezone().utc().toDate();
  
      if (isAliveTransitioned) {
        isHealthy = monitorApplicationHealthMap.isHealthy;
        isAliveTransitionAt = isAliveTransitioned ? updatedAt : monitorApplication.is_alive_transition_at;
      }

      await updateMonitorApplication(
        monitorApplication, 
        isHealthy, 
        isAliveTransitionAt,
        updatedAt,
        monitorApplicationHealthMap.responseMap as InputJsonObject | undefined
      );

      return {
        isHealthy,
        messageMap: formatMonitorApplicationMessageMap(
          monitorApplication,
          monitorApplicationHealthMap,
          isPeriodicWarn || isAliveTransitioned ? isAliveTransitionAt : undefined
        )
      };
    }

    return null;
  } catch (error: unknown) {
    loggerUtil.error(error instanceof Error ? error.message : String(error));
   
    return null;
  }
};

const sendApplicationMonitoringReport = async ( 
  serviceOnlineMessageList: string[],
  serviceOfflineMessageList: string[],
  propertyAddedMessageList: string[], 
  propertyModifiedMessageList: string[],
  propertyRemovedMessageList: string[]
): Promise<void> => {
  if (
    !serviceOnlineMessageList.length &&
    !serviceOfflineMessageList.length &&
    !propertyAddedMessageList.length &&
    !propertyModifiedMessageList.length &&
    !propertyRemovedMessageList.length
  ) {
    return;
  }

  const httpClientInstance = new HttpClientUtil.HttpClient();

  const message = [
    '📌 *MONITOR DE SERVIÇOS* 📌',
    serviceOnlineMessageList.length > 0  && `\n\n⚡ *SERVIÇO ONLINE (${ serviceOnlineMessageList.length })* ⚡\n\n${ serviceOnlineMessageList.join('\n\n') }`,
    serviceOfflineMessageList.length > 0 && `\n\n💤 *SERVIÇO OFFLINE (${ serviceOfflineMessageList.length })* 💤\n\n${ serviceOfflineMessageList.join('\n\n') }`,
    propertyAddedMessageList.length > 0 && `\n\n🔼 *PROP. ADICIONADA (${ propertyAddedMessageList.length })* 🔼\n\n${ propertyAddedMessageList.join('\n\n') }`,
    propertyModifiedMessageList.length > 0 && `\n\n🔄 *PROP. MODIFICADA (${ propertyModifiedMessageList.length })* 🔄\n\n${ propertyModifiedMessageList.join('\n\n') }`,
    propertyRemovedMessageList.length > 0 && `\n\n🔽 *PROP. REMOVIDA (${ propertyRemovedMessageList.length })* 🔽\n\n${ propertyRemovedMessageList.join('\n\n') }`,
    `\n\n🌐 *Servidor*: _${ SERVER_IP }_`
  ].filter(Boolean).join('');
  
  await httpClientInstance.post(
    `https://v5.chatpro.com.br/${ process.env.CHAT_PRO_INSTANCE_ID }/api/v1/send_message`,
    {
      message: message,
      number: process.env.CHAT_PRO_NUMBER
    },
    { 
      headers: { Authorization: process.env.CHAT_PRO_BEARER_TOKEN },
      params: { instance_id: process.env.CHAT_PRO_INSTANCE_ID }
    }
  );
};

export const monitorApplications = async (isPeriodicWarn?: boolean): Promise<void> => {
  try {
    const monitorApplicationList = await prisma.monitor_applications.findMany({ where: { is_monitor_application_active: true } });
    const monitorApplicationMapList = await Promise.all(monitorApplicationList.map((monitorApplication: monitor_applications): Promise<IMonitorApplicationMap.IMonitorApplicationMap | null> => processMonitorApplication(monitorApplication, isPeriodicWarn)));
    const monitorApplicationMapFilteredList = monitorApplicationMapList.filter((monitorApplicationMap: IMonitorApplicationMap.IMonitorApplicationMap | null): boolean => monitorApplicationMap !== null) as IMonitorApplicationMap.IMonitorApplicationMap[];
    const serviceOnlineMessageList: string[] = [];
    const serviceOfflineMessageList: string[] = [];
    const propertyAddedMessageList: string[] = [];
    const propertyModifiedMessageList: string[] = [];
    const propertyRemovedMessageList: string[] = [];

    monitorApplicationMapFilteredList.forEach(
      (monitorApplicationMap: IMonitorApplicationMap.IMonitorApplicationMap): void => {
        const monitorApplicationMapMessageMap = monitorApplicationMap.messageMap;
  
        if (monitorApplicationMap.isHealthy) {
          serviceOnlineMessageList.push(monitorApplicationMapMessageMap.propertyRetentionMessage);
          monitorApplicationMapMessageMap.propertyAddedMessage && propertyAddedMessageList.push(monitorApplicationMapMessageMap.propertyAddedMessage);
          monitorApplicationMapMessageMap.propertyModifiedMessage && propertyModifiedMessageList.push(monitorApplicationMapMessageMap.propertyModifiedMessage);
          monitorApplicationMapMessageMap.propertyRemovedMessage && propertyRemovedMessageList.push(monitorApplicationMapMessageMap.propertyRemovedMessage);
        } else {
          serviceOfflineMessageList.push(monitorApplicationMapMessageMap.propertyRetentionMessage);
        }
      }
    );

    sendApplicationMonitoringReport(
      serviceOnlineMessageList,
      serviceOfflineMessageList,
      propertyAddedMessageList, 
      propertyModifiedMessageList,
      propertyRemovedMessageList
    );
  } catch (error: unknown) {
    loggerUtil.error(error instanceof Error ? error.message : String(error));
  }
};
