import { NextFunction, Request, Response } from 'express';
import osu from 'node-os-utils';
import { IResponse, IResponseData } from './interfaces/index.js';

export const getHealth = async (
  req: Request, 
  _res: Response, 
  _next: NextFunction, 
  timestamp: string
): Promise<IResponse.IResponse<IResponseData.IGetHealthResponseData>> => {
  return {
    status: 200,
    data: {
      timestamp,
      status: true,
      statusCode: 200,
      method: req.method,
      path: req.originalUrl || req.url,
      query: req.query,
      headers: req.headers,
      body: req.body,
      monitor: {
        cpuUsage: {
          name: 'Uso de CPU',
          value: `${ (await osu.cpu.usage()).toFixed(1) }%`
        },
        memoryUsage: {
          name: 'Uso de memória',
          value: `${ (await osu.mem.used()).usedMemMb.toFixed(1) }MB`
        }
      }
    }
  };
};
