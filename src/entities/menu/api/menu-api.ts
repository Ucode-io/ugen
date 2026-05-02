import { api } from "@/shared/api/instance";
import { MenuItem } from "../model/types";

export interface MenuResponse {
  status: string;
  description: string;
  data: {
    menus: MenuItem[];
  };
}

export interface CreateMenuFolderPayload {
  label: string;
  parent_id: string;
  type?: string;
  icon?: string;
  attributes?: Record<string, unknown>;
}

export const menuService = {
  getMenus: async (parentId: string) => {
    const { data } = await api.get<MenuResponse>(`/v3/menus`, {
      params: { parent_id: parentId }
    });
    return data.data.menus;
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
