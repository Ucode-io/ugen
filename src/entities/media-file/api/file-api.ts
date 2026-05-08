import { api } from "@/shared/api/instance";
import { FilesResponse } from "../model/types";

export interface GetFilesParams {
  limit?: number;
  offset?: number;
  folderName?: string;
  projectId?: string;
}

export const fileApi = {
  getFiles: async ({ limit = 20, offset = 0, folderName, projectId }: GetFilesParams = {}) => {
    const { data } = await api.get<FilesResponse>(`/v1/files`, {
      params: {
        limit,
        offset,
        ...(folderName && { folder_name: folderName }),
        ...(projectId && { project_id: projectId }),
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
