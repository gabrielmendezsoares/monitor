import { IProperty } from './index.js';

export interface IMonitorApplicationHealthMap {
  isHealthy: boolean;
  responseMap?: Record<string, IProperty.IProperty>;
  propertyAddedMap?: Record<string, IProperty.IProperty>;
  propertyModifiedMap?: Record<string, IProperty.IProperty>;
  propertyRemovedSet?: Set<string>;
  propertyRetentionMap: Record<string, IProperty.IProperty>;
}
