export interface ClientType {
  guid: string;
  name: string;
  table_slug: string;
  project_id: string | null;
  session_limit: number;
  self_recover: boolean;
  self_register: boolean;
  confirm_by: string;
  default_page: string | null;
  client_platform_ids: string[] | null;
  columns: any[];
  is_system?: boolean;
}

export interface CreateClientTypePayload {
  project_id: string;
  name: string;
  default_page: string;
  self_recover: boolean;
  self_register: boolean;
  table_slug: string;
  columns: any[];
  session_limit: number;
  "project-id": string;
}

export interface UpdateClientTypePayload extends Partial<CreateClientTypePayload> {
  id: string;
  guid: string;
}
