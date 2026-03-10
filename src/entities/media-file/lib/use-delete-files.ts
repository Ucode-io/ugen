import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fileApi } from "../api/file-api";

export const useDeleteFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (files: { object_id: string; object_name: string }[]) =>
      fileApi.deleteFiles(files),
    onSuccess: () => {
      // Invalidate both initial and infinite queries 
      queryClient.invalidateQueries({ queryKey: ['files'] });
    }
  });
};
