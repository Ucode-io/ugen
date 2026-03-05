export type ProjectFolderType = "FOLDER" | "PROJECT" | "CHAT";

interface ProjectData {
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectFolder {
  id: string;
  label: string;
  type: ProjectFolderType;
  icon?: string;
  order_number?: number;
  parent_id?: string;
  mcp_project_id?: string;
  chat_id?: string;
  attributes?: Record<string, unknown>;
  children?: ProjectFolder[];
  project_data?: ProjectData;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProjectFolderDto {
  label: string;
  type: ProjectFolderType;
  icon?: string;
  order_number?: number;
  parent_id?: string | null;
  mcp_project_id?: string;
  chat_id?: string;
  attributes?: Record<string, unknown>;
}

export interface UpdateProjectFolderDto {
  label?: string;
  icon?: string;
  parent_id?: string | null;
  order_number?: number;
  attributes?: Record<string, unknown>;
}

export interface UpdateProjectFoldersOrderDto {
  items: { id: string; order_number: number }[];
}
