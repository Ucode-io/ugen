import { api } from "@/shared/api";
import { CollectionsResponse } from "../model/types";

export const collectionApi = {
  getLoginTables: async () => {
    const { data } = await api.get<{ data: CollectionsResponse }>("/v2/collections", {
      params: {
        is_login_table: true,
      },
    });
    return data?.data?.data || data;
  },
};
