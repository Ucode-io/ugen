'use client'
import { useAuthStore } from '@/entities/session'
import { DashboardHome } from '@/widgets/dashboard-home'

export default function RootHomePage() {
  const { activeView } = useAuthStore()

  if (activeView === 'dashboard') {
    return <DashboardHome />
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
      <h1 className="text-4xl font-bold text-text-main">
        Welcome to Ugen
      </h1>
    </div>
  )
}
