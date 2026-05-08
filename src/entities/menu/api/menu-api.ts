import { api } from "@/shared/api/instance";
import { MenuItem } from "../model/types";

export interface MenuResponse {
  status: string;
  description: string;
  data: {
    menus: MenuItem[];
    count?: number;
  };
}

export interface CreateMenuFolderPayload {
  label: string;
  parent_id: string;
  type?: string;
  icon?: string;
  attributes?: Record<string, unknown>;
}

export interface GetMenusParams {
  parentId: string;
  projectId?: string;
  limit?: number;
  offset?: number;
}

export const menuService = {
  getMenus: async ({ parentId, projectId, limit, offset }: GetMenusParams) => {
    const { data } = await api.get<MenuResponse>(`/v3/menus`, {
      params: {
        parent_id: parentId,
        ...(projectId && { 'project-id': projectId }),
        ...(limit !== undefined && { limit }),
        ...(offset !== undefined && { offset }),
      }
    });
    return {
      menus: data.data.menus ?? [],
      count: data.data.count ?? data.data.menus?.length ?? 0,
    };
  },
  createMenuFolder: async (payload: CreateMenuFolderPayload) => {
    const { data } = await api.post(`/v3/menus`, {
      icon: payload.icon ?? "",
      attributes: payload.attributes ?? {
        label_ru: payload.label,
        label_en: payload.label,
      },
      parent_id: payload.parent_id,
      type: payload.type ?? "MINIO_FOLDER",
      label: payload.label,
    });
    return data;
  }
};
