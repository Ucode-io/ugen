import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, githubApi } from '@/shared/api'
import { useAuthStore } from '@/entities/session'

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

export interface MatchedUserProject {
  project: UserProject
  companyId: string
  matchedBy: 'project_id' | 'environment_id'
}

/**
 * Correlate a project from a login/refresh response with the user-projects
 * source of truth (the same data the project dropdown reads is_ugen from).
 *
 * The auth responses' project id doesn't always line up with the
 * user-projects `.id` (different id-space), which is why matching purely by
 * `project_id` silently fails and leaves the unreliable login is_ugen in
 * place. environment_id is stable across endpoints, so fall back to it.
 * Returns null when nothing matches so callers can log instead of trusting a
 * stale flag.
 */
export const matchUserProject = (
  companies: UserCompany[],
  { projectId, environmentId }: { projectId?: string | null; environmentId?: string | null }
): MatchedUserProject | null => {
  const flat = companies.flatMap((c) =>
    c.projects.map((project) => ({ project, companyId: c.id }))
  )
  const byId = projectId ? flat.find((e) => e.project.id === projectId) : undefined
  if (byId) return { ...byId, matchedBy: 'project_id' }
  const byEnv = environmentId
    ? flat.find((e) => e.project.environment_id === environmentId)
    : undefined
  return byEnv ? { ...byEnv, matchedBy: 'environment_id' } : null
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

const refreshIntoProject = async (endpoint: string, params: SwitchProjectParams) => {
  const { authApi } = await import('@/shared/api')
  const { data } = await authApi.put(endpoint, params)
  // normalize: response may be nested under .response or flat
  const inner = data?.data
  return inner?.response ?? inner
}

export const switchProject = (params: SwitchProjectParams) => refreshIntoProject('/v2/refresh', params)

// Super admin impersonation switch uses a dedicated endpoint.
export const switchProjectSuperAdmin = (params: SwitchProjectParams) =>
  refreshIntoProject('/v2/refresh-superadmin', params)

export const useSwitchProject = () => {
  return useMutation({
    mutationFn: switchProject,
  })
}

export const useSwitchProjectSuperAdmin = () => {
  return useMutation({
    mutationFn: switchProjectSuperAdmin,
  })
}

export const fetchCompanyProjects = async (companyId: string) => {
  const { data } = await api.get('/v1/ugen/company-projects', {
    params: { company_id: companyId },
  })
  return data?.data ?? []
}

type ListQueryOptions = {
  enabled?: boolean
  staleTime?: number
  refetchOnMount?: boolean | 'always'
}

export const useCompanyProjects = (
  companyId: string,
  options?: ListQueryOptions
) => {
  return useQuery({
    queryKey: ['company-projects', companyId],
    queryFn: () => fetchCompanyProjects(companyId),
    enabled: options?.enabled !== undefined ? options.enabled && !!companyId : !!companyId,
    staleTime: options?.staleTime,
    refetchOnMount: options?.refetchOnMount,
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

export const useProjectsList = (
  rawParams?: FetchProjectsListParams,
  options?: ListQueryOptions
) => {
  const params = cleanParams(rawParams)
  return useQuery({
    queryKey: ['projects', 'list', params],
    queryFn: () => fetchProjectsList(params),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: options?.staleTime,
    refetchOnMount: options?.refetchOnMount,
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

export interface AllProject {
  project_id: string
  company_id: string
  title: string
  k8s_namespace: string
  fare_id: string
  balance?: number
  status: string
  created_at: string
  updated_at: string
  environment_id: string
  company_projects_count: number
}

export interface FetchAllProjectsParams {
  page?: number
  limit?: number
  title?: string
}

export const fetchAllProjects = async (
  params?: FetchAllProjectsParams
): Promise<{ count: number; projects: AllProject[] }> => {
  const { page = 1, limit = 10, title } = params ?? {}
  const { data } = await api.get('/v1/ugen/projects/all', {
    params: {
      limit,
      offset: (page - 1) * limit,
      ...(title ? { title } : {}),
    },
  })
  return data?.data ?? { count: 0, projects: [] }
}

export const useAllProjects = (params?: FetchAllProjectsParams) => {
  return useQuery({
    queryKey: ['all-projects', params?.page, params?.limit, params?.title],
    queryFn: () => fetchAllProjects(params),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export const useCreateCompany = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const token = useAuthStore.getState().accessToken
      const { data } = await githubApi.post(
        '/v1/company',
        { name },
        {
          params: { is_ugen: true },
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      return data?.data ?? data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-projects'] })
    },
  })
}
