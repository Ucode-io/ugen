import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/api"
import { useAuthStore, useIsSuperAdmin } from "@/entities/session"
import type {
  BillingTransaction,
  CompanyPricingStats,
  CurrentSubscription,
  Fare,
  ProjectCard,
  ProjectWithBalance,
  TokenPack,
  TokenPackBalance,
  TokenPackPurchaseResponse,
  TokenPackWritePayload,
} from "../model/types"

const buildBearerConfig = (token: string, projectId?: string | null) => {
  return {
    headers: { Authorization: `Bearer ${token}` },
    params: projectId ? { "project-id": projectId } : undefined,
  }
}

const buildTokenPackConfig = (projectId?: string | null) => {
  const resolvedProjectId = projectId ?? useAuthStore.getState().project?.project_id
  const config = buildBearerConfig(projectId)
  return {
    ...config,
    params: resolvedProjectId ? { "project-id": resolvedProjectId } : undefined,
    headers: {
      ...config.headers,
      ...(resolvedProjectId
        ? { project_id: resolvedProjectId, "project-id": resolvedProjectId }
        : {}),
    },
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

export const useTokenPacks = (
  projectId?: string | null,
  enabled = true,
) => {
  const accessToken = useAuthStore((state) => state.accessToken)
  return useQuery({
    queryKey: ["billing", "token-packs", "ugen", projectId],
    queryFn: async () => {
      const config = buildTokenPackConfig(projectId)
      const { data } = await api.get("/v1/token-pack", {
        ...config,
        params: {
          ...config.params,
          only_active: true,
          product_type: "ugen",
        },
      })
      const packs: TokenPack[] = data?.data?.token_packs ?? data?.token_packs ?? []
      return packs
    },
    enabled: enabled && Boolean(accessToken),
    staleTime: 60_000,
  })
}

export const useAdminTokenPacks = (
  productType: "ugen" | "ucode" = "ugen",
  enabled = true,
) => {
  const accessToken = useAuthStore((state) => state.accessToken)
  return useQuery({
    queryKey: ["billing", "token-packs", "admin", productType],
    queryFn: async () => {
      const config = buildTokenPackConfig()
      const { data } = await api.get("/v1/token-pack", {
        ...config,
        params: {
          ...config.params,
          only_active: false,
          product_type: productType,
        },
      })
      const packs: TokenPack[] = data?.data?.token_packs ?? data?.token_packs ?? []
      return {
        packs,
        count: Number(data?.data?.count ?? data?.count ?? packs.length),
      }
    },
    enabled: enabled && Boolean(accessToken),
    staleTime: 30_000,
  })
}

export const useTokenPackBalance = (
  projectId?: string | null,
  enabled = true,
) => {
  const accessToken = useAuthStore((state) => state.accessToken)
  return useQuery({
    queryKey: ["billing", "token-pack-balance", projectId],
    queryFn: async () => {
      const { data } = await api.get(
        "/v1/token-pack/balance",
        buildTokenPackConfig(projectId),
      )
      return (data?.data ?? data) as TokenPackBalance
    },
    enabled: enabled && Boolean(accessToken),
    staleTime: 30_000,
  })
}

export const usePricingCompanyStats = (
  projectId?: string | null,
  enabled = true,
) => {
  const accessToken = useAuthStore((state) => state.accessToken)
  return useQuery({
    queryKey: ["pricing-company-stats", projectId],
    queryFn: async () => {
      const { data } = await api.get(
        "/v1/pricing/company-stats",
        buildTokenPackConfig(projectId),
      )
      return (data?.data ?? data) as CompanyPricingStats
    },
    enabled: enabled && Boolean(accessToken),
    staleTime: 30_000,
  })
}

export const usePurchaseTokenPack = (projectId?: string | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (packId: string) => {
      const { data } = await api.post(
        "/v1/token-pack/purchase",
        { pack_id: packId },
        buildTokenPackConfig(projectId),
      )
      return (data?.data ?? data) as TokenPackPurchaseResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "token-pack-balance"] })
      queryClient.invalidateQueries({ queryKey: ["pricing-company-stats"] })
      queryClient.invalidateQueries({ queryKey: ["billing", "transactions"] })
      queryClient.invalidateQueries({ queryKey: ["billing", "company-project"] })
    },
  })
}

export const useCreateTokenPack = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TokenPackWritePayload) => {
      const { data } = await api.post(
        "/v1/token-pack",
        payload,
        buildTokenPackConfig(),
      )
      return (data?.data ?? data) as TokenPack
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "token-packs"] })
    },
  })
}

export const useUpdateTokenPack = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TokenPackWritePayload & { id: string }) => {
      const { data } = await api.put(
        "/v1/token-pack",
        payload,
        buildTokenPackConfig(),
      )
      return (data?.data ?? data) as TokenPack
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "token-packs"] })
    },
  })
}

export const useDeleteTokenPack = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/v1/token-pack/${id}`, buildTokenPackConfig())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "token-packs"] })
    },
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
