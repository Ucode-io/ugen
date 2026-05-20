import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      // Don't retry billing-limit errors (402) — the limit won't clear on retry
      // and it just re-hits the endpoint. Retry everything else once.
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 402) return false
        return failureCount < 1
      },
    },
  },
})
