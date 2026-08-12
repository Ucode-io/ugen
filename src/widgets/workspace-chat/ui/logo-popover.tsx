'use client'

import { useQuery } from '@tanstack/react-query'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui'
import { useAuthStore, useIsSuperAdmin } from '@/entities/session'
import { useRouter } from '@/shared/lib/i18n/navigation'
import { api } from '@/shared/api'
import { ChevronLeft } from 'lucide-react'
import { useGuardedAction } from '@/widgets/project-workspace/lib/save-flow'
import { useTranslations } from 'next-intl'

function TokenBar({ label, item, color }: { label: string; item: any; color: string }) {
  const current = item?.current || 0
  const limit = item?.limit || 0
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0
  const remaining = Math.max(limit - current, 0)
  const isHigh = pct >= 80

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-muted">{label}</span>
        <span className={`text-xs font-semibold tabular-nums ${isHigh ? 'text-destructive' : 'text-text-main'}`}>
          {current.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-bg-main overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-destructive' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-text-muted">{remaining.toLocaleString()} remaining</span>
    </div>
  )
}

export const LogoPopover = ({
  projectTitle,
  open,
  onOpenChange,
}: {
  projectTitle?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) => {
  const t = useTranslations('widgets.workspaceChat')
  const router = useRouter()
  const project = useAuthStore((state) => state.project)
  const workspaceName = project?.title || 'Workspace'

  const apiKey = useAuthStore((state) => state.apiKey)
  const guardedAction = useGuardedAction()

  const isSuperAdmin = useIsSuperAdmin()

  const { data: pricingData } = useQuery({
    queryKey: ['pricing-company-stats', apiKey],
    queryFn: async () => {
      const headers = apiKey ? { Authorization: 'API-KEY', 'x-api-key': apiKey } : {}
      const { data } = await api.get('/v1/pricing/company-stats', { headers })
      return data
    },
    enabled: !isSuperAdmin,
    staleTime: 0,
  })

  const toTokenUsage = (t?: { input_tokens?: number; output_tokens?: number; limit?: number }) =>
    t ? { current: (t.input_tokens ?? 0) + (t.output_tokens ?? 0), limit: t.limit ?? 0 } : undefined

  const tokens = pricingData?.data?.tokens
  const dailyTokens = toTokenUsage(tokens?.daily)
  const monthlyTokens = toTokenUsage(tokens?.monthly)

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button className="h-8 flex items-center justify-center rounded-lg hover:bg-hover-bg transition-all px-1.5">
          <img src="/logo.svg" className="h-5 w-auto block shrink-0" alt="Ucode" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={8} className="w-72 p-0 bg-bg-card border border-border-subtle rounded-[10px] shadow-xl overflow-hidden">
        {/* Back to workspace */}
        <button
          onClick={() => guardedAction(() => router.push('/'))}
          className="flex items-center gap-3 w-full px-4 py-4 hover:bg-hover-bg transition-colors text-left border-b border-border-subtle"
        >
          <ChevronLeft size={16} className="text-text-muted shrink-0" />
          <span className="text-[15px] font-medium text-text-main leading-snug">
            Back to {workspaceName}'s Workspace
          </span>
        </button>

        {/* Token usage */}
        <div className="px-4 py-4 flex flex-col gap-4">
          <div className="bg-bg-sidebar border border-border-subtle rounded-xl p-4 flex flex-col gap-4">
            <TokenBar
              label={t('dailyTokens')}
              item={dailyTokens}
              color="bg-pink-500"
            />

            <div className="h-px bg-border-subtle" />

            <TokenBar
              label={t('monthlyTokens')}
              item={monthlyTokens}
              color="bg-orange-500"
            />
          </div>

          {/* Upgrade */}
          <button className="text-primary text-sm font-semibold text-left hover:text-primary/80 transition-colors">
            {t('upgradeYourPlan')}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
