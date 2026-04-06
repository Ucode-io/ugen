'use client'

import { useState, useMemo, useRef } from 'react'
import {
  ChevronLeft,
  Loader2,
  PlusCircle,
  Layers2,
  Trash2,
  Search,
  RefreshCw,
  ScrollText,
  ExternalLink,
  Activity,
  Layers,
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
import { MicrofrontendEditor } from './gitlab-code-view'
import { PipelineStatus } from './pipeline-status'

interface Microfrontend {
  id: string
  name: string
  description?: string
  path: string
  url: string
  type: string          // "MICRO_FRONTEND"
  branch?: string
  max_scale?: number
  framework_type?: string
  resource_id?: string
  project_id?: string
  environment_id?: string
}

interface GitResource {
  label: string
  value: string
  token?: string
  username?: string
  type?: string          // "GITHUB" | "GITLAB" | "ucode_gitlab"
}

interface MicrofrontendPageProps {
  projectId: string
}

type View = 'list' | 'create' | 'detail'

const frameworkOptions = [
  { label: 'React', value: 'REACT' },
  { label: 'Vue', value: 'VUE' },
  { label: 'Angular', value: 'ANGULAR' },
]

const timeData = [
  { label: '5 minutes', value: 300000 },
  { label: '15 minutes', value: 900000 },
  { label: '30 minutes', value: 1800000 },
  { label: '1 hour', value: 3600000 },
  { label: '6 hours', value: 21600000 },
  { label: '12 hours', value: 43200000 },
]

export const MicrofrontendPage = ({ projectId }: MicrofrontendPageProps) => {
  const [view, setView] = useState<View>('list')
  const [selected, setSelected] = useState<Microfrontend | null>({
                "id": "5d32280e-165c-4a52-8800-91d177e94994",
                "path": "my-fidani_warehouse",
                "name": "warehouse",
                "project_id": "42c518b0-98a7-46fb-8f73-6c3c384c968d",
                "environment_id": "231e90ea-d2f8-41af-a5a7-9db7aa73cd6f",
                "url": "1f1bf5cb-41a6-466d-8a74-7592e0aac929-test-page.u-code.io",
                "type": "MICRO_FRONTEND",
                "branch": "master",
                "max_scale": 3
            })
  const [detailTab, setDetailTab] = useState<'details' | 'logs'>('details')
  const [search, setSearch] = useState('')
  const [toDelete, setToDelete] = useState<Microfrontend | null>(null)
  const [timeFrame, setTimeFrame] = useState(3600000)
  const [lastPublish, setLastPublish] = useState(0)

  const debouncedSearch = useDebounce(search, 400)
  const queryClient = useQueryClient()

  // API Functions
  const fetchMicrofrontends = async (projectId: string, search: string) => {
    const { data } = await api.get('/v2/functions/micro-frontend', {
      params: { search, offset: 0, 'project-id': projectId }
    })
    return (data.data?.functions ?? []) as Microfrontend[]
  }

  const fetchGitResources = async (projectId: string) => {
    const { data } = await api.get('/v2/company/project/resource', {
      params: { type: 'GIT', 'project-id': projectId }
    })
    const resources = data.data?.resources ?? []
    const mapped: GitResource[] = resources.map((item: any) => ({
      label: item.name ?? item.id,
      value: item.id,
      token: item.settings?.github?.token ?? item.settings?.gitlab?.token ?? '',
      username: item.settings?.github?.username ?? item.settings?.gitlab?.username ?? '',
      type: item.resource_type === 5 ? 'GITHUB' : 'GITLAB',
    }))
    return [{ label: 'Ucode GitLab', value: 'ucode_gitlab', type: 'ucode_gitlab' }, ...mapped]
  }

  // Queries
  const { data: microfrontends = [], isLoading: isListLoading } = useQuery({
    queryKey: ['microfrontends', projectId, debouncedSearch],
    queryFn: () => fetchMicrofrontends(projectId, debouncedSearch),
    enabled: !!projectId
  })

  const { data: gitResources = [], isLoading: isResourcesLoading } = useQuery({
    queryKey: ['git-resources', projectId],
    queryFn: () => fetchGitResources(projectId),
    enabled: view === 'create' || view === 'detail'
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/v2/functions/micro-frontend', payload, {
      params: { 'project-id': projectId }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['microfrontends', projectId] })
      setView('list')
    }
  })

  const createWebhookMutation = useMutation({
    mutationFn: (payload: any) => api.post('/v2/webhook/create', payload, {
      params: { 'project-id': projectId }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['microfrontends', projectId] })
      setView('list')
    }
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Microfrontend> & { id: string }) =>
      api.put('/v2/functions/micro-frontend', payload, {
        params: { 'project-id': projectId }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['microfrontends', projectId] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.delete(`/v2/functions/micro-frontend/${id}`, {
        params: { 'project-id': projectId }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['microfrontends', projectId] })
      setToDelete(null)
    }
  })

  const fetchLogsMutation = useMutation({
    mutationFn: (payload: { From: string; To: string; Namespace: string; Function: string }) =>
      api.post('/v2/grafana/loki', payload, { params: { 'project-id': projectId } })
        .then(r => Array.isArray(r.data.data) ? r.data.data : []),
  })

  // Initial forms
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    framework_type: 'REACT',
    resource_id: 'ucode_gitlab',
    path: '',
  })

  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    framework_type: '',
    resource_id: '',
  })

  // Handlers
  const handleCreateSubmit = () => {
    const selectedResource = gitResources.find(r => r.value === createForm.resource_id)
    if (!selectedResource || selectedResource.value === 'ucode_gitlab') {
      createMutation.mutate(createForm)
    } else {
      createWebhookMutation.mutate({
        ...createForm,
        github_token: selectedResource.token ?? '',
        username: selectedResource.username ?? '',
        type: 'MICRO_FRONTEND',
      })
    }
  }

  const handleUpdateSubmit = () => {
    updateMutation.mutate({
      id: editForm.id,
      name: editForm.name,
      framework_type: editForm.framework_type,
      resource_id: editForm.resource_id,
    })
  }

  const handleShowLogs = () => {
    const now = Date.now()
    fetchLogsMutation.mutate({
      From: String(now - timeFrame),
      To: String(now),
      Namespace: '',
      Function: selected?.name || ''
    })
  }

  // DataTable Columns
  const columns: ColumnDef<Microfrontend>[] = useMemo(() => [
    {
      id: 'index',
      header: 'No',
      cell: ({ row }) => <span className="text-text-muted text-sm">{row.index + 1}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span className="font-bold text-text-main">{row.original.name}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.original.type === 'MICRO_FRONTEND'
        return (
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[11px] font-bold uppercase",
            isActive ? "bg-green-500/10 text-green-600" : "bg-text-muted/10 text-text-muted"
          )}>
            {isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
        )
      }
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => <span className="text-text-muted text-sm truncate max-w-[200px] inline-block">{row.original.description ?? '—'}</span>,
    },
    {
      accessorKey: 'url',
      header: 'Link',
      cell: ({ row }) => (
        row.original.url ? (
          <a
            href={row.original.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-xs text-primary hover:underline flex items-center gap-1.5"
          >
            Open <ExternalLink size={12} />
          </a>
        ) : <span className="text-text-muted">—</span>
      )
    },
    {
      accessorKey: 'framework_type',
      header: 'Framework',
      cell: ({ row }) => (
        row.original.framework_type ? (
          <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full uppercase">
            {row.original.framework_type}
          </span>
        ) : <span className="text-text-muted">—</span>
      )
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            setToDelete(row.original)
          }}
          className="text-destructive hover:bg-destructive/10 rounded-lg h-8 w-8"
        >
          <Trash2 size={16} />
        </Button>
      )
    }
  ], [])

  if (view === 'list') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-main tracking-tight">Microfrontend</h1>
            <p className="text-text-muted text-sm mt-1">Configure and manage modular micro-frontend components.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted h-4 w-4" />
              <input
                placeholder="Search microfrontends..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-[280px] h-8 pl-8 pr-4 rounded-xl bg-bg-sidebar border border-border-subtle text-sm text-text-main placeholder:text-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
            <Button
              onClick={() => {
                setCreateForm({ name: '', description: '', framework_type: 'REACT', resource_id: 'ucode_gitlab', path: '' })
                setView('create')
              }}
              className="bg-primary hover:bg-primary/90 text-white rounded-lg px-5 h-8 shadow-sm text-sm font-medium"
            >
              <PlusCircle size={18} className="mr-2" />
              Add Microfrontend
            </Button>
          </div>
        </div>

        {isListLoading ? (
          <DataLoadingState message="Loading microfrontends..." />
        ) : microfrontends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-bg-card border border-dashed border-border-subtle rounded-2xl text-center">
            <div className="bg-primary/5 p-4 rounded-full mb-4">
              <Layers2 size={32} className="text-primary/40" />
            </div>
            <p className="text-text-main font-medium">No microfrontends found</p>
            <p className="text-text-muted text-sm mt-1">Configure your first micro-frontend to enable modular development.</p>
          </div>
        ) : (
          <WorkspaceDataTable
            columns={columns}
            data={microfrontends}
            onRowClick={(row) => {
              setSelected(row)
              setEditForm({
                id: row.id,
                name: row.name,
                framework_type: row.framework_type || '',
                resource_id: row.resource_id || '',
              })
              setDetailTab('details')
              setView('detail')
            }}
          />
        )}

        <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
          <DialogContent className="max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Delete Microfrontend</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <span className="font-semibold text-text-main">{toDelete?.name}</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 gap-2">
              <Button variant="ghost" onClick={() => setToDelete(null)} disabled={deleteMutation.isPending}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: toDelete!.id })}
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
          <Button variant="ghost" size="icon" onClick={() => setView('list')} className="h-8 w-8 rounded-lg">
            <ChevronLeft size={16} />
          </Button>
          <h1 className="text-xl font-bold text-text-main leading-tight">New Microfrontend</h1>
        </div>

        <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 max-w-lg shadow-sm">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-main">Name</label>
              <Input
                placeholder="Microfrontend name"
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-main">Framework</label>
              <Select
                value={createForm.framework_type}
                onValueChange={(v) => setCreateForm(p => ({ ...p, framework_type: v }))}
              >
                <SelectTrigger className="bg-bg-sidebar border-border-subtle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frameworkOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-main">Path / URL</label>
              <Input
                placeholder="Repository path"
                value={createForm.path}
                onChange={(e) => setCreateForm(p => ({ ...p, path: e.target.value }))}
                className="bg-bg-sidebar border-border-subtle"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle/50">
              <Button variant="ghost" onClick={() => setView('list')} className="rounded-xl px-4">Cancel</Button>
              <Button
                disabled={!createForm.name || createMutation.isPending || createWebhookMutation.isPending}
                onClick={handleCreateSubmit}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 shadow-sm"
              >
                {(createMutation.isPending || createWebhookMutation.isPending) && <Loader2 size={16} className="animate-spin mr-2" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'detail' && selected) {
    const logsList = fetchLogsMutation.data || []

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setView('list')} className="h-8 w-8 rounded-lg">
              <ChevronLeft size={16} />
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-text-main leading-tight">{selected.name}</h1>
              {selected.framework_type && (
                <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {selected.framework_type}
                </span>
              )}
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
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Resource</label>
                <Select
                  value={editForm.resource_id}
                  onValueChange={(v) => setEditForm(p => ({ ...p, resource_id: v }))}
                  disabled={isResourcesLoading}
                >
                  <SelectTrigger className="bg-bg-sidebar border-border-subtle h-10">
                    <SelectValue placeholder={isResourcesLoading ? "Loading..." : "Select resource"} />
                  </SelectTrigger>
                  <SelectContent>
                    {gitResources.map((res: any) => (
                      <SelectItem key={res.value} value={res.value}>{res.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Repository (Path)</label>
                <div className="bg-bg-sidebar rounded-xl px-4 py-2.5 text-sm font-mono border border-border-subtle text-text-main">
                  {selected.path}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Branch</label>
                <div className="bg-bg-sidebar rounded-xl px-4 py-2.5 text-sm font-mono border border-border-subtle text-text-main">
                  {selected.branch ?? '—'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="bg-bg-sidebar border-border-subtle"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Framework</label>
                <Select
                  value={editForm.framework_type}
                  onValueChange={(v) => setEditForm(p => ({ ...p, framework_type: v }))}
                >
                  <SelectTrigger className="bg-bg-sidebar border-border-subtle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frameworkOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">URL / Link</label>
                <div className="flex items-center justify-between bg-bg-sidebar rounded-xl px-4 py-2.5 text-sm border border-border-subtle text-text-main">
                  <span className="truncate pr-4 font-mono">{selected.url || '—'}</span>
                  {selected.url && (
                    <a href={selected.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 shrink-0">
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle/50">
                <Button variant="ghost" onClick={() => setView('list')} className="rounded-xl px-4">Cancel</Button>
                <Button
                  disabled={!editForm.name || updateMutation.isPending}
                  onClick={handleUpdateSubmit}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 shadow-sm"
                >
                  {updateMutation.isPending && <Loader2 size={16} className="animate-spin mr-2" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        ) : detailTab === 'logs' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-bg-sidebar border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-muted font-mono whitespace-nowrap">
                namespace
              </div>
              <div className="bg-bg-sidebar border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-muted font-mono whitespace-nowrap">
                micro_frontend
              </div>
              <div className="bg-bg-sidebar border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-muted font-mono whitespace-nowrap">
                app
              </div>
              <div className="bg-bg-sidebar border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-muted font-mono truncate max-w-[200px]">
                {selected.path ?? selected.name}
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

            <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
              <div className="p-4 bg-bg-sidebar/50 border-b border-border-subtle flex items-center gap-2">
                <ScrollText size={14} className="text-text-muted" />
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Log Stream</span>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto">
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
        )
          : (
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
              <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
                <div className="p-4 bg-bg-sidebar/50 border-b border-border-subtle flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ScrollText size={14} className="text-text-muted" />
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Code</span>
                  </div>
                  <PipelineStatus repoId={selected.project_id} branch={selected.branch || "master"} lastPublish={lastPublish} />
                </div>
                <MicrofrontendEditor 
                  path={selected.path} 
                  branch={selected.branch || "master"} 
                  name={selected.name} 
                  repoId={selected.project_id} 
                  onPublish={() => {
                    setLastPublish(Date.now())
                    queryClient.invalidateQueries({ queryKey: ['gitlab-pipeline'] })
                  }}
                />
              </div>
            </div>
          )
        }
      </div>
    )
  }

  return null
}
