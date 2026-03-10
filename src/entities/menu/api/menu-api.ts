import { api } from "@/shared/api/instance";
import { MenuItem } from "../model/types";

export interface MenuResponse {
  status: string;
  description: string;
  data: {
    menus: MenuItem[];
  };
}

export const menuService = {
  getMenus: async (parentId: string) => {
    const { data } = await api.get<MenuResponse>(`/v3/menus`, {
      params: { parent_id: parentId }
    });
    return data.data.menus;
  }
};
