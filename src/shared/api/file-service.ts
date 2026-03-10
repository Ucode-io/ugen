import { api } from './instance'

export interface FileUploadParams {
  folder_name: string;
}

export const fileService = {
  /**
   * Upload file to a specific folder
   * POST /v1/files/folder_upload
   */
  folderUpload: async (formData: FormData, params: FileUploadParams) => {
    const { data } = await api.post('/v1/files/folder_upload', formData, {
      params,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },
}
