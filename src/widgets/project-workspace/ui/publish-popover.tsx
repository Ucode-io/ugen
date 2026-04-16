'use client'
import { useState, useMemo } from 'react'
import { Copy, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  Popover, PopoverContent, PopoverTrigger,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui'
import { useRoles } from '../api/users'
import { useAuthStore } from '@/entities/session'

interface PublishPopoverProps {
  projectTitle: string
  projectUrl?: string
}

export const PublishPopover = ({ projectTitle }: PublishPopoverProps) => {
  const t = useTranslations('features.project')
  const { project } = useAuthStore()
  const ucodeProjectId = useAuthStore(state => state.ucodeProjectId)

  const projectId = project?.project_id || ''
  const envId = project?.environment_id || ''
  const companyName = project?.title || ''

  const [visibility, setVisibility] = useState<'public' | 'workspace'>('public')
  const [role, setRole] = useState<{ label: string; value: string; client_type_id: string } | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const { data: roleOptions = [] } = useRoles({ projectId })

  const inviteLink = useMemo(() => {
    if (visibility !== 'workspace' || !role || !role.client_type_id) return ''
    const domain = typeof window !== 'undefined' ? window.location.origin : ''
    const params = new URLSearchParams({
      'project-id': ucodeProjectId || projectId,
      'env_id': envId,
      'role_id': role.value,
      'client_type_id': role.client_type_id,
      'name': projectTitle,
      'companyName': companyName,
    })
    return `${domain}/workspace?${params.toString()}`
  }, [visibility, ucodeProjectId, projectId, envId, role, projectTitle, companyName])

  const copyLink = () => {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="bg-primary text-white hover:bg-primary-hover px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors">
          {t('publish')}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[340px] p-0 bg-bg-card border border-border-subtle rounded-xl shadow-xl">
        <div className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-text-main">{t('publishTitle')}</h2>

          {/* Visibility select */}
          <Select
            value={visibility}
            onValueChange={(v) => {
              setVisibility(v as 'public' | 'workspace')
              setRole(null)
            }}
          >
            <SelectTrigger className="w-full h-9 text-sm bg-bg-main">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">{t('visibilityPublic')}</SelectItem>
              <SelectItem value="workspace">{t('visibilityWorkspace')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Workspace — role select + invite link */}
          {visibility === 'workspace' && (
            <div className="space-y-3">
              <Select
                value={role?.value || ''}
                onValueChange={(v) => {
                  const opt = roleOptions.find(o => o.value === v)
                  if (opt) setRole({ label: opt.label, value: opt.value, client_type_id: opt.client_type_id || '' })
                }}
              >
                <SelectTrigger className="w-full h-9 text-sm bg-bg-main">
                  <SelectValue placeholder={t('role')} />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {inviteLink && (
                <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-main px-3 py-2">
                  <span className="flex-1 truncate font-mono text-xs text-text-muted">
                    {inviteLink}
                  </span>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="shrink-0 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                  >
                    {isCopied ? <Check size={13} /> : <Copy size={13} />}
                    {isCopied ? t('copied') : t('copy')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Publish button */}
          <button className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors">
            {t('publishApp')}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
