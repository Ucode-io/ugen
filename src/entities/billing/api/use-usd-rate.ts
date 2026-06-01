import { useQuery } from "@tanstack/react-query"
import axios from "axios"

/**
 * USD → UZS reference rate from the Central Bank of Uzbekistan, used to show a
 * dollar equivalent for UZS balances and prices. Returns the number of UZS per
 * 1 USD (or null when unavailable). Cached for an hour; shared across callers
 * via its query key.
 */
export const useUsdRate = (enabled = true) => {
  return useQuery({
    queryKey: ["cbu", "usd-uzs-rate"],
    queryFn: async () => {
      const { data } = await axios.get(
        "https://cbu.uz/uz/arkhiv-kursov-valyut/json/",
      )
      const usd = Array.isArray(data)
        ? data.find((item: any) => item?.Ccy === "USD")
        : null
      const rate = Number(usd?.Rate)
      return Number.isFinite(rate) && rate > 0 ? rate : null
    },
    enabled,
    staleTime: 1000 * 60 * 60,
    retry: 1,
  })
}

/** Formats a USD amount, e.g. 94.8 → "$94.80". */
export const formatUsd = (usd: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(usd)

/** Converts a UZS amount to USD using the rate, or null when not convertible. */
export const uzsToUsd = (uzs: number, rate?: number | null): number | null =>
  rate && rate > 0 ? uzs / rate : null
