import { api, authApi } from "@/shared/api/instance";
import { ClientType, CreateClientTypePayload, UpdateClientTypePayload } from "../model/types";

export const clientTypeApi = {
  getClientTypes: async (projectId: string) => {
    const { data } = await api.get<{ data: { data: { response: ClientType[] } } }>("/v2/items/client_type", {
      params: { "project-id": projectId }
    });
    // Adjusting based on common API structures, might need tweak if response is different
    return data?.data?.data?.response || (data as any)?.response || data;
  },

  createClientType: async (projectId: string, payload: CreateClientTypePayload) => {
    const { data } = await api.post("/v2/items/client_type", payload, {
      params: { "project-id": projectId }
    });
    return data;
  },

  updateClientType: async (projectId: string, payload: UpdateClientTypePayload) => {
    const { data } = await api.put("/v2/items/client_type", payload, {
      params: { "project-id": projectId }
    });
    return data;
  }
};
