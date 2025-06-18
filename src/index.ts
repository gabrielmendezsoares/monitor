import momentTimezone from 'moment-timezone';
import schedule from 'node-schedule';
import { PrismaClient } from '@prisma/client/storage/client.js';
import { dateTimeFormatterUtil, HttpClientUtil } from './utils/index.js';
import { BasicAndBearerStrategy } from './utils/strategies/index.js';
import { IApplication, IApplicationHealthMap, IApplicationMap, IPerformanceDataMap } from './interfaces/index.js';

const API_GATEWAY_API_V1_GET_AUTHENTICATION_URL = `http://${ process.env.SERVER_IP as string }:3043/api/v1/get/authentication`;
const API_GATEWAY_API_v1_GET_API_DATA_MAP_URL = `http://${ process.env.SERVER_IP as string }:3043/api/v1/get/api-data-map`;

const HEARTBEAT_INTERVAL = 60_000;
const MONITORING_INTERVAL = 60_000;

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

const fetchApplicationHealth = async (application: IApplication.IApplication): Promise<IApplicationHealthMap.IApplicationHealthMap> => {
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
  } = await measureExecutionTime((): Promise<Axios.AxiosXHR<unknown>> => httpClientInstance.post<unknown>(API_GATEWAY_API_v1_GET_API_DATA_MAP_URL, { filterMap: { name: application.apis_name_health } }));

  if (!response?.data?.status) {
    return { 
      isHealthy: false,
      data : {
        responseTime: {
          name: 'Tempo de resposta',
          value: `${ elapsedMiliseconds.toFixed(2) }ms`
        }
      }
    };
  }
  
  const subResponse = response.data?.data?.[application.apis_name_health];

  if (!subResponse) {
    return { 
      isHealthy: false,
      data : {
        responseTime: {
          name: 'Tempo de resposta',
          value: `${ elapsedMiliseconds.toFixed(2) }ms`
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
          value: `${ elapsedMiliseconds.toFixed(2) }ms`
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
        value: `${ elapsedMiliseconds.toFixed(2) }ms`
      }
    }
  };
};

const updateApplicationStatus = async (application: IApplication.IApplication, isActive: boolean, utcDate: Date): Promise<IApplication.IApplication> => {
  return prisma.applications.update(
    {
      where: { id: application.id },
      data: {
        is_status_transition_notified_by_monitor: true,
        is_application_active: isActive,
        status_transition_at: utcDate
      }
    }
  );
};

const formatApplicationInformation = (application: IApplication.IApplication, statusTransitionDate: Date, healthDataMap: IApplicationHealthMap.IApplicationHealthMap): string => {
  return Object.values(healthDataMap.data).reduce(
    (accumulator: string, object: { name: string, value: unknown }): string => {
      return `${ accumulator }\n- ${ object.name }: ${ object.value }`;
    },
    `[${ application.application_type }]\n- Desde: ${ dateTimeFormatterUtil.formatDuration((momentTimezone().utc().toDate().getTime() - statusTransitionDate.getTime()) / 60_000) }`
  );
};

const sendMonitoringReport = async (onlineApplicationMapList: string[], offlineApplicationMapList: string[]): Promise<void> => {
  if (onlineApplicationMapList.length === 0 && offlineApplicationMapList.length === 0) {
    return;
  }

  const httpClientInstance = new HttpClientUtil.HttpClient();

  const messageList = [
    '📌 *MONITOR DE SERVIÇOS* 📌',
    onlineApplicationMapList.length > 0  ? `\n\n🟢 *DISPONÍVEIS (${ onlineApplicationMapList.length })* 🟢\n\n${ onlineApplicationMapList.join('\n\n') }` : '',
    offlineApplicationMapList.length > 0 ? `\n\n🔴 *INDISPONÍVEIS (${ offlineApplicationMapList.length })* 🔴\n\n${ offlineApplicationMapList.join('\n\n') }` : '',
    `\n\n🌐 *Servidor:* ${ process.env.SERVER_IP as string }`,
    `\n📊 *Total monitorado:* ${ onlineApplicationMapList.length + offlineApplicationMapList.length }`
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
    console.log(`Application | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Error: ${ error instanceof Error ? error.message : String(error) }`);
  }
};

const processApplication = async (application: IApplication.IApplication, isPeriodicWarn?: boolean): Promise<IApplicationMap.IApplicationMap | null> => {
  try {
    const applicationHealthMap = await fetchApplicationHealth(application);
    let applicationMap = null;
    
    if (isPeriodicWarn) {
      applicationMap = { 
        isHealthy: application.is_application_active, 
        information: formatApplicationInformation(application, application.status_transition_at, applicationHealthMap) 
      };
    } else {
      if (applicationHealthMap.isHealthy && !application.is_application_active) {
        const utcDate = momentTimezone().utc().toDate();
  
        await updateApplicationStatus(application, true, utcDate);
  
        applicationMap = { 
          isHealthy: true, 
          information: formatApplicationInformation(application, utcDate, applicationHealthMap)
        };
      } else if (!applicationHealthMap.isHealthy && application.is_application_active) {
        const utcDate = momentTimezone().utc().toDate();
  
        await updateApplicationStatus(application, false, utcDate);
  
        applicationMap = { 
          isHealthy: false, 
          information: formatApplicationInformation(application, utcDate, applicationHealthMap)
        };
      } else if (!application.is_status_transition_notified_by_monitor) {
        await updateApplicationStatus(application, application.is_application_active, application.status_transition_at);
  
        applicationMap = { 
          isHealthy: application.is_application_active, 
          information: formatApplicationInformation(application, application.status_transition_at, applicationHealthMap) 
        };
      }
    }
    
    return applicationMap;
  } catch (error: unknown) {
    console.log(`Application | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Error: ${ error instanceof Error ? error.message : String(error) }`);
   
    return null;
  }
};

const monitorApplications = async (isPeriodicWarn?: boolean): Promise<void> => {
  try {
    const applicationList = await prisma.applications.findMany();
    const applicationMapList = await Promise.all(applicationList.map(async (application: IApplication.IApplication): Promise<IApplicationMap.IApplicationMap | null> => await processApplication(application, isPeriodicWarn)));
    const applicationMapFilteredList = applicationMapList.filter((applicationMap: IApplicationMap.IApplicationMap | null): boolean => applicationMap !== null) as IApplicationMap.IApplicationMap[];
    const onlineApplicationMapList = applicationMapFilteredList.filter((applicationMap: IApplicationMap.IApplicationMap): boolean => applicationMap.isHealthy).map((applicationMap: IApplicationMap.IApplicationMap): string => applicationMap.information);
    const offlineApplicationMapList = applicationMapFilteredList.filter((applicationMap: IApplicationMap.IApplicationMap): boolean => !applicationMap.isHealthy).map((applicationMap: IApplicationMap.IApplicationMap): string => applicationMap.information);
    
    await sendMonitoringReport(onlineApplicationMapList, offlineApplicationMapList);
  } catch (error: unknown) {
    console.log(`Application | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Error: ${ error instanceof Error ? error.message : String(error) }`);
  }
};

(
  async (): Promise<void> => {
    try {
      console.log(`Application | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Status: Application started`);

      await monitorApplications();
      
      setInterval((): void => console.log(`Application | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') }`), HEARTBEAT_INTERVAL);
      setInterval(monitorApplications, MONITORING_INTERVAL);
      
      schedule.scheduleJob(
        {
          dayOfWeek: [1, 2, 3, 4, 5],
          hour: [9, 14],
          minute: 0
        },
        async (): Promise<void> => await monitorApplications(true) 
      );
    } catch (error: unknown) {
      console.log(`Application | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Error: ${ error instanceof Error ? error.message : String(error) }`);
    }
  }
)();
