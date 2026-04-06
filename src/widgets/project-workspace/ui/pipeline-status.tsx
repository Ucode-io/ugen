import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { cn } from '@/shared/lib/utils/cn'

const GitlabPendingIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    className={className}
    width="14"
    height="14"
  >
    <path d="M8 0a8 8 0 1 0 8 8 8 8 0 0 0-8-8Zm0 14A6 6 0 1 1 14 8a6 6 0 0 1-6 6Z" fill="currentColor"/>
    <path d="M8 2a6 6 0 0 1 6 6H8V2Z" fill="currentColor" />
  </svg>
)

interface PipelineStatusProps {
  repoId?: string
  branch?: string
  lastPublish?: number
}

export function PipelineStatus({ repoId, branch = 'master', lastPublish = 0 }: PipelineStatusProps) {
  const [isPolling, setIsPolling] = useState(true)

  const { data: pipelineData, isError, refetch, isFetching } = useQuery({
    queryKey: ['gitlab-pipeline', repoId, branch],
    queryFn: async () => {
      const res = await api.get('/v1/gitlab/pipeline', {
        baseURL: 'https://admin-api.ucode.run',
        params: { project_id: repoId, branch }
      })
      return res.data?.data
    },
    enabled: !!repoId && isPolling,
    refetchInterval: isPolling ? 10000 : false,
  })

  useEffect(() => {
    if (lastPublish > 0) {
      setIsPolling(true)
      setTimeout(() => refetch(), 1000)
    }
  }, [lastPublish, refetch])

  useEffect(() => {
    if (pipelineData) {
      const status = pipelineData.status?.toLowerCase()
      const isTerminal = status === 'success' || status === 'failed' || status === 'canceled' || status === 'skipped'
      const timeSincePublish = Date.now() - lastPublish

      // If we just published (< 10 seconds ago), GitLab might still be returning the previous pipeline.
      // We MUST keep polling to catch the newly created pipeline!
      if (timeSincePublish < 10000) {
        setIsPolling(true)
      } else if (isTerminal) {
        setIsPolling(false)
      } else {
        setIsPolling(true)
      }
    }
    if (isError) {
      setIsPolling(false)
    }
  }, [pipelineData, isError, lastPublish])

  if (!repoId || !pipelineData) {
    return null
  }

  const status = pipelineData.status?.toLowerCase()
  const detailedStatus = pipelineData.detailed_status?.text || status

  let icon = <GitlabPendingIcon className="text-[#3B82F6] animate-spin" />
  let statusClass = "bg-blue-500/10 text-blue-600 border-blue-500/20"
  
  if (status === 'success') {
    icon = <CheckCircle2 size={14} className="text-green-500" />
    statusClass = "bg-green-500/10 text-green-600 border-green-500/20"
  } else if (status === 'failed' || status === 'canceled') {
    icon = <XCircle size={14} className="text-destructive" />
    statusClass = "bg-destructive/10 text-destructive border-destructive/20"
  } else {
    // running, pending
    icon = <GitlabPendingIcon className="text-[#3B82F6] animate-[spin_2s_linear_infinite]" />
    statusClass = "bg-blue-500/10 text-blue-600 border-blue-500/20"
  }

  return (
    <div className="flex items-center gap-2">
      <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium", statusClass)}>
        {icon}
        <span className="capitalize">Pipeline: {detailedStatus}</span>
      </div>
      <button 
        onClick={(e) => {
          e.stopPropagation()
          refetch()
          setIsPolling(true)
        }}
        disabled={isFetching}
        className="p-1.5 hover:bg-bg-sidebar-hover rounded-full transition-colors text-text-muted hover:text-text-main disabled:opacity-50"
        title="Refresh Status"
      >
        <RefreshCw size={14} className={cn(isFetching && "animate-spin")} />
      </button>
    </div>
  )
}
