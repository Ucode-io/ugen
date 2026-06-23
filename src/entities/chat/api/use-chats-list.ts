import { useQuery, useInfiniteQuery } from "@tanstack/react-query"
import { api } from "@/shared/api"

export interface ChatListItem {
  id: string
  title: string
  description?: string
  model?: string
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
  const { data } = await api.get('/v1/ai-chat/list', {
    params: { ...cleaned, type: 'ugen' },
  })
  return data
}

type ChatsQueryOptions = {
  enabled?: boolean
  staleTime?: number
  refetchOnMount?: boolean | 'always'
}

export const useChatsList = (
  rawParams?: FetchChatsListParams,
  options?: ChatsQueryOptions
) => {
  const params = cleanParams(rawParams)
  return useQuery({
    queryKey: ['chats', 'list', params],
    queryFn: () => fetchChatsList(params),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: options?.staleTime,
    refetchOnMount: options?.refetchOnMount,
  })
}

const CHATS_PAGE_SIZE = 20

export const useChatsListInfinite = (
  rawParams?: Omit<FetchChatsListParams, 'offset' | 'limit'>,
  options?: ChatsQueryOptions
) => {
  const base = cleanParams(rawParams) ?? {}
  return useInfiniteQuery({
    queryKey: ['chats', 'list', 'infinite', base],
    queryFn: ({ pageParam = 0 }) =>
      fetchChatsList({ ...base, limit: CHATS_PAGE_SIZE, offset: pageParam as number }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const chats = lastPage?.data?.chats ?? []
      if (chats.length < CHATS_PAGE_SIZE) return undefined
      const loaded = allPages.reduce(
        (acc, p) => acc + (p?.data?.chats?.length ?? 0),
        0
      )
      const total = lastPage?.data?.count ?? 0
      return loaded < total ? loaded : undefined
    },
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: options?.staleTime,
    refetchOnMount: options?.refetchOnMount,
  })
}
