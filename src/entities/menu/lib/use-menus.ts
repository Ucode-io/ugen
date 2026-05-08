import { useQuery } from "@tanstack/react-query";
import { menuService } from "../api/menu-api";

export const useMenus = (parentId: string, projectId?: string) => {
  return useQuery({
    queryKey: ['menus', parentId, projectId ?? null],
    queryFn: async () => {
      const { menus } = await menuService.getMenus({ parentId, projectId });
      return menus;
    },
    enabled: !!parentId,
  });
};
