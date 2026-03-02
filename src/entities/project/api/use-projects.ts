import { useQuery } from '@tanstack/react-query'
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
