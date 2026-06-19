import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/api"
import { useAuthStore, useIsSuperAdmin } from "@/entities/session"
import type {
  BillingTransaction,
  CurrentSubscription,
  Fare,
  ProjectCard,
  ProjectWithBalance,
} from "../model/types"

const buildBearerConfig = (token: string, projectId?: string | null) => {
  return {
    headers: { Authorization: `Bearer ${token}` },
    params: projectId ? { "project-id": projectId } : undefined,
  }
}

export const useCompanyProjectsList = (companyId?: string | null, projectId?: string | null) => {
  const token = useAuthStore((state) => state.accessToken)
  return useQuery({
    queryKey: ["billing", "company-project", companyId, projectId],
    queryFn: async () => {
      const { data } = await api.get("/v1/company-project", {
        ...buildBearerConfig(token!, projectId),
        params: {
          ...buildBearerConfig(token!, projectId).params,
          company_id: companyId,
        },
      })
      const projects: ProjectWithBalance[] =
        data?.data?.projects ?? data?.projects ?? []
      return projects
    },
    enabled: Boolean(companyId && token),
  })
}

export const useFare = (fareId?: string | null, projectId?: string | null) => {
  // Skip while the super-admin is on their own project -- the fare-by-id call is
  // meaningless there (see useIsSuperAdmin).
  const isSuperAdmin = useIsSuperAdmin()
  const token = useAuthStore((state) => state.accessToken)
  return useQuery({
    queryKey: ["billing", "fare", fareId, projectId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/fare/${fareId}`, buildBearerConfig(token!, projectId))
      return (data?.data ?? data) as Fare
    },
    enabled: Boolean(fareId && token) && !isSuperAdmin,
  })
}

export const useCurrentSubscription = (
  projectId?: string | null,
  enabled = true,
  refetchInterval?: number,
) => {
  // Skip while the super-admin is on their own project (see useIsSuperAdmin).
  const isSuperAdmin = useIsSuperAdmin()
  const token = useAuthStore((state) => state.accessToken)
  return useQuery({
    queryKey: ["billing", "subscription", "current", projectId],
    queryFn: async () => {
      const { data } = await api.get(
        "/v1/subscription/current",
        buildBearerConfig(token!, projectId),
      )
      return (data?.data ?? data) as CurrentSubscription
    },
    // The endpoint is scoped to the current project via the JWT, so it works
    // without a projectId param -- gate only on the caller's `enabled` flag.
    enabled: enabled && Boolean(token) && !isSuperAdmin,
    refetchInterval,
  })
}

export const useTransactions = (projectId?: string | null, enabled = true) => {
  const token = useAuthStore((state) => state.accessToken)
  return useQuery({
    queryKey: ["billing", "transactions", projectId],
    queryFn: async () => {
      const { data } = await api.get("/v1/transaction", buildBearerConfig(token!, projectId))
      const transactions: BillingTransaction[] =
        data?.data?.transactions ?? data?.transactions ?? []
      return transactions
    },
    enabled: Boolean(projectId && token) && enabled,
  })
}

export const useCardList = (projectId?: string | null, enabled = true) => {
  const token = useAuthStore((state) => state.accessToken)
  return useQuery({
    queryKey: ["billing", "cards", projectId],
    queryFn: async () => {
      const { data } = await api.get("/v1/payment/card-list", {
        ...buildBearerConfig(token!, projectId),
        params: {
          ...buildBearerConfig(token!, projectId).params,
          limit: 10,
        },
      })
      const cards: ProjectCard[] =
        data?.data?.project_cards ?? data?.project_cards ?? []
      return cards
    },
    enabled: Boolean(projectId && token) && enabled,
  })
}

interface CardVerifyResponse {
  project_card_id: string
}

export const useCardVerify = (projectId?: string | null) => {
  return useMutation({
    mutationFn: async (payload: { pan: string; expire: string }) => {
      const token = useAuthStore.getState().accessToken
      if (!token) throw new Error("Not authenticated")
      const { data } = await api.post(
        "/v1/payment/get-verify-code",
        payload,
        buildBearerConfig(token, projectId),
      )
      return (data?.data ?? data) as CardVerifyResponse
    },
  })
}

export const useCardOtpVerify = (projectId?: string | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { code: string; project_card_id: string }) => {
      const token = useAuthStore.getState().accessToken
      if (!token) throw new Error("Not authenticated")
      const { data } = await api.post(
        "/v1/payment/verify",
        payload,
        buildBearerConfig(token, projectId),
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "cards"] })
    },
  })
}

export const useCardDelete = (projectId?: string | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (cardId: string) => {
      const token = useAuthStore.getState().accessToken
      if (!token) throw new Error("Not authenticated")
      const { data } = await api.delete(
        `/v1/payment/card/${cardId}`,
        buildBearerConfig(token, projectId),
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "cards"] })
    },
  })
}

export const useReceiptPay = (projectId?: string | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { project_card_id: string; amount: number }) => {
      const token = useAuthStore.getState().accessToken
      if (!token) throw new Error("Not authenticated")
      const config = buildBearerConfig(token, projectId)
      const { data } = await api.post("/v1/payment/receipt-pay", payload, {
        ...config,
        params: {
          ...config.params,
          limit: 10,
        },
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "transactions"] })
      queryClient.invalidateQueries({ queryKey: ["billing", "company-project"] })
    },
  })
}
