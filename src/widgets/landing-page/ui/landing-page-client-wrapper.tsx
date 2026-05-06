'use client'

import { ReactNode } from 'react'
import { useAuthStore } from '@/entities/session'
import { DashboardHome } from '@/widgets/dashboard-home'
import { useRouter } from "@/shared/lib/i18n";

export const LandingPageClientWrapper = ({ children }: { children: ReactNode }) => {
  const { activeView, project } = useAuthStore();
  const isUgen = project?.is_ugen ?? false;

  const router = useRouter();

  if (!isUgen) router.push(`/projects`);

  if (activeView === 'dashboard') {
    return <DashboardHome />
  }

  return <>{children}</>
}
