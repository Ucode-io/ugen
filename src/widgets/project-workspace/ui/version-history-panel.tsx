'use client'
import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, MoreVertical, Rocket, RotateCcw, Code, Check } from "lucide-react"
import { api } from "@/shared/api"
import { useAuthStore } from "@/entities/session"
import { useCodeSelectionStore } from "@/entities/project/model/code-selection-store"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "@/shared/lib/utils/cn"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui"

interface Commit {
  id: string
  short_id: string
  title: string
  message: string
  author_name: string
  committed_date: string
  web_url?: string
}

interface CommitFile {
  file_path: string
  content: string
}

export interface VersionPreviewFile {
  path: string
  content: string
}

interface VersionHistoryPanelProps {
  onClose: () => void
  onSelectCommit: (files: VersionPreviewFile[] | null) => void
  onViewCode: () => void
  onReverted: () => void | Promise<void>
}

const timeAgo = (dateStr: string): string => {
  // Backend returns "2026-04-29 05:06:24 +0000 UTC" — convert to ISO
  const iso = dateStr.replace(' UTC', '').replace(' ', 'T').replace(/ ([+-]\d{4})$/, '$1')
  const date = new Date(iso)
  if (isNaN(date.getTime())) return dateStr
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  const months = Math.floor(diff / 2592000)
  return `${months} month${months !== 1 ? 's' : ''} ago`
}

const mapFiles = (files: CommitFile[]): VersionPreviewFile[] =>
  files.map((f) => ({ path: f.file_path, content: f.content }))

export const VersionHistoryPanel = ({ onClose, onSelectCommit, onViewCode, onReverted }: VersionHistoryPanelProps) => {
  const apiKey = useAuthStore((s) => s.apiKey)
  const activeCodeSelection = useCodeSelectionStore((s) => s.activeCodeSelection)
  const repoId = activeCodeSelection?.repoId
  const queryClient = useQueryClient()

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [selectedSha, setSelectedSha] = useState<string | null>(null)
  const [revertingSha, setRevertingSha] = useState<string | null>(null)
  const [publishingSha, setPublishingSha] = useState<string | null>(null)

  const headers = apiKey ? { Authorization: 'API-KEY', 'x-api-key': apiKey } : {}

  const { data: commits = [], isLoading } = useQuery<Commit[]>({
    queryKey: ['mf-commits', repoId],
    queryFn: async () => {
      const { data } = await api.get('/v2/functions/micro-frontend/commits', {
        params: { repo_id: repoId, limit: 20, page: 1 },
        headers,
      })
      return (data?.data ?? []) as Commit[]
    },
    enabled: !!repoId,
    staleTime: 0,
  })

  // Current = top commit. After revert, BE creates a new commit that becomes commits[0].
  const currentSha = commits[0]?.id ?? null

  // Files at the selected commit — cached forever per (repoId, sha) since commits are immutable
  const { data: selectedFiles, isFetching: isLoadingFiles } = useQuery<VersionPreviewFile[]>({
    queryKey: ['mf-commit-files', repoId, selectedSha],
    queryFn: async () => {
      const { data } = await api.get('/v2/functions/micro-frontend/files-at-commit', {
        params: { repo_id: repoId, commit_sha: selectedSha },
        headers,
      })
      return mapFiles((data?.data ?? []) as CommitFile[])
    },
    enabled: !!repoId && !!selectedSha,
    staleTime: Infinity,
  })

  // Push selected commit's files to the preview whenever they're available
  useEffect(() => {
    if (selectedFiles) onSelectCommit(selectedFiles)
  }, [selectedFiles, onSelectCommit])

  const handleSelect = (sha: string) => {
    if (!repoId) return
    setSelectedSha(sha)
  }

  const handleRevert = async (sha: string) => {
    if (!repoId) return
    setOpenMenuId(null)
    setRevertingSha(sha)
    try {
      await api.post(
        '/v2/functions/micro-frontend/revert',
        { repo_id: String(repoId), commit_sha: sha },
        { headers },
      )
      // BE creates a new revert-commit at HEAD — refetch so commits[0] reflects it
      await queryClient.invalidateQueries({ queryKey: ['mf-commits', repoId] })
      // Drop preview selection so the viewer shows the live (reverted) state
      setSelectedSha(null)
      await onReverted()
    } catch (err) {
      console.error('Failed to revert', err)
    } finally {
      setRevertingSha(null)
    }
  }

  const handlePublish = async (sha: string) => {
    if (!repoId) return
    setOpenMenuId(null)
    setPublishingSha(sha)
    try {
      await api.post(
        '/v2/functions/micro-frontend/promote',
        { repo_id: Number(repoId) },
        { headers },
      )
    } catch (err) {
      console.error('Failed to publish', err)
    } finally {
      setPublishingSha(null)
    }
  }

  const handleViewCode = (sha: string) => {
    setOpenMenuId(null)
    handleSelect(sha)
    onViewCode()
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-hover-bg transition-colors text-text-muted hover:text-text-main shrink-0"
        >
          <ArrowLeft size={15} />
        </button>
        <span className="text-[14px] font-semibold text-text-main">Version history</span>
      </div>

      {/* Body */}
      {!repoId ? (
        <div className="flex flex-col items-center justify-center flex-1 px-6 text-center text-text-muted gap-1">
          <p className="text-sm">Select a microfrontend to view its history</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 size={20} className="animate-spin text-text-muted" />
        </div>
      ) : commits.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-text-muted">
          <p className="text-sm">No versions yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
          {commits.map((c) => {
            const isSelected = c.id === selectedSha
            const isCurrent = c.id === currentSha
            const isLoadingThis = isLoadingFiles && isSelected
            const isReverting = revertingSha === c.id
            const isPublishing = publishingSha === c.id
            const isDisable = isReverting || isPublishing || isLoadingFiles
            return (
              <div
                key={c.id}
                onClick={() => {
                  if (isDisable) return
                  handleSelect(c.id)
                }}
                className={cn(
                  "flex items-center justify-between gap-2 px-4 py-3 border rounded-xl transition-colors cursor-pointer",
                  isSelected
                    ? "bg-primary/5 border-primary/30"
                    : "bg-bg-card border-border-subtle hover:border-border-subtle/80",
                  isDisable && "pointer-events-none opacity-50",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-main truncate">{c.title}</p>
                  <p className="text-xs text-text-muted mt-0.5 truncate">
                    {c.author_name} · {timeAgo(c.committed_date)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isLoadingThis && (
                    <Loader2 size={12} className="animate-spin text-text-muted" />
                  )}
                  {isCurrent && !isLoadingThis && (
                    <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                  <Popover
                    open={openMenuId === c.id}
                    onOpenChange={(open) => setOpenMenuId(open ? c.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        disabled={isReverting || isPublishing}
                        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-hover-bg transition-colors text-text-muted hover:text-text-main disabled:opacity-60"
                      >
                        {isReverting || isPublishing
                          ? <Loader2 size={14} className="animate-spin" />
                          : <MoreVertical size={14} />
                        }
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" sideOffset={4} className="w-52 p-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handlePublish(c.id) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors text-left"
                      >
                        <Rocket size={14} />
                        <span>Publish this version</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRevert(c.id) }}
                        disabled={isCurrent}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors text-left disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <RotateCcw size={14} />
                        <span>Revert to this version</span>
                        {isCurrent && <Check size={12} className="ml-auto text-primary" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleViewCode(c.id) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors text-left"
                      >
                        <Code size={14} />
                        <span>View code</span>
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
