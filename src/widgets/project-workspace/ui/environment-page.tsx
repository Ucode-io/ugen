'use client'

import { useState } from 'react'
import { ChevronLeft, Loader2, PenLine, ArrowLeftRight, Globe, Plus } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, authApi } from '@/shared/api'
import { useAuthStore } from '@/entities/session'
import { Button } from '@/shared/ui/ui/button'
import { Input } from '@/shared/ui/ui/input'
import { DataLoadingState } from '@/shared/ui/data-states'
import { cn } from '@/shared/lib/utils/cn'

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

type View = 'list' | 'create' | 'edit'

export const EnvironmentPage = ({ projectId }: EnvironmentPageProps) => {
  const [view, setView] = useState<View>('list')
  const [selectedEnv, setSelectedEnv] = useState<Environment | null>(null)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const companyId = useAuthStore(s => s.user?.company_id ?? '')
  const refreshToken = useAuthStore(s => s.refreshToken ?? '')

  // const ucodeProjectId = useAuthStore(state => state.ucodeProjectId)

  // API Functions
  const fetchEnvironments = async (projectId: string) => {
    const { data } = await api.get('/v1/environment', {
      params: { project_id: projectId, 'project-id': projectId }
    })
    return (data.data.environments || []) as Environment[]
  }

  const fetchEnvironmentById = async (id: string, projectId: string) => {
    const { data } = await api.get(`/v1/environment/${id}`, {
      params: { 'project-id': projectId }
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
    enabled: view === 'edit' && !!selectedEnv?.id
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: { name: string; display_color: string; description: string }) =>
      api.post('/v1/environment', {
        ...payload,
        project_id: projectId,
        company_id: companyId,
      }, {
        params: { 'project-id': projectId }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
      setView('list')
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
      setView('list')
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

  // Form handling
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
    setView('edit')
  }

  const handleCreateOpen = () => {
    setFormData({
      name: '',
      description: '',
      display_color: '#3b82f6',
      access_type: 'PUBLIC'
    })
    setView('create')
  }

  if (isListLoading && view === 'list') {
    return <DataLoadingState message="Loading environments..." />
  }

  if (view === 'list') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-main tracking-tight">Environments</h1>
            <p className="text-text-muted text-sm mt-1">Manage different environments for your project.</p>
          </div>
          <Button
            onClick={handleCreateOpen}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl px-5 h-10 shadow-sm"
          >
            <Plus size={18} className="mr-2" />
            Add Environment
          </Button>
        </div>

        {environments.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] bg-bg-card border border-dashed border-border-subtle rounded-2xl p-8 text-center">
            <div className="bg-primary/5 p-4 rounded-full mb-4">
              <Globe size={32} className="text-primary/40" />
            </div>
            <h3 className="text-lg font-medium text-text-main">No environments yet</h3>
            <p className="text-text-muted text-sm max-w-xs mt-1">Create your first environment to start managing your project deployments.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {environments.map((env) => (
              <div
                key={env.id}
                className="bg-bg-card border border-border-subtle rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-primary/20 transition-all shadow-sm"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: env.display_color }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-text-main truncate">{env.name}</h3>
                  <p className="text-[11px] text-text-muted truncate mt-0.5">{env.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => switchMutation.mutate(env.id)}
                    disabled={switchingId === env.id}
                    className="h-8 rounded-lg px-3 text-xs font-medium"
                  >
                    {switchingId === env.id ? (
                      <Loader2 size={12} className="mr-1.5 animate-spin" />
                    ) : (
                      <ArrowLeftRight size={12} className="mr-1.5" />
                    )}
                    Switch
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(env)}
                    className="h-8 w-8 rounded-lg text-text-muted hover:text-primary hover:bg-primary/5"
                  >
                    <PenLine size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const isFormLoading = view === 'edit' && isDetailLoading

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
        <h1 className="text-xl font-bold text-text-main leading-tight">
          {view === 'create' ? 'New Environment' : 'Edit Environment'}
        </h1>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 max-w-lg shadow-sm">
        {isFormLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-primary/40" />
          </div>
        ) : (
          <div className="space-y-5">
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

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle/50">
              <Button
                variant="ghost"
                onClick={() => setView('list')}
                className="rounded-xl px-4"
              >
                Cancel
              </Button>
              <Button
                disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
                onClick={() => {
                  if (view === 'create') {
                    createMutation.mutate(formData)
                  } else {
                    updateMutation.mutate({ ...formData, id: selectedEnv!.id })
                  }
                }}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 shadow-sm"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 size={16} className="animate-spin mr-2" />
                )}
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
