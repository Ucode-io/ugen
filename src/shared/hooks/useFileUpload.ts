import { useState, useCallback } from 'react';
import { api } from '@/shared/api';

interface FileUploadResponse {
  status: string;
  data: {
    id: string;
    title: string;
    storage: string;
    file_name_disk: string;
    file_name_download: string;
    link: string;
    file_size: number;
    project_id: string;
  };
}

/** A successfully uploaded attachment, as consumed by the preview UI. */
export interface UploadedFile {
  id: string;
  url: string;
  name: string;
  /** Size in bytes (from the local File at upload time). */
  size?: number;
  /** MIME type (from the local File at upload time), e.g. "application/pdf". */
  type?: string;
}

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const uploadFile = useCallback(async (file: File, folderName?: string) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post<FileUploadResponse>('/v1/files/folder_upload', formData, {
        params: { folder_name: folderName },
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const cdnUrl = process.env.NEXT_PUBLIC_CDN_BASE_URL || 'https://cdn.u-code.io';
      const fileUrl = `${cdnUrl}/${data.data.link}`;

      const newFile: UploadedFile = {
        id: data.data.id,
        url: fileUrl,
        name: data.data.title || file.name,
        // Capture from the local File — the upload response carries no MIME
        // type, and its title may lack an extension. These power the preview UI.
        size: data.data.file_size ?? file.size,
        type: file.type,
      };

      setUploadedFiles((prev) => [...prev, newFile]);
      return newFile;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const clearFiles = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  return {
    isUploading,
    uploadedFiles,
    uploadFile,
    removeFile,
    clearFiles,
  };
};
