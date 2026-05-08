import { useInfiniteQuery } from "@tanstack/react-query";
import { menuService } from "../api/menu-api";

export interface UseMenusInfiniteParams {
  parentId: string;
  projectId?: string;
  limit?: number;
  enabled?: boolean;
}

export const useMenusInfinite = ({
  parentId,
  projectId,
  limit = 20,
  enabled = true,
}: UseMenusInfiniteParams) => {
  return useInfiniteQuery({
    queryKey: ['menus', parentId, projectId ?? null, 'infinite', limit],
    queryFn: ({ pageParam = 0 }) =>
      menuService.getMenus({ parentId, projectId, limit, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // Stop when the last page returned no items — backend may report a stale
      // count, so trust an empty page as the real end.
      if (!lastPage.menus || lastPage.menus.length === 0) return undefined;
      const loaded = allPages.reduce((acc, p) => acc + (p.menus?.length ?? 0), 0);
      return loaded < lastPage.count ? loaded : undefined;
    },
    enabled: enabled && !!parentId,
  });
};
