'use client'
import { useEffect, useState } from 'react'
import { Loader2, GitCommit, AlertCircle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/shared/ui'
import { useSaveFlowStore } from '../model/save-flow-store'
import { useTranslations } from 'next-intl'

export const CommitModal = () => {
  const t = useTranslations('widgets.projectWorkspace')
  const open = useSaveFlowStore((s) => s.commitOpen)
  const params = useSaveFlowStore((s) => s.commitParams)
  const close = useSaveFlowStore((s) => s.closeCommitModal)

  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setMessage(params?.defaultMessage ?? '')
      setError(null)
    }
  }, [open, params?.defaultMessage])

  const handleSubmit = async () => {
    if (!message.trim() || !params) return
    setSubmitting(true)
    setError(null)
    try {
      await params.onSubmit(message.trim())
      close()
    } catch (err: any) {
      setError(err?.message || 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-main">
            <GitCommit size={16} className="text-primary" />
            {t('saveChanges')}
          </DialogTitle>
          <DialogDescription className="text-text-muted text-xs">
            {params?.files.length ?? 0} file{(params?.files.length ?? 0) === 1 ? '' : 's'} will be committed.
          </DialogDescription>
        </DialogHeader>

        {params && params.files.length > 0 && (
          <div className="max-h-32 overflow-y-auto rounded-lg border border-border-subtle bg-bg-sidebar/50 p-2 space-y-0.5">
            {params.files.map((f) => (
              <div key={f.path} className="text-[11px] font-mono text-text-muted truncate">
                {f.path}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {t('commitMessage')}
          </label>
          <input
            autoFocus
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && message.trim()) handleSubmit() }}
            placeholder="describe your change"
            disabled={submitting}
            className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-bg-main text-text-main text-sm outline-none focus:border-primary/50 disabled:opacity-60"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-[12px] text-red-500">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <div className="break-words">{error}</div>
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors disabled:opacity-60"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!message.trim() || submitting}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-60 inline-flex items-center gap-1.5"
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            {error ? 'Retry' : 'Save'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
