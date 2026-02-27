import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api'

export const fetchProjectsList = async (params: { title: string }) => {
  const { data } = await api.get('/v1/mcp_project/list', { params })
  return data
}

export const useProjectsList = (params: { title: string }) => {
  return useQuery({
    queryKey: ['projects', 'list', params.title],
    queryFn: () => fetchProjectsList(params),
  })
}
