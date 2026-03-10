import { authApi } from "@/shared/api/instance";
import { ClientType, CreateClientTypePayload, UpdateClientTypePayload } from "../model/types";

export const clientTypeApi = {
  getClientTypes: async (projectId: string) => {
    const { data } = await authApi.get<{ data: { data: { response: ClientType[] } } }>("/v2/client-type", {
      params: { "project-id": projectId }
    });
    console.log({ data })
    // Adjusting based on common API structures, might need tweak if response is different
    return data?.data?.data?.response || (data as any)?.response || data;
  },

  createClientType: async (projectId: string, payload: CreateClientTypePayload) => {
    const { data } = await authApi.post("/v2/client-type", payload, {
      params: { "project-id": projectId }
    });
    return data;
  },

  updateClientType: async (projectId: string, payload: UpdateClientTypePayload) => {
    const { data } = await authApi.put("/v2/client-type", payload, {
      params: { "project-id": projectId }
    });
    return data;
  }
};
