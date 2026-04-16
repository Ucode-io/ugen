import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api'

export interface UserProject {
  id: string
  title: string
  logo: string
  is_ugen: boolean
  environment_id: string
}

export interface UserCompany {
  id: string
  name: string
  logo: string
  has_personal_fork: boolean
  projects: UserProject[]
}

export const fetchUserProjects = async (): Promise<UserCompany[]> => {
  const { data } = await api.get('/v1/ugen/user-projects')
  return data?.data?.companies ?? []
}

export const useUserProjects = () => {
  return useQuery({
    queryKey: ['user-projects'],
    queryFn: fetchUserProjects,
  })
}

export interface SwitchProjectParams {
  refresh_token: string
  role_id: string
  client_type_id: string
  env_id: string
  project_id: string
}

export const switchProject = async (params: SwitchProjectParams) => {
  const { authApi } = await import('@/shared/api')
  const { data } = await authApi.put('/v2/refresh', params)
  return data?.data
}

export const useSwitchProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: switchProject,
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })
}

export interface FetchProjectsListParams {
  title?: string;
  order_by?: string;
  order_direction?: string;
  limit?: number;
  ids?: string[];
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
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(val => searchParams.append(key, val))
      } else if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value))
      }
    })
  }
  const queryString = searchParams.toString()
  const { data } = await api.get(`/v1/mcp_project/list${queryString ? `?${queryString}` : ''}`)
  return data
}

export const useProjectsList = (rawParams?: FetchProjectsListParams, options?: { enabled?: boolean }) => {
  const params = cleanParams(rawParams)
  return useQuery({
    queryKey: ['projects', 'list', params],
    queryFn: () => fetchProjectsList(params),
    enabled: options?.enabled !== undefined ? options.enabled : true,
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
