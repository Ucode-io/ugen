import { useQuery } from '@tanstack/react-query'
import { userApi } from '@/entities/user/api/user-api'
import { roleApi } from '@/entities/role/api/role-api'
import { clientTypeApi } from '@/entities/client-type/api/client-type-api'

export interface ClientTypeOption {
  label: string
  value: string
}

/**
 * Fetches client type options from the server
 */
export const useClientTypes = (projectId?: string) => {
  return useQuery({
    queryKey: ['client-types-workspace', projectId],
    queryFn: async () => {
      if (!projectId) return []
      const items = await clientTypeApi.getClientTypes(projectId)
      return items.map((item: any) => ({
        label: item.name || item.label || 'Unknown',
        value: item.guid || item.value || item.id,
      })) as ClientTypeOption[]
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useRoles = ({ id, projectId }: { id: string, projectId: string }) => {
  return useQuery({
    queryKey: ['roles-workspace', id, projectId],
    queryFn: async () => {
      const items = await roleApi.getRoles(projectId, id)
      return items.map((item: any) => ({
        label: item.name || item.label || 'Unknown',
        value: item.guid || item.value || item.id,
      })) as ClientTypeOption[]
    },
    enabled: !!id && !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useUsers = ({ clientTypeId, projectId, limit, offset }: { clientTypeId: string, projectId: string, limit: number, offset: number }) => {
  return useQuery({
    queryKey: ['users', clientTypeId, projectId, limit, offset],
    queryFn: () => userApi.getUsers({ clientTypeId, projectId, limit, offset }),
    enabled: !!clientTypeId && !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useCreateUser = () => {
  return (data: any) => userApi.createUser(data)
}

export const useUpdateUser = () => {
  return (data: any) => userApi.updateUser(data.id, data)
}

export const useDeleteUser = () => {
  return ({ id, clientTypeId }: { id: string, clientTypeId: string }) => userApi.deleteUser(id, clientTypeId)
}
