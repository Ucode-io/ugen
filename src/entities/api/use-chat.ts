import { api } from "@/shared/api";

export interface FetchChatMessagesParams {
  limit?: number;
  offset?: number;
}

export type ChatMessageReaction = "like" | "dislike";

export const fetchChatMessages = async (params: FetchChatMessagesParams) => {
  const { data } = await api.get('/v1/ai-chat/messages', { params });
  return data;
}

export const createChatMessageReaction = async (
  assistantMessageId: string,
  reaction: ChatMessageReaction,
) => {
  const { data } = await api.post(
    `/v1/ai-chat/messages/${assistantMessageId}/reaction`,
    { reaction_type: reaction },
  );
  return data;
};

export const deleteChatMessageReaction = async (assistantMessageId: string) => {
  const { data } = await api.delete(
    `/v1/ai-chat/messages/${assistantMessageId}/reaction`,
  );
  return data;
};
