import { useQuery } from "@tanstack/react-query";
import { menuService } from "../api/menu-api";

export const useMenus = (parentId: string) => {
  return useQuery({
    queryKey: ['menus', parentId],
    queryFn: () => menuService.getMenus(parentId),
    enabled: !!parentId,
  });
};
