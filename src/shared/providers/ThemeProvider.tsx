'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useUIStore } from '@/shared/model/theme/use-ui-store'
import { useAuthStore } from '@/entities/session'

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const storeTheme = useUIStore((state) => state.theme)
  const activeView = useAuthStore((state) => state.activeView)
  const pathname = usePathname()

  // Public landing pages must always render dark, regardless of user's stored preference.
  // Dashboard (incl. project workspace) keeps the user-controlled theme.
  const isProjectSinglePage = /^\/projects\/[^/]+/.test(pathname)
  const isDashboardLike = activeView === 'dashboard' || isProjectSinglePage
  const effectiveTheme = isDashboardLike ? storeTheme : 'dark'

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(effectiveTheme)
    root.setAttribute('data-theme', effectiveTheme)
  }, [effectiveTheme])

  return <>{children}</>
}
