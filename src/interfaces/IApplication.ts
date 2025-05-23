export interface IApplication {
  id: number;
  application_type: string;
  apis_name_health: string;
  is_status_transition_notified_by_monitor: boolean;
  is_application_active: boolean;
  status_transition_at: Date;
  created_at: Date;
  updated_at: Date;
}
