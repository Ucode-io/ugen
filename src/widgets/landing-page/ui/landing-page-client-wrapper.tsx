'use client'

import { ReactNode, useEffect } from 'react'
import { useAuthStore } from '@/entities/session'
import { DashboardHome } from "@/widgets/dashboard-home";
import { useRouter } from "@/shared/lib/i18n/navigation"

export const LandingPageClientWrapper = ({ children }: { children: ReactNode }) => {
  const { activeView, isAuthenticated, project } = useAuthStore();
  const router = useRouter()

  const shouldRedirectToProjects = isAuthenticated && project?.is_ugen === false

  useEffect(() => {
    if (shouldRedirectToProjects) {
      router.replace('/projects' as any)
    }
  }, [shouldRedirectToProjects, router])

  if (shouldRedirectToProjects) return null

  if (activeView === 'dashboard') {
    return <DashboardHome />
  }

  return <>{children}</>
}
