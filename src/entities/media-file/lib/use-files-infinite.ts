import { useInfiniteQuery } from "@tanstack/react-query";
import { fileApi } from "../api/file-api";

export const useFilesInfinite = (limit: number = 20) => {
  return useInfiniteQuery({
    queryKey: ['files', 'infinite'],
    queryFn: ({ pageParam = 0 }) => fileApi.getFiles(limit, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextOffset = allPages.length * limit;
      return nextOffset < lastPage.count ? nextOffset : undefined;
    }
  });
};
