import { useMutation, useQueryClient } from "@tanstack/react-query";
import { menuService, CreateMenuFolderPayload } from "../api/menu-api";

export const useCreateMenuFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMenuFolderPayload) =>
      menuService.createMenuFolder(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["menus", variables.parent_id] });
    },
  });
};
