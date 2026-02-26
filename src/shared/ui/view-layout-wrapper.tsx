'use client'
import { ReactNode, useEffect, useState } from 'react'
import { useAuthStore } from '@/entities/session'
import { Sidebar } from "@/widgets/sidebar"
import { Header } from "@/widgets/header"

export const ViewLayoutWrapper = ({ children }: { children: ReactNode }) => {
  const { activeView } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Avoid hydration mismatch by rendering a generic empty wrapper or skeleton before state is known
    return <div className="min-h-screen bg-bg-main" />
  }

  if (activeView === 'dashboard') {
    return (
      <div className="flex min-h-screen bg-bg-main">
        <Sidebar />
        <main className="flex-1 overflow-y-auto rounded-2xl m-3">
          {/* Dashboard needs full height to scroll properly inside */}
          <div className="h-full relative">
            {children}
          </div>
        </main>
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
