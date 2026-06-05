import { useEffect } from "react"
import { useAuthStore } from "@/entities/session"
import { useCurrentSubscription } from "./use-billing"

/**
 * Keeps the auth store's `project.fare_id` aligned with the authoritative
 * GET /v1/subscription/current response.
 *
 * The backend auto-downgrades an expired paid plan to free at the end of the
 * billing period, but the store's fare_id (set at login / on attach-fare) is
 * not updated by that server-side transition. Every "current plan" surface
 * (project dropdown, billing tab, profile modal, pricing page, useFreePlan)
 * reads the store, so without this sync they keep showing the old paid plan
 * even though /current already reports the downgraded (free) one.
 *
 * Mount once in an always-present dashboard host (the sidebar). The effect only
 * writes when /current reports a *different* fare than the store, so it never
 * fights the optimistic fare_id set right after a successful upgrade -- that
 * value only gets "corrected" if the backend genuinely reports something else.
 */
export const useSyncCurrentPlan = () => {
  const projectId = useAuthStore((s) => s.project?.project_id ?? null)
  const { data: currentSubscription } = useCurrentSubscription(
    projectId,
    Boolean(projectId),
  )
  const apiFareId = currentSubscription?.fare_id

  useEffect(() => {
    if (!apiFareId) return
    const project = useAuthStore.getState().project
    if (!project || project.fare_id === apiFareId) return
    useAuthStore.setState({ project: { ...project, fare_id: apiFareId } })
  }, [apiFareId])

  return currentSubscription
}
