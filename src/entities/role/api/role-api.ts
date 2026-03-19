import { api } from "@/shared/api/instance";

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
