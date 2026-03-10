import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fileService } from '@/shared/api/file-service'

interface UseFileUploadOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  folderName: string;
}

export const useFileUpload = ({ onSuccess, onError, folderName }: UseFileUploadOptions) => {
  const queryClient = useQueryClient()

  const { mutate: uploadFile, isPending: isLoading } = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return fileService.folderUpload(formData, { folder_name: folderName })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', folderName] })
      onSuccess?.()
    },
    onError: (error) => {
      console.error('File upload error:', error)
      onError?.(error)
    }
  })

  return {
    uploadFile,
    isLoading
  }
}
