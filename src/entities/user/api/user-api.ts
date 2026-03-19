import { api } from "@/shared/api/instance";

export interface UserPayload {
  client_type_id: string;
  login: string;
  phone: string;
  email: string;
  project_id: string;
  role_id: string;
  status: string;
  env_id: string;
  company_id?: string;
}

export const userApi = {
  getUsers: async (params: { clientTypeId: string, projectId: string, limit: number, offset: number }) => {
    const { data } = await api.get('/v2/items/user', {
      params: {
        "client-type-id": params.clientTypeId,
        "project-id": params.projectId,
        limit: params.limit,
        offset: params.offset
      }
    });
    return data?.data || [];
  },

  createUser: async (data: UserPayload) => {
    const { role_id, env_id, ...body } = data;
    return api.post('/v2/items/user', body, {
      params: { 'project-id': body.project_id },
      headers: {
        'environment-id': env_id,
        'resource-id': role_id
      }
    });
  },

  updateUser: async (id: string, data: UserPayload) => {
    const { role_id, env_id, ...body } = data;
    return api.put('/v2/items/user', body, {
      params: { 'project-id': body.project_id },
      headers: {
        'environment-id': env_id,
        'resource-id': role_id
      }
    });
  },

  deleteUser: async (id: string, clientTypeId: string) => {
    return api.delete(`/v2/items/user/${id}`, {
      params: {
        "client-type-id": clientTypeId,
      },
    });
  }
};
