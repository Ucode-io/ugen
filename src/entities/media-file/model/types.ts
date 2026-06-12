export interface FileItem {
  id: string;
  title: string;
  storage: string;
  storage_type?: string;
  file_name_disk: string;
  file_name_download: string;
  link: string;
  file_size: number;
  mimetype?: string;
  created_at?: string;
}

export interface FilesResponse {
  status: string;
  description: string;
  data: {
    files: FileItem[];
    count: number;
  };
}
