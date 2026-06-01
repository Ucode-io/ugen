import { useMemo } from "react"
import { useAuthStore } from "@/entities/session"
import { useFare } from "./use-billing"

/**
 * Resolves whether the active project is on the free (ugen) plan and should be
 * offered an upgrade. The upgrade CTA is hidden for paid plans and for non-ugen
 * (ucode) projects, whose plans can't be changed through the ugen upgrade dialog.
 *
 * Shared by every "Upgrade plan" surface (button, sidebar card) so the
 * visibility rule lives in a single place. `useFare` is keyed by fare/project,
 * so concurrent callers reuse the same cached query.
 */
export const useFreePlan = () => {
  const project = useAuthStore((s) => s.project)
  const isUgen = project?.is_ugen ?? false
  const fareId = project?.fare_id ?? null
  const projectId = project?.project_id ?? null

  const { data: fare } = useFare(fareId, projectId)

  // Free when no fare is attached, or the attached fare is the $0 / "free" plan.
  // While a real fareId is still resolving we report not-free, so CTAs never
  // flash for paid users between mount and the fare landing.
  const isFreePlan = useMemo(() => {
    if (!fareId) return true
    if (!fare) return false
    const name = (fare.name ?? "").toLowerCase()
    return Number(fare.price) <= 0 || name === "free"
  }, [fareId, fare])

  return {
    fare,
    isUgen,
    isFreePlan,
    /** True only when the upgrade CTA should be visible. */
    canUpgrade: isUgen && isFreePlan,
  }
}
