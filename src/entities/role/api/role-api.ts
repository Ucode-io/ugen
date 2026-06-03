import { api } from "@/shared/api/instance";
import { useAuthStore } from "@/entities/session";

export interface Role {
  guid: string;
  name: string;
  status: boolean;
  project_id: string;
  client_type_id: string;
  is_configured?: boolean;
  is_system?: boolean;
}

export const roleApi = {
  getRoles: async (projectId: string, clientTypeId?: string) => {
    const { data } = await api.get('/v2/items/role', {
      params: { 
        "project-id": projectId,
        ...(clientTypeId && { "client-type-id": clientTypeId })
      }
    });
    return data?.data?.data?.response ?? [];
  },

  // Fetch roles with the user's Bearer token instead of the project-scoped
  // API-KEY. Used by the "Add Builder" flow, which must authenticate as the
  // platform user. Returns the raw records so the caller can pick the role by
  // its joined `role_id_data.name` (e.g. "DEFAULT ADMIN").
  getRolesWithToken: async (projectId: string, clientTypeId?: string) => {
    const token = useAuthStore.getState().accessToken;
    const { data } = await api.get('/v2/items/role', {
      params: {
        "project-id": projectId,
        ...(clientTypeId && { "client-type-id": clientTypeId })
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    return data?.data?.data?.response ?? [];
  },

  createRole: async (projectId: string, payload: any) => {
    const { data } = await api.post('/v2/items/role', payload, {
      params: { "project-id": projectId }
    });
    return data;
  },

  updateRole: async (projectId: string, payload: any) => {
    const { data } = await api.put('/v2/items/role', payload, {
      params: { "project-id": projectId }
    });
    return data;
  },

  deleteRole: async (roleId: string, projectId: string) => {
    const { data } = await api.delete(`/v2/items/role/${roleId}`, {
      params: { "project-id": projectId }
    });
    return data;
  }
};
