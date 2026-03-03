import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api'

export interface FetchProjectsListParams {
  title?: string;
  order_by?: string;
  order_direction?: string;
  limit?: number;
}

export const fetchProjectsList = async (params?: FetchProjectsListParams) => {
  const { data } = await api.get('/v1/mcp_project/list', { params })
  return data
}

export const useProjectsList = (params?: FetchProjectsListParams) => {
  return useQuery({
    queryKey: ['projects', 'list', params],
    queryFn: () => fetchProjectsList(params),
  })
}

export const useUpdateProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; title: string, description: string }) => {
      const { data } = await api.put(`/v1/mcp_project/${id}`, { ...body, id })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}

export const useDeleteProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/v1/mcp_project/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}
