'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import {
  ChevronLeft,
  Loader2,
  PlusCircle,
  Zap,
  Trash2,
  Search,
  RefreshCw,
  ScrollText,
  Code2,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ColumnDef } from '@tanstack/react-table'
import { api } from '@/shared/api'
import { Button } from '@/shared/ui'
import { Input } from '@/shared/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui'
import { WorkspaceDataTable } from './workspace-data-table'
import { ReusableTabs } from '@/shared/ui'
import { DataLoadingState } from '@/shared/ui'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { cn } from '@/shared/lib/utils/cn'
import { GitlabCodeEditor } from './gitlab-code-view'
import { PipelineStatus } from './pipeline-status'
import { useTables, type Table } from '@/entities/database'

interface FunctionItem {
  id: string
  name: string
  description: string
  type: string          // e.g. "WORKFLOW"
  max_scale: number     // replica count
  status?: string
  path?: string
  branch?: string
  resource_id?: string
  project_id?: string
  environment_id?: string
  url?: string
  is_public?: boolean
  repo_id?: string
}

interface FunctionPageProps {
  projectId: string
  onEditCode?: (fn: FunctionItem) => void
}

type View = 'list' | 'create' | 'detail'
type FunctionTiming = 'default' | 'before' | 'after'

type FunctionTriggerConfig = {
  timing: FunctionTiming
  tableSlug?: string
}

const timeData = [
  { label: '5 minutes', value: 300000 },
  { label: '15 minutes', value: 900000 },
  { label: '30 minutes', value: 1800000 },
  { label: '1 hour', value: 3600000 },
  { label: '6 hours', value: 21600000 },
  { label: '12 hours', value: 43200000 },
]

const timingOptions: { label: string; value: FunctionTiming }[] = [
  { label: 'Default', value: 'default' },
  { label: 'Before', value: 'before' },
  { label: 'After', value: 'after' },
]

export const FunctionsPage = ({ projectId, onEditCode }: FunctionPageProps) => {
  const [view, setView] = useState<View>('list')
  const [selectedFn, setSelectedFn] = useState<FunctionItem | null>(null)
  const [detailTab, setDetailTab] = useState<'details' | 'logs'>('details')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [fnToDelete, setFnToDelete] = useState<FunctionItem | null>(null)
  const [timeFrame, setTimeFrame] = useState(3600000)
  const [lastPublish, setLastPublish] = useState(0)
  const [triggerConfigs, setTriggerConfigs] = useState<Record<string, FunctionTriggerConfig>>({})

  const debouncedSearch = useDebounce(search, 400)
  const queryClient = useQueryClient()

  // API Functions
  const fetchFunctions = async (projectId: string, search: string, limit: number, pageNum: number) => {
    const offset = (pageNum - 1) * limit
    const { data } = await api.get('/v1/function', {
      params: { search, limit, offset, 'project-id': projectId }
    })
    return {
      functions: (data.data?.functions ?? []) as FunctionItem[],
      total: data.data?.count ?? 0
    }
  }

  const fetchFunctionDetail = async (id: string, projectId: string) => {
    const { data } = await api.get(`/v2/function/${id}`, {
      params: { 'project-id': projectId }
    })
    return data.data as FunctionItem
  }

  const fetchGitResources = async (projectId: string) => {
    const { data } = await api.get('/v2/company/project/resource', {
      params: { type: 'GIT', 'project-id': projectId }
    })
    const resources = data.data?.resources ?? []
    return resources.map((item: any) => ({
      label: item.name ?? item.id,
      value: item.id,
    }))
  }

  // Queries
  const { data: functionsData, isLoading: isListLoading } = useQuery({
    queryKey: ['functions', projectId, debouncedSearch, page],
    queryFn: () => fetchFunctions(projectId, debouncedSearch, pageSize, page),
    enabled: !!projectId
  })

  console.log({ functionsData })

  const { data: fnDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['function-detail', selectedFn?.id],
    queryFn: () => fetchFunctionDetail(selectedFn!.id, projectId),
    enabled: view === 'detail' && !!selectedFn?.id
  })

  const { data: gitResources = [], isLoading: isResourcesLoading } = useQuery({
    queryKey: ['git-resources', projectId],
    queryFn: () => fetchGitResources(projectId),
    enabled: view === 'create'
  })

  const { data: tables = [], isLoading: isTablesLoading } = useTables('', 200, 0)

  console.log('fnDetailfnDetail', fnDetail)

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string
      description: string
      type: string
      max_scale: number
      resource_id: string
    }) => api.post('/v2/function', payload, {
      params: { 'project-id': projectId }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['functions', projectId] })
      setView('list')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v2/function/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['functions', projectId] })
      setFnToDelete(null)
    }
  })

  const fetchLogsMutation = useMutation({
    mutationFn: (payload: {
      From: string
      To: string
      Namespace: string
      Function: string
    }) => api.post('/v2/grafana/loki', payload, {
      params: { 'project-id': projectId }
    }).then(r => (Array.isArray(r.data.data) ? r.data.data : [])),
  })

  // Handlers
  const handleShowLogs = () => {
    const now = Date.now()
    fetchLogsMutation.mutate({
      From: String(now - timeFrame),
      To: String(now),
      Namespace: '',
      Function: selectedFn?.name || ''
    })
  }

  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    type: 'WORKFLOW',
    max_scale: 1,
    resource_id: ''
  })

  const hasTableColumn = Object.values(triggerConfigs).some(
    (config) => config.timing === 'before' || config.timing === 'after'
  )

  const getTriggerConfig = useCallback((functionId: string): FunctionTriggerConfig => (
    triggerConfigs[functionId] ?? { timing: 'default' }
  ), [triggerConfigs])

  const handleTimingChange = useCallback((functionId: string, timing: FunctionTiming) => {
    setTriggerConfigs((prev) => ({
      ...prev,
      [functionId]: {
        timing,
        tableSlug: timing === 'default' ? undefined : prev[functionId]?.tableSlug,
      },
    }))
  }, [])

  const handleTableChange = useCallback((functionId: string, tableSlug: string) => {
    setTriggerConfigs((prev) => ({
      ...prev,
      [functionId]: {
        timing: prev[functionId]?.timing ?? 'before',
        tableSlug,
      },
    }))
  }, [])

  // DataTable Columns
  const columns: ColumnDef<FunctionItem>[] = useMemo(() => {
    const baseColumns: ColumnDef<FunctionItem>[] = [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => <span className="font-bold text-text-main whitespace-nowrap">{row.original.name}</span>
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const isActive = row.original.status === 'ACTIVE' || !row.original.status
          return (
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[11px] font-bold uppercase",
              isActive ? "bg-green-500/10 text-green-600" : "bg-text-muted/10 text-text-muted"
            )}>
              {row.original.status || 'ACTIVE'}
            </span>
          )
        }
      },
      {
        accessorKey: 'path',
        header: 'Path',
        cell: ({ row }) => <span className="font-mono text-xs text-text-muted whitespace-nowrap">{row.original.path ?? '—'}</span>
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full uppercase">
            {row.original.type}
          </span>
        )
      },
      {
        accessorKey: 'max_scale',
        header: 'Replica Count',
        cell: ({ row }) => <div className="text-center">{row.original.max_scale}</div>
      },
      {
        id: 'timing',
        header: 'Timing',
        cell: ({ row }) => {
          const activeTiming = getTriggerConfig(row.original.id).timing

          return (
            <div
              className="inline-flex h-8 overflow-hidden rounded-lg border border-border-subtle bg-bg-sidebar p-1"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {timingOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTimingChange(row.original.id, option.value)}
                  className={cn(
                    "h-6 min-w-[58px] rounded-md px-2 text-[11px] font-semibold transition-colors",
                    activeTiming === option.value
                      ? "bg-bg-card text-primary shadow-sm"
                      : "text-text-muted hover:text-text-main"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )
        },
      },
    ]

    if (hasTableColumn) {
      baseColumns.push({
        id: 'table',
        header: 'Tables',
        cell: ({ row }) => {
          const config = getTriggerConfig(row.original.id)
          const needsTable = config.timing === 'before' || config.timing === 'after'

          if (!needsTable) {
            return <span className="text-text-muted">—</span>
          }

          return (
            <div
              className="min-w-[180px]"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Select
                value={config.tableSlug}
                onValueChange={(value) => handleTableChange(row.original.id, value)}
                disabled={isTablesLoading || tables.length === 0}
              >
                <SelectTrigger className="h-8 bg-bg-sidebar border-border-subtle text-xs w-[180px]">
                  <SelectValue placeholder={isTablesLoading ? "Loading..." : "Select table"} />
                </SelectTrigger>
                <SelectContent className="max-h-[260px]" position="popper" side="bottom" sideOffset={4} avoidCollisions>
                  {tables.length === 0 ? (
                    <SelectItem value="__no_tables__" disabled>No tables found</SelectItem>
                  ) : (
                    tables.map((table: Table) => (
                      <SelectItem key={table.id ?? table.slug} value={table.slug}>
                        {table.label || table.slug}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )
        },
      })
    }

    baseColumns.push({
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {onEditCode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onEditCode(row.original)
              }}
              className="text-primary hover:bg-primary/10 rounded-lg h-7 px-2 text-[11px] font-semibold gap-1"
            >
              <Code2 size={13} />
              Edit with AI
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              setFnToDelete(row.original)
            }}
            className="text-destructive hover:bg-destructive/10 rounded-lg h-8 w-8"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    })

    return baseColumns
  }, [getTriggerConfig, handleTableChange, handleTimingChange, hasTableColumn, isTablesLoading, onEditCode, tables])

  if (view === 'list') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 min-w-0 w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-main tracking-tight">Functions</h1>
            <p className="text-text-muted text-sm mt-1">Manage and deploy your serverless functions and workflows.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted h-4 w-4" />
              <input
                placeholder="Search functions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-[280px] h-8 pl-9 pr-4 rounded-lg bg-bg-sidebar border border-border-subtle text-sm text-text-main placeholder:text-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
            <Button
              onClick={() => setView('create')}
              className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 h-8 text-[13px] font-medium"
            >
              <PlusCircle size={14} className="mr-1.5" />
              Add Function
            </Button>
          </div>
        </div>

        {isListLoading ? (
          <DataLoadingState message="Connecting to functions library..." />
        ) : functionsData?.functions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-bg-card border border-dashed border-border-subtle rounded-2xl text-center">
            <div className="bg-primary/5 p-4 rounded-full mb-4">
              <Zap size={32} className="text-primary/40" />
            </div>
            <p className="text-text-main font-medium">No functions found</p>
            <p className="text-text-muted text-sm mt-1">Start by creating your first serverless function.</p>
          </div>
        ) : (
          <WorkspaceDataTable
            columns={columns}
            data={(functionsData?.functions ?? []).filter(fn => fn.id !== 'b90d8ad8-553a-4494-8031-660b85a79b45')}
            tableClassName="min-w-max"
            totalCount={functionsData?.total}
            page={page}
            onPageChange={setPage}
            limit={pageSize}
            onRowClick={(row) => {
              setSelectedFn(row)
              setDetailTab('details')
              setView('detail')
            }}
          />
        )}

        <Dialog open={!!fnToDelete} onOpenChange={(open) => !open && setFnToDelete(null)}>
          <DialogContent className="max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Delete Function</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <span className="font-semibold text-text-main">{fnToDelete?.name}</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 gap-2">
              <Button variant="ghost" onClick={() => setFnToDelete(null)} disabled={deleteMutation.isPending}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(fnToDelete!.id)}
                className="rounded-xl px-6"
              >
                {deleteMutation.isPending && <Loader2 size={14} className="animate-spin mr-2" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (view === 'create') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView('list')}
            className="h-8 w-8 rounded-lg"
          >
            <ChevronLeft size={16} />
          </Button>
          <h1 className="text-xl font-bold text-text-main leading-tight">New Function</h1>
        </div>

        <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 max-w-lg shadow-sm">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-main">Name</label>
              <Input
                placeholder="Function name"
                value={createForm.name}
                onChange={(e) => setCreateForm(p => ({ ...p, name: e.target.value }))}
                className="bg-bg-sidebar border-border-subtle"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-main">Description</label>
              <Input
                placeholder="Short description"
                value={createForm.description}
                onChange={(e) => setCreateForm(p => ({ ...p, description: e.target.value }))}
                className="bg-bg-sidebar border-border-subtle"
              />
            </div>
            {/*
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main">Type</label>
                <Select
                  value={createForm.type}
                  onValueChange={(v) => setCreateForm(p => ({ ...p, type: v }))}
                >
                  <SelectTrigger className="bg-bg-sidebar border-border-subtle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WORKFLOW">WORKFLOW</SelectItem>
                    <SelectItem value="KNATIVE">KNATIVE</SelectItem>
                    <SelectItem value="WEBHOOK">WEBHOOK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main">Replica Count</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  placeholder="1"
                  value={createForm.max_scale}
                  onChange={(e) => setCreateForm(p => ({ ...p, max_scale: Number(e.target.value) }))}
                  className="bg-bg-sidebar border-border-subtle"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-main">Resource</label>
              <Select
                value={createForm.resource_id}
                onValueChange={(v) => setCreateForm(p => ({ ...p, resource_id: v }))}
                disabled={isResourcesLoading}
              >
                <SelectTrigger className="bg-bg-sidebar border-border-subtle">
                  <SelectValue placeholder={isResourcesLoading ? "Loading..." : "Select resource"} />
                </SelectTrigger>
                <SelectContent>
                  {gitResources.map((res: any) => (
                    <SelectItem key={res.value} value={res.value}>{res.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            */}

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle/50">
              <Button variant="ghost" onClick={() => setView('list')} className="rounded-xl px-4">Cancel</Button>
              <Button
                disabled={!createForm.name || createMutation.isPending}
                onClick={() => {
                  const formData = {
                    ...createForm,
                    type: 'WORKFLOW',
                    max_scale: 1,
                    resource_id: gitResources[0]?.value || ''
                  }
                  createMutation.mutate(formData)
                }}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 shadow-sm"
              >
                {createMutation.isPending && <Loader2 size={16} className="animate-spin mr-2" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'detail' && selectedFn) {
    const detail = fnDetail || selectedFn
    const logsList = fetchLogsMutation.data || []

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setView('list')} className="h-8 w-8 rounded-lg">
              <ChevronLeft size={16} />
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-text-main leading-tight">{selectedFn.name}</h1>
              <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full uppercase">
                {selectedFn.type}
              </span>
            </div>
          </div>
          <ReusableTabs
            options={[
              { id: 'details', label: 'Details' },
              { id: 'logs', label: 'Logs' },
              { id: 'code', label: 'Code' },
            ]}
            activeId={detailTab}
            onTabChange={(id) => setDetailTab(id as any)}
            className="max-w-fit"
          />
        </div>

        {detailTab === 'details' ? (
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 max-w-lg shadow-sm">
            <div className="space-y-5">
              {[
                { label: 'Name', value: detail.name },
                { label: 'Function Type', value: detail.type },
                { label: 'Link / Path', value: detail.path ?? '—', font: 'font-mono' },
                { label: 'Replica Count', value: detail.max_scale },
                { label: 'Description', value: detail.description },
              ].map((field, idx) => (
                <div key={idx} className="space-y-1.5">
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{field.label}</label>
                  <div className={cn(
                    "bg-bg-sidebar border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-main",
                    field.font
                  )}>
                    {field.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : detailTab === 'logs' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-bg-sidebar border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-muted font-mono whitespace-nowrap">
                namespace
              </div>
              <div className="bg-bg-sidebar border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-muted font-mono whitespace-nowrap">
                {selectedFn.type?.toLowerCase() ?? 'function'}
              </div>
              <div className="bg-bg-sidebar border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-muted font-mono whitespace-nowrap">
                app
              </div>
              <div className="bg-bg-sidebar border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-muted font-mono truncate max-w-[200px]">
                {selectedFn.path ?? selectedFn.name}
              </div>

              <div className="flex-1 min-w-[200px]">
                <Select value={String(timeFrame)} onValueChange={(v) => setTimeFrame(Number(v))}>
                  <SelectTrigger className="bg-bg-sidebar border-border-subtle h-10">
                    <SelectValue placeholder="Select time frame" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeData.map(t => (
                      <SelectItem key={t.value} value={String(t.value)}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleShowLogs}
                disabled={fetchLogsMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl px-5 shadow-sm"
              >
                {fetchLogsMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : <RefreshCw size={16} className="mr-2" />}
                Show Logs
              </Button>
            </div>

            <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-bg-sidebar/50 border-b border-border-subtle flex items-center gap-2">
                <ScrollText size={14} className="text-text-muted" />
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Log Stream</span>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-border-subtle scrollbar-track-transparent">
                {fetchLogsMutation.isPending ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 size={32} className="animate-spin text-primary/40" />
                    <p className="text-sm text-text-muted font-medium animate-pulse">Streaming logs...</p>
                  </div>
                ) : logsList.length > 0 ? (
                  <div className="space-y-2">
                    {logsList.map((log: any, index: number) => {
                      const raw = typeof log === 'string' ? log : JSON.stringify(log)
                      const isJson = raw.trim().startsWith('{') || raw.trim().startsWith('[')
                      let formatted = raw
                      if (isJson) {
                        try {
                          formatted = JSON.stringify(JSON.parse(raw), null, 2)
                        } catch { }
                      }
                      return (
                        <div
                          key={index}
                          className={cn(
                            "rounded-xl px-4 py-3 border border-border-subtle font-mono text-[13px] text-text-main",
                            index % 2 === 0 ? "bg-bg-card" : "bg-bg-sidebar"
                          )}
                        >
                          {isJson ? (
                            <pre className="whitespace-pre-wrap break-words">{formatted}</pre>
                          ) : (
                            <span>{raw}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <ScrollText size={36} className="text-text-muted/30 mb-3" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-text-main">No logs available</p>
                    <p className="text-xs text-text-muted mt-1 opacity-80">Select a time range and click "Show Logs" to retrieve activity.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              {/* <div className="bg-bg-sidebar border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-muted font-mono whitespace-nowrap">
                namespace
              </div>
              <div className="bg-bg-sidebar border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-muted font-mono whitespace-nowrap">
                {selectedFn.type?.toLowerCase() ?? 'function'}
              </div>
              <div className="bg-bg-sidebar border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-muted font-mono whitespace-nowrap">
                app
              </div>
              <div className="bg-bg-sidebar border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-muted font-mono truncate max-w-[200px]">
                {selectedFn.path ?? selectedFn.name}
              </div>



              <Button
                onClick={handleShowLogs}
                disabled={fetchLogsMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl px-5 shadow-sm"
              >
                {fetchLogsMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : <RefreshCw size={16} className="mr-2" />}
                Show Logs
              </Button> */}
            </div>

            <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-bg-sidebar/50 border-b border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScrollText size={14} className="text-text-muted" />
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Code</span>
                </div>
                <PipelineStatus repoId={selectedFn.repo_id} branch={selectedFn.branch || "master"} lastPublish={lastPublish} />
              </div>
              <GitlabCodeEditor
                path={selectedFn.path!}
                branch={selectedFn.branch || "master"}
                name={selectedFn.name}
                type={selectedFn.type}
                repoId={selectedFn.repo_id}
                onPublish={() => {
                  setLastPublish(Date.now())
                  queryClient.invalidateQueries({ queryKey: ['gitlab-pipeline'] })
                }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
