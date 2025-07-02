export interface IMonitorApplication {
  id: number;
  application_type: string;
  apis_id: number;
  is_alive: boolean;
  is_alive_transition_notified_by_monitor: boolean;
  is_monitor_application_active: boolean;
  is_alive_transition_at: Date;
  created_at: Date;
  updated_at: Date;
}
