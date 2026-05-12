import { useQuery } from "@tanstack/react-query"
import { api } from "@/shared/api"

export interface ChatListItem {
  id: string
  title: string
  project_id: string
  project_name?: string
  project_title?: string
  updated_at: string
  created_at: string
}

export interface FetchChatsListParams {
  title?: string
  order_by?: string
  order_direction?: string
  limit?: number
  offset?: number
}

const cleanParams = (params?: FetchChatsListParams) => {
  if (!params) return undefined
  const cleaned: Record<string, any> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value
    }
  }
  return cleaned
}

export const fetchChatsList = async (params?: FetchChatsListParams) => {
  const cleaned = cleanParams(params)
  const { data } = await api.get('/v1/ai-chat', { params: cleaned })
  return data
}

export const useChatsList = (
  rawParams?: FetchChatsListParams,
  options?: { enabled?: boolean }
) => {
  const params = cleanParams(rawParams)
  return useQuery({
    queryKey: ['chats', 'list', params],
    queryFn: () => fetchChatsList(params),
    enabled: options?.enabled !== undefined ? options.enabled : true,
  })
}
