'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, Loader2, PenLine, ArrowLeftRight, Globe, Plus, SquarePen } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, authApi } from '@/shared/api'
import { useAuthStore } from '@/entities/session'
import { Button } from '@/shared/ui'
import { Input } from '@/shared/ui'
import { DataLoadingState } from '@/shared/ui'
import { cn } from '@/shared/lib/utils/cn'
import { ColumnDef } from '@tanstack/react-table'
import { WorkspaceDataTable } from './workspace-data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui'

interface Environment {
  id: string
  project_id: string
  name: string
  display_color: string
  description: string
  access_type: string
  node_type?: string
  client_types?: {
    count: number
    response: any[]
  }
  resource_type?: number
  resource_environment_id?: string
}

interface EnvironmentPageProps {
  projectId: string
}



export const EnvironmentPage = ({ projectId }: EnvironmentPageProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedEnv, setSelectedEnv] = useState<Environment | null>(null)
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [filterId, setFilterId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const queryClient = useQueryClient()
  const companyId = useAuthStore(s => s.user?.company_id ?? '')
  const refreshToken = useAuthStore(s => s.refreshToken ?? '')
  const activeEnvId = useAuthStore(s => s.user?.environment_id)

  const envColumns = useMemo<ColumnDef<Environment>[]>(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <code className="text-[#004eea] bg-bg-main px-1.5 py-0.5 rounded text-[12px]">{row.original.id.slice(0, 8)}</code>
    },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'description', header: 'Description' },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = activeEnvId === row.original.id;
        return (
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium",
            isActive ? "bg-green-500/15 text-green-500" : "bg-bg-sidebar text-text-muted"
          )}>
            {isActive && <div className="w-[6px] h-[6px] rounded-full bg-green-500" />}
            {isActive ? "Active" : "Inactive"}
          </span>
        )
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-text-main" onClick={(e) => { e.stopPropagation(); handleEdit(row.original); }}>
          <SquarePen size={14} />
        </Button>
      )
    }
  ], [activeEnvId])

  // API Functions
  const fetchEnvironments = async (projectId: string) => {
    const { data } = await api.get('/v1/environment', {
      params: { project_id: projectId, 'project-id': projectId, with_client_type: false }
    })
    return (data.data.environments || []) as Environment[]
  }

  const fetchEnvironmentById = async (id: string, projectId: string) => {
    const { data } = await api.get(`/v1/environment/${id}`, {
      params: { 'project-id': projectId, with_client_type: false }
    })
    return data.data as Environment
  }

  // Queries
  const { data: environments = [], isLoading: isListLoading } = useQuery({
    queryKey: ['environments', projectId],
    queryFn: () => fetchEnvironments(projectId),
    enabled: !!projectId
  })

  const { data: envDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['environment-detail', selectedEnv?.id],
    queryFn: () => fetchEnvironmentById(selectedEnv!.id, projectId),
    enabled: modalMode === 'edit' && isModalOpen && !!selectedEnv?.id
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: { name: string; display_color: string; description: string }) => {
      const state = useAuthStore.getState();
      const token = state.accessToken || '';
      return api.post('/v1/environment', {
        ...payload,
        project_id: projectId,
        company_id: companyId,
      }, {
        params: { 'project-id': projectId, is_uagen: true },
        headers: { 'system-token': token }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
      setIsModalOpen(false)
    }
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; name: string; display_color: string; description: string; access_type: string }) =>
      api.put('/v1/environment', {
        ...payload,
        project_id: projectId,
        company_id: companyId,
      }, {
        params: { 'project-id': projectId }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
      setIsModalOpen(false)
      setSelectedEnv(null)
    }
  })

  const switchMutation = useMutation({
    mutationFn: async (envId: string) => {
      setSwitchingId(envId)
      const { data } = await authApi.put('/v2/refresh', {
        refresh_token: refreshToken,
        env_id: envId,
        project_id: projectId,
        for_env: true,
      }, {
        params: { for_env: true, 'project-id': projectId }
      })
      return data
    },
    onSuccess: (data) => {
      const tokenData = data.data?.token || data.data?.response?.token || data.data || data.response?.token || data
      if (tokenData?.access_token) {
        useAuthStore.setState({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || refreshToken
        })
        console.log('Environment switched successfully')
      }
    },
    onSettled: () => {
      setSwitchingId(null)
    }
  })

  // Filtered Data
  const displayedEnvironments = useMemo(() => {
    let filtered = environments;
    if (filterId) {
      filtered = filtered.filter(env => env.id === filterId);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(env =>
        env.name.toLowerCase().includes(query) ||
        env.description?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [environments, filterId, searchQuery]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    display_color: '#3b82f6',
    access_type: 'PUBLIC'
  })

  const handleEdit = (env: Environment) => {
    setSelectedEnv(env)
    setFormData({
      name: env.name,
      description: env.description,
      display_color: env.display_color || '#3b82f6',
      access_type: env.access_type || 'PUBLIC'
    })
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleCreateOpen = () => {
    setFormData({
      name: '',
      description: '',
      display_color: '#3b82f6',
      access_type: 'PUBLIC'
    })
    setModalMode('create')
    setIsModalOpen(true)
  }

  if (isListLoading) {
    return <DataLoadingState message="Loading environments..." />
  }

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <div
              onClick={() => setFilterId(null)}
              className={cn(
                "bg-bg-sidebar border border-border-subtle rounded-xl px-4 py-2 min-w-[120px] cursor-pointer transition-all hover:border-primary relative overflow-hidden group shadow-sm flex items-center justify-center",
                !filterId && "border-primary bg-primary/10",
              )}
            >
              <div className={cn("font-[600] text-[13px]", !filterId ? "text-primary" : "text-text-muted")}>All Labs</div>
            </div>

            {environments.map((env) => {
              const isFiltered = filterId === env.id;
              const isActive = activeEnvId === env.id;
              const isSwitching = switchingId === env.id;
              return (
                <div
                  key={env.id}
                  onClick={() => setFilterId(isFiltered ? null : env.id)}
                  className={cn(
                    "bg-bg-sidebar border border-border-subtle rounded-xl px-4 py-2 min-w-[180px] cursor-pointer transition-all hover:border-primary relative overflow-hidden group shadow-sm",
                    isFiltered && "border-primary bg-primary/10",
                    isSwitching && "opacity-70 pointer-events-none"
                  )}
                >
                  {isSwitching && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg-card/50 backdrop-blur-[1px] z-10">
                      <Loader2 size={16} className="animate-spin text-primary" />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className={cn("font-[600] text-[13px]", isFiltered ? "text-primary" : "text-text-main")}>{env.name}</div>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" title="Active Environment" />
                    )}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5 truncate">{env.description || 'Environment'}</div>

                  {!isActive && (
                    <div
                      onClick={(e) => { e.stopPropagation(); switchMutation.mutate(env.id); }}
                      className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/20 hover:bg-primary/30 p-1 rounded-md cursor-pointer"
                      title="Switch to this environment"
                    >
                      <ArrowLeftRight size={10} className="text-primary" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div> */}

        <div className="flex items-center justify-end gap-4 mb-4">
          <Button
            onClick={handleCreateOpen}
            className="bg-primary hover:bg-primary/90 text-white fill-white rounded-lg px-4 h-9 text-[13px] font-medium shadow-sm transition-all"
          >
            <Plus size={16} className="mr-1.5" />
            Add Environment
          </Button>
        </div>

        {environments.length > 0 && displayedEnvironments.length > 0 && (
          <WorkspaceDataTable
            columns={envColumns}
            data={displayedEnvironments}
          />
        )}

        {displayedEnvironments.length === 0 && environments.length > 0 && (
          <div className="w-full py-12 text-center bg-bg-sidebar/30 rounded-xl border border-dashed border-border-subtle">
            <p className="text-text-muted text-[13px]">No environments matching the current filters.</p>
            <Button variant="ghost" className="mt-2 text-xs text-primary" onClick={() => { setFilterId(null); setSearchQuery(''); }}>Reset all filters</Button>
          </div>
        )}

        {environments.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[300px] bg-bg-card border border-dashed border-border-subtle rounded-2xl p-8 text-center">
            <div className="bg-primary/5 p-4 rounded-full mb-4">
              <Globe size={32} className="text-primary/40" />
            </div>
            <h3 className="text-lg font-medium text-text-main">No environments yet</h3>
            <p className="text-text-muted text-sm max-w-xs mt-1">Create your first environment to start managing your project deployments.</p>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' ? 'New Environment' : 'Edit Environment'}
            </DialogTitle>
          </DialogHeader>

          {modalMode === 'edit' && isDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary/40" />
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main">Name</label>
                <Input
                  placeholder="e.g. Production"
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="bg-bg-sidebar border-border-subtle focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main">Description</label>
                <Input
                  placeholder="Short description"
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  className="bg-bg-sidebar border-border-subtle focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main">Display Color</label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl border border-border-subtle cursor-pointer overflow-hidden relative shrink-0"
                    style={{ backgroundColor: formData.display_color }}
                  >
                    <input
                      type="color"
                      value={formData.display_color}
                      onChange={(e) => setFormData(p => ({ ...p, display_color: e.target.value }))}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <Input
                    value={formData.display_color}
                    onChange={(e) => setFormData(p => ({ ...p, display_color: e.target.value }))}
                    className="bg-bg-sidebar border-border-subtle h-10 font-mono text-xs uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 border-t border-border-subtle/50 pt-4 gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
              onClick={() => {
                if (modalMode === 'create') {
                  createMutation.mutate(formData)
                } else {
                  updateMutation.mutate({ ...formData, id: selectedEnv!.id })
                }
              }}
              className="bg-primary hover:bg-primary/90 text-white fill-white shadow-sm"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 size={16} className="animate-spin mr-2" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
