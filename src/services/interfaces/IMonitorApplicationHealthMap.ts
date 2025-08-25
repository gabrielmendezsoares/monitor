import { IProperty } from './index.js';

export interface IMonitorApplicationHealthMap {
  isHealthy: boolean;
  responseMap?: Record<string, IProperty.IProperty>;
  propertyAddedMap?: Record<string, IProperty.IProperty>;
  propertyModifiedMap?: Record<string, IProperty.IProperty>;
  propertyRemovedMap?: Record<string, IProperty.IProperty>;
  propertyRetentionMap: Record<string, IProperty.IProperty>;
}
