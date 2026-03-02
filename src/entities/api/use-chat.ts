import { api } from "@/shared/api";

export interface FetchChatMessagesParams {
  limit?: number;
  offset?: number;
}

export const fetchChatMessages = async (params: FetchChatMessagesParams) => {
  const { data } = await api.get('/v1/ai-chat/messages', { params });
  return data;
}
