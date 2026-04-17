'use client'
import { ReactNode, useEffect, useState } from 'react'
import { useAuthStore } from '@/entities/session'
import { Sidebar } from "@/widgets/sidebar"
import { Header } from "@/widgets/header"
import { PendingJoinModal } from '@/features/pending-join/ui/pending-join-modal'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'

export const ViewLayoutWrapper = ({ children }: { children: ReactNode }) => {
  const { activeView } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  const { theme } = useTheme()
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if we are on projects/[id] page (where [id] is dynamic, e.g., /en/projects/123)
  const isProjectSinglePage = /^\/projects\/[^/]+$/.test(pathname)

  if (!mounted) {
    // Avoid hydration mismatch by rendering a generic empty wrapper or skeleton before state is known
    return <div className="min-h-screen bg-bg-main" />
  }

  // If this is the project single page, do not render dashboard layout/wrappers
  if (isProjectSinglePage) {
    return <main className="flex min-h-screen bg-bg-main w-full flex-col">{children}</main>
  }

  if (activeView === 'dashboard') {
    return (
      <div className="flex h-screen bg-bg-main overflow-hidden">
        <Sidebar />
        <main className={`flex-1 overflow-y-auto rounded-2xl m-3 border ${theme === 'dark' ? 'border-border-subtle' : 'border-border-subtle'}`}>
          <div className="h-full relative">
            {children}
          </div>
        </main>
        <PendingJoinModal />
      </div>
    )
  }

  // home view (guest)
  return (
    <div className="flex min-h-screen flex-col bg-bg-main">
      <Header />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
