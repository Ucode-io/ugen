'use client'
import { useEffect, useState } from 'react'
import { useRouter } from '@/shared/lib/i18n/navigation'
import { useAuthStore } from '@/entities/session'

export const GuestGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    if (isAuthenticated) {
      router.replace('/dashboard') // redirect to dashboard if already authenticated
    }
  }, [isAuthenticated, router])

  // Prevent flash of content or hydration mismatch
  if (!isMounted) return null

  if (isAuthenticated) {
    return null // Could also return a full screen loader here
  }

  return <>{children}</>
}
