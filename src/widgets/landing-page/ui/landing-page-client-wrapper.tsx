'use client'

import { ReactNode, useEffect } from 'react'
import { useAuthStore } from '@/entities/session'
import { DashboardHome } from "@/widgets/dashboard-home";
import { useRouter } from "@/shared/lib/i18n/navigation"
import { pageview } from "@/shared/lib/gtag"

export const LandingPageClientWrapper = ({ children }: { children: ReactNode }) => {
  const { activeView, isAuthenticated, project } = useAuthStore();
  const router = useRouter()

  const shouldRedirectToProjects = isAuthenticated && project?.is_ugen === false

  useEffect(() => {
    if (shouldRedirectToProjects) {
      router.replace('/projects' as any)
    }
  }, [shouldRedirectToProjects, router])

  // The hero and the dashboard home share the "/" URL, so send a distinct GA
  // pageview for each view (the route tracker in GoogleAnalytics skips "/").
  useEffect(() => {
    if (shouldRedirectToProjects) return

    if (activeView === 'dashboard') {
      pageview('/dashboard-home', 'Dashboard Home')
    } else {
      pageview('/', 'Home')
    }
  }, [activeView, shouldRedirectToProjects])

  if (shouldRedirectToProjects) return null

  if (activeView === 'dashboard') {
    return <DashboardHome />
  }

  return <>{children}</>
}
