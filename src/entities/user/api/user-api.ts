import { api, authApi } from "@/shared/api/instance";

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
  password?: string;
}

export const userApi = {
  getUsers: async (params: { clientTypeId: string, projectId: string, limit: number, offset: number, search?: string, tableSlug?: string }) => {
    const endpoint = params.tableSlug ? `/v2/items/${params.tableSlug}` : '/v2/items/user';
    const { data } = await api.get(endpoint, {
      params: {
        "client-type-id": params.clientTypeId,
        "project-id": params.projectId,
        limit: params.limit,
        offset: params.offset,
        search: params.search,
        data: JSON.stringify({ with_relations: true })
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

  inviteUser: async (data: UserPayload) => {
    return authApi.post('/v2/user', data, {
      params: { 'project-id': data.project_id }
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
