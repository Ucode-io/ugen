import { api } from "@/shared/api/instance";
import { FilesResponse } from "../model/types";

export const fileApi = {
  getFiles: async (limit: number = 20, offset: number = 0) => {
    const { data } = await api.get<FilesResponse>(`/v1/files`, {
      params: {
        limit,
        offset
      }
    });
    return data.data;
  },
  deleteFiles: async (files: { object_id: string; object_name: string }[]) => {
    const { data } = await api.delete(`/v1/files`, {
      data: { objects: files }
    });
    return data;
  }
};
