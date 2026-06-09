'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@/shared/lib/i18n/navigation'
import { useAuthStore } from '@/entities/session'
import { SUPER_ADMIN_USER_ID } from '@/shared/config'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/shared/lib/utils/cn'

export const SuperAdminReturnButton = ({ className }: { className?: string }) => {
  const { user, project, superAdminOrigin, endSuperAdminImpersonation } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  // Visible only to the super-admin user, and only while a home session has been
  // captured (i.e. they switched into another project from the all-projects view).
  if (!superAdminOrigin || user?.id !== SUPER_ADMIN_USER_ID) return null

  const handleReturn = () => {
    endSuperAdminImpersonation()
    queryClient.clear()
    router.push('/dashboard/all-projects' as any)
  }

  return (
    <button
      onClick={handleReturn}
      title="Return to super admin"
      className={cn(
        'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
        className,
      )}
    >
      <ArrowLeft size={16} strokeWidth={2.5} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight">Return to super admin</span>
        {project?.title && (
          <span className="text-primary/70 block truncate text-[11px] leading-tight">
            Viewing: {project.title}
          </span>
        )}
      </span>
    </button>
  )
}
