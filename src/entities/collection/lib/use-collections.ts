import { useQuery } from "@tanstack/react-query";
import { collectionApi } from "../api/collection-api";

export const useLoginTables = () => {
  return useQuery({
    queryKey: ["login-tables"],
    queryFn: async () => {
      const res = await collectionApi.getLoginTables();
      console.log({ res })
      return (res as any).data?.tables?.map((el: any) => ({
        label: el?.label,
        value: el?.slug,
      })) || [];
    },
  });
};
