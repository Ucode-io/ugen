import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api'

export interface FetchProjectsListParams {
  title?: string;
  order_by?: string;
  order_direction?: string;
  limit?: number;
}

const cleanParams = (params?: FetchProjectsListParams) => {
  if (!params) return undefined
  const cleaned: Record<string, any> = {}
  let hasValidKeys = false

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value
      hasValidKeys = true
    }
  }

  return hasValidKeys ? cleaned : undefined
}

export const fetchProjectsList = async (params?: FetchProjectsListParams) => {
  const { data } = await api.get('/v1/mcp_project/list', { params })
  return data
}

export const useProjectsList = (rawParams?: FetchProjectsListParams) => {
  const params = cleanParams(rawParams)
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
