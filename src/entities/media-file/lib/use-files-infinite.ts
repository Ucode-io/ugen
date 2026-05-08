import { useInfiniteQuery } from "@tanstack/react-query";
import { fileApi } from "../api/file-api";

export interface UseFilesInfiniteParams {
  limit?: number;
  folderName?: string;
  projectId?: string;
  enabled?: boolean;
}

export const useFilesInfinite = ({
  limit = 20,
  folderName,
  projectId,
  enabled = true,
}: UseFilesInfiniteParams = {}) => {
  return useInfiniteQuery({
    queryKey: ['files', 'infinite', folderName ?? null, projectId ?? null],
    queryFn: ({ pageParam = 0 }) =>
      fileApi.getFiles({ limit, offset: pageParam, folderName, projectId }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextOffset = allPages.length * limit;
      return nextOffset < lastPage.count ? nextOffset : undefined;
    },
    enabled,
  });
};
