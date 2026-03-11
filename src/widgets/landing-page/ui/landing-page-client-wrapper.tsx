'use client'

import { ReactNode } from 'react'
import { useAuthStore } from '@/entities/session'
import { DashboardHome } from '@/widgets/dashboard-home'

export const LandingPageClientWrapper = ({ children }: { children: ReactNode }) => {
  const { activeView } = useAuthStore()

  if (activeView === 'dashboard') {
    return <DashboardHome />
  }

  return <>{children}</>
}
