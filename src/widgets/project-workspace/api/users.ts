import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/shared/api'

export interface ClientTypeOption {
  label: string
  value: string
}

/**
 * Fetches client type options from the server
 */
export const useClientTypes = () => {
  return useQuery({
    queryKey: ['client-types'],
    queryFn: async () => {
      const { data } = await authApi.get('/v2/client-type')
      const items = data?.data?.data?.response || []

      return items.map((item: any) => ({
        label: item.name || item.label || 'Unknown',
        value: item.guid || item.value || item.id,
      })) as ClientTypeOption[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useRoles = ({ id, projectId }: { id: string, projectId: string }) => {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: async () => {
      const { data } = await authApi.get('/v2/role', { params: { "client-type-id": id, "project-id": projectId } })
      const items = data?.data?.data?.response || []

      return items.map((item: any) => ({
        label: item.name || item.label || 'Unknown',
        value: item.guid || item.value || item.id,
      })) as ClientTypeOption[]
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useUsers = ({ clientTypeId, projectId, limit, offset }: { clientTypeId: string, projectId: string, limit: number, offset: number }) => {
  return useQuery({
    queryKey: ['users', clientTypeId, projectId, limit, offset],
    queryFn: async () => {
      const { data } = await authApi.get('/v2/user', { params: { "client-type-id": clientTypeId, "project-id": projectId, limit, offset } })

      return data?.data || [];
    },
    enabled: !!clientTypeId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useCreateUser = () => {
  return async (data: {
    client_type_id: string
    login: string
    phone: string
    email: string
    project_id: string
    role_id: string
    status: string
    env_id: string
  }) => {
    const { role_id, env_id, ...body } = data

    return authApi.post('/v2/user', body, {
      params: { 'project-id': body.project_id },
      headers: {
        'environment-id': env_id,
        'resource-id': role_id
      }
    })
  }
}

export const useUpdateUser = () => {
  return async (data: {
    id: string
    client_type_id: string
    login: string
    phone: string
    email: string
    project_id: string
    role_id: string
    status: string
    env_id: string
    company_id?: string
  }) => {
    const { role_id, env_id, ...body } = data

    return authApi.put('/v2/user', body, {
      params: { 'project-id': body.project_id },
      headers: {
        'environment-id': env_id,
        'resource-id': role_id
      }
    })
  }
}

export const useDeleteUser = () => {
  return async ({ id, clientTypeId }: { id: string, clientTypeId: string }) => {
    return authApi.delete(`/v2/user/${id}`, {
      params: {
        "client-type-id": clientTypeId,
      },
    })
  }
}
