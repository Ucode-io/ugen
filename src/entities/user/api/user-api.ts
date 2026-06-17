import { api, authApi } from "@/shared/api/instance";
import { useAuthStore } from "@/entities/session";

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
  tableSlug?: string;
}

export const userApi = {
  getUsers: async (params: {
    clientTypeId: string;
    projectId: string;
    limit: number;
    offset: number;
    search?: string;
    tableSlug?: string;
  }) => {
    const endpoint = params.tableSlug
      ? `/v2/items/${params.tableSlug}`
      : "/v2/items/user";
    // Row filters for the items list endpoint are read ONLY from the `data`
    // param — the gateway's GetAllItems ignores the top-level `client-type-id`
    // query param for filtering (it uses the token's client_type_id for
    // permission scoping only). The object builder turns any *_id field that
    // exists on the table into `AND <col> = $n`, so putting client_type_id here
    // is what actually filters each client-type tab. Without it every tab shows
    // all rows of the table.
    const filter: Record<string, unknown> = { with_relations: true };
    if (params.clientTypeId) filter.client_type_id = params.clientTypeId;
    const { data } = await api.get(endpoint, {
      params: {
        "client-type-id": params.clientTypeId,
        "project-id": params.projectId,
        limit: params.limit,
        offset: params.offset,
        search: params.search,
        data: JSON.stringify(filter),
      },
    });
    return data?.data || [];
  },

  // Lists "builder" users from the auth service with the user's Bearer token
  // (forced via explicit Authorization header) instead of the project API-KEY.
  getBuilders: async (params: {
    clientTypeId: string;
    projectId: string;
    limit: number;
    offset: number;
  }) => {
    const token = useAuthStore.getState().accessToken;
    const { data } = await authApi.get("/v2/user", {
      params: {
        "client-type-id": params.clientTypeId,
        "project-id": params.projectId,
        limit: params.limit,
        offset: params.offset,
      },
      headers: { Authorization: `Bearer ${token}` },
    });
    // Auth list returns { data: { count, users: [...] } }.
    const root = data?.data;
    const inner = root?.data ?? root;
    return {
      response: inner?.users ?? inner?.response ?? [],
      count: inner?.count ?? 0,
    };
  },

  createUser: async (data: UserPayload) => {
    const { role_id, env_id, ...body } = data;
    return api.post("/v2/items/user", body, {
      params: { "project-id": body.project_id },
      headers: {
        "environment-id": env_id,
        "resource-id": role_id,
      },
    });
  },

  inviteUser: async (data: UserPayload) => {
    return authApi.post("/v2/user", data, {
      params: { "project-id": data.project_id },
    });
  },

  // Same endpoint as inviteUser, but forces the user's Bearer token instead of
  // the project-scoped API-KEY (the "Add Builder" flow).
  inviteBuilder: async (data: UserPayload) => {
    const token = useAuthStore.getState().accessToken;
    return authApi.post("/v2/user", data, {
      params: { "project-id": data.project_id },
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  updateUser: async (id: string, data: UserPayload) => {
    const { role_id, env_id, ...body } = data;
    return api.put("/v2/items/user", body, {
      params: { "project-id": body.project_id },
      headers: {
        "environment-id": env_id,
        "resource-id": role_id,
      },
    });
  },

  deleteUser: async (id: string, clientTypeId: string, tableSlug: string) => {
    return api.delete(`/v2/items/${tableSlug}/${id}`, {
      data: { data: {} },
      params: { "client-type-id": clientTypeId },
    });
  },
};
