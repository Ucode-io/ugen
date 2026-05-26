'use client'

import { useEffect } from 'react'
import { Loader2, RefreshCw, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui'
import { githubIntegrationApi } from '@/features/github-integration'
import { cn } from '@/shared/lib/utils/cn'
import { centeredPopupFeatures } from '@/shared/lib/utils/centered-popup'

const GithubIcon = ({ size = 16, className }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
)

export const GithubPopover = () => {
  const queryClient = useQueryClient()

  // GitHub integration is user-level, not project-level — keying by projectId
  // caused a refetch on every project switch. A long staleTime keeps the icon
  // state fresh without re-validating on every navigation.
  const { data: githubStatus, isLoading } = useQuery({
    queryKey: ['github-integration-status'],
    queryFn: githubIntegrationApi.validate,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const { data: githubIntegration } = useQuery({
    queryKey: ['github-integration'],
    queryFn: githubIntegrationApi.getIntegration,
    enabled: githubStatus?.connected === true,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  // Popup is opened synchronously on click (see openOAuthPopup) so popup
  // blockers allow it; the mutation then points it at the fetched authorize URL.
  const openOAuthPopup = () =>
    window.open('about:blank', '_blank', centeredPopupFeatures(600, 720, 'popup'))

  const { mutate: connectGithub, isPending: isConnecting } = useMutation({
    mutationFn: async (popup: Window | null) => {
      try {
        const url = await githubIntegrationApi.getConnectUrl()
        if (popup && !popup.closed) popup.location.href = url
        else window.open(url, '_blank')
      } catch (err) {
        popup?.close()
        throw err
      }
    },
  })

  const { mutate: disconnectGithub, isPending: isDisconnecting } = useMutation({
    mutationFn: (id: string) => githubIntegrationApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-integration-status'] })
      queryClient.invalidateQueries({ queryKey: ['github-integration'] })
    },
  })

  // The /oauth/success popup postMessages back when the connection lands.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      const d = e.data
      if (d?.source !== 'ucode-oauth' || d.provider !== 'github' || d.status !== 'success') return
      queryClient.invalidateQueries({ queryKey: ['github-integration-status'] })
      queryClient.invalidateQueries({ queryKey: ['github-integration'] })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [queryClient])

  const isConnected = githubStatus?.connected === true
  const isExpired = githubStatus?.connected === false && githubStatus?.reason === 'token_expired'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          title="GitHub Integration"
          className={cn(
            'flex items-center justify-center w-7 h-7 rounded-lg border transition-all',
            isConnected
              ? 'border-green-500/60 text-green-500 bg-green-500/8 hover:bg-green-500/15'
              : isExpired
                ? 'border-destructive/50 text-destructive bg-destructive/8 hover:bg-destructive/15'
                : 'border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg'
          )}
        >
          {isLoading
            ? <Loader2 size={14} className="animate-spin" />
            : <GithubIcon size={14} />
          }
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-0 bg-bg-card border-border-subtle rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-subtle">
          <GithubIcon size={15} className="text-text-muted shrink-0" />
          <span className="text-sm font-semibold text-text-main">GitHub Integration</span>
          {isConnected && (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-green-500">
              <CheckCircle2 size={11} />
              Active
            </span>
          )}
          {isExpired && (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-destructive">
              <AlertCircle size={11} />
              Expired
            </span>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* Connected state */}
          {isConnected && githubStatus.user && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-sidebar border border-border-subtle">
              {githubStatus.user.avatar_url ? (
                <img
                  src={githubStatus.user.avatar_url}
                  alt={githubStatus.user.login}
                  className="w-9 h-9 rounded-full border border-border-subtle shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-bg-card border border-border-subtle flex items-center justify-center shrink-0">
                  <GithubIcon size={16} className="text-text-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-text-main truncate">@{githubStatus.user.login}</div>
                {githubStatus.user.name && (
                  <div className="text-[11px] text-text-muted truncate">{githubStatus.user.name}</div>
                )}
              </div>
            </div>
          )}

          {/* Expired state */}
          {isExpired && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/8 border border-destructive/20">
              <AlertCircle size={15} className="text-destructive shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-text-main">Token expired</div>
                <div className="text-[11px] text-text-muted mt-0.5">Reconnect to restore access to your repositories.</div>
              </div>
            </div>
          )}

          {/* Not connected state */}
          {!isConnected && !isExpired && !isLoading && (
            <div className="text-center py-2">
              <div className="text-sm text-text-muted">Not connected</div>
              <div className="text-[11px] text-text-muted mt-0.5">Connect GitHub to manage your repositories.</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {isConnected && (
              <button
                onClick={() => githubIntegration && disconnectGithub(githubIntegration.id)}
                disabled={isDisconnecting || !githubIntegration}
                className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border border-border-subtle bg-bg-main text-xs font-semibold text-destructive hover:bg-destructive/8 transition-colors disabled:opacity-50"
              >
                {isDisconnecting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Disconnect
              </button>
            )}
            <button
              onClick={() => connectGithub(openOAuthPopup())}
              disabled={isConnecting}
              className={cn(
                'flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50',
                isConnected
                  ? 'px-3 border border-border-subtle bg-bg-main text-text-muted hover:bg-hover-bg'
                  : 'flex-1 bg-primary hover:bg-primary/90 text-white'
              )}
            >
              {isConnecting
                ? <Loader2 size={12} className="animate-spin" />
                : isConnected ? <RefreshCw size={12} /> : <GithubIcon size={12} />
              }
              {isConnecting ? 'Connecting…' : isConnected ? 'Reconnect' : 'Connect GitHub'}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
