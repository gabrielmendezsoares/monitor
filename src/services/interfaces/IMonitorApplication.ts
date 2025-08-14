import { JsonValue } from "@prisma/client/storage/runtime/library.js";

export interface IMonitorApplication {
  id: number;
  application_type: string;
  apis_id: number;
  response_map: JsonValue | null;
  is_alive: boolean;
  is_monitor_application_active: boolean;
  is_alive_transition_at: Date;
  created_at: Date;
  updated_at: Date;
}
