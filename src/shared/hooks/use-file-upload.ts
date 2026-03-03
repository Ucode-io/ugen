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

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ id: string; url: string; name: string }[]>([]);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post<FileUploadResponse>('/v1/files/folder_upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const cdnUrl = process.env.NEXT_PUBLIC_CDN_BASE_URL || 'https://cdn.u-code.io';
      const fileUrl = `${cdnUrl}/${data.data.link}`;

      const newFile = {
        id: data.data.id,
        url: fileUrl,
        name: data.data.title,
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
