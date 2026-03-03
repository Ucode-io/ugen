import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { ProjectFolder, CreateProjectFolderDto, UpdateProjectFolderDto, UpdateProjectFoldersOrderDto } from '../model/types'

export const useProjectFolders = (parent_id?: string, type?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['project-folders', parent_id || 'root', type],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (parent_id) params.append('parent_id', parent_id)
      if (type) params.append('type', type)
      const { data } = await api.get('/v1/project-folders', { params })

      let items: any = data
      if (items?.data) items = items.data
      if (items?.response) items = items.response

      if (!Array.isArray(items) && typeof items === 'object' && items !== null) {
        // Heuristic: find the first array property
        for (const key of Object.keys(items)) {
          if (Array.isArray(items[key])) {
            items = items[key]
            break
          }
        }
      }

      const folders = (Array.isArray(items) ? items : []) as ProjectFolder[]
      // Sort by order_number
      return folders.sort((a, b) => (a.order_number || 0) - (b.order_number || 0))
    },
    enabled
  })
}

export const useProjectFolder = (id: string) => {
  return useQuery({
    queryKey: ['project-folders', id],
    queryFn: async () => {
      const { data } = await api.get(`/v1/project-folders/${id}`)
      return (data?.data?.response || data?.response || data?.data || data) as ProjectFolder
    },
    enabled: !!id,
  })
}

export const useCreateProjectFolder = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateProjectFolderDto) => {
      const { data } = await api.post('/v1/project-folders', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-folders'] })
    }
  })
}

export const useUpdateProjectFolder = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & UpdateProjectFolderDto) => {
      const { data } = await api.put(`/v1/project-folders/${id}`, body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-folders'] })
    }
  })
}

export const useDeleteProjectFolder = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/v1/project-folders/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-folders'] })
    }
  })
}

export const useUpdateProjectFoldersOrder = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: UpdateProjectFoldersOrderDto) => {
      const { data } = await api.put('/v1/project-folders/order', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-folders'] })
    }
  })
}
