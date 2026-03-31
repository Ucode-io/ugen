'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  Loader2,
  PlusCircle,
  Download,
  KeyRound,
  Eye,
  EyeOff,
  ScrollText,
  Search,
  Lock as LockIcon
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ColumnDef } from '@tanstack/react-table'
import { api, authApi } from '@/shared/api'
import { useAuthStore } from '@/entities/session'
import { Button } from '@/shared/ui'
import { Input } from '@/shared/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import { DataTable } from '@/shared/ui'
import { ReusableTabs } from '@/shared/ui'
import { DataLoadingState } from '@/shared/ui'
import { cn } from '@/shared/lib/utils/cn'

interface ClientPlatform {
  id: string
  name: string
  subdomain?: string
}

interface ApiKey {
  id: string
  status: string
  name: string
  app_id: string
  role_id: string
  created_at: string
  updated_at: string
  app_secret: string
  environment_id: string
  project_id: string
  client_type_id: string
  rps_limit: number
  monthly_request_limit: number
  client_id: string
  disable: boolean
  client_platform: ClientPlatform
}

interface LogItem {
  action?: string
  collection?: string
  action_on?: string
  [key: string]: any
}

interface TokenItem {
  client_id?: string
  given_time?: string
  info?: string
  [key: string]: any
}

interface ApiKeysPageProps {
  projectId: string
  activeTab?: 'api_keys' | 'secrets'
}

type View = 'list' | 'create' | 'detail'

export const ApiKeysPage = ({ projectId, activeTab: externalActiveTab }: ApiKeysPageProps) => {
  const [view, setView] = useState<View>('list')
  const [internalActiveTab, setInternalActiveTab] = useState('api_keys')
  
  const activeTab = externalActiveTab || internalActiveTab
  const setActiveTab = externalActiveTab ? () => {} : setInternalActiveTab

  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)
  const [detailTab, setDetailTab] = useState<'api_key' | 'log' | 'tokens'>('api_key')
  const [showSecret, setShowSecret] = useState(false)

  const queryClient = useQueryClient()
  const environmentId = useAuthStore(s => s.user?.environment_id ?? '')

  // API Functions
  const fetchApiKeys = async (projectId: string, environmentId: string) => {
    const { data } = await authApi.get(`/v2/api-key/${projectId}`, {
      params: { 'environment-id': environmentId, 'project-id': projectId }
    })
    return (data.data?.data ?? []) as ApiKey[]
  }

  const fetchApiKeyDetail = async (projectId: string, apiKeyId: string) => {
    const { data } = await authApi.get(`/v2/api-key/${projectId}/${apiKeyId}`, {
      params: { 'project-id': projectId }
    })
    return data.data as ApiKey
  }

  const fetchLogs = async (environmentId: string, appId: string) => {
    const { data } = await api.get(`/v2/version/history/${environmentId}`, {
      params: {
        type: 'API_KEY',
        limit: 10,
        offset: 0,
        api_key: appId,
        from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to_date: new Date().toISOString().split('T')[0],
      }
    })
    const d = data.data
    return Array.isArray(d) ? d : []
  }

  const fetchTokens = async (clientId: string, projectId: string) => {
    const { data } = await authApi.get(`/v2/api-key//tokens`, {
      params: { client_id: clientId, 'project-id': projectId }
    })
    const d = data.data
    return Array.isArray(d) ? d : []
  }

  const fetchClientPlatforms = async () => {
    const { data } = await authApi.get('/v2/client-platform')
    return (data?.data?.client_platforms ?? []).map((item: any) => ({
      label: item.name,
      value: item.id,
    }))
  }

  // Queries
  const { data: apiKeys = [], isLoading: isListLoading } = useQuery({
    queryKey: ['api-keys', projectId, environmentId],
    queryFn: () => fetchApiKeys(projectId, environmentId),
    enabled: !!projectId && !!environmentId && activeTab === 'api_keys'
  })

  const { data: apiKeyDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['api-key-detail', selectedKey?.id],
    queryFn: () => fetchApiKeyDetail(projectId, selectedKey!.id),
    enabled: view === 'detail' && detailTab === 'api_key' && !!selectedKey?.id
  })

  const { data: logs = [], isLoading: isLogsLoading } = useQuery({
    queryKey: ['api-key-logs', selectedKey?.id],
    queryFn: () => fetchLogs(environmentId, selectedKey!.app_id),
    enabled: view === 'detail' && detailTab === 'log' && !!selectedKey?.id
  })

  const { data: tokens = [], isLoading: isTokensLoading } = useQuery({
    queryKey: ['api-key-tokens', selectedKey?.id],
    queryFn: () => fetchTokens(selectedKey!.client_id, projectId),
    enabled: view === 'detail' && detailTab === 'tokens' && !!selectedKey?.id
  })

  const { data: platforms = [], isLoading: isPlatformsLoading } = useQuery({
    queryKey: ['client-platforms'],
    queryFn: fetchClientPlatforms,
    enabled: view === 'create'
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string
      client_platform_id: string
      environment_id: string
      project_id: string
      client_type_id: string
      role_id: string
    }) => authApi.post(`/v2/api-key/${projectId}`, payload, {
      params: { 'project-id': projectId }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', projectId] })
      setView('list')
    }
  })

  // Handlers
  const handleDownloadDocs = () => {
    const url = window.location.origin + '/apikeys.zip'
    const a = document.createElement('a')
    a.href = url
    a.setAttribute('download', 'apikeys.zip')
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const [createForm, setCreateForm] = useState({
    name: '',
    platformId: ''
  })

  const handleCreate = () => {
    const firstKey = apiKeys[0]
    createMutation.mutate({
      name: createForm.name,
      client_platform_id: createForm.platformId,
      environment_id: environmentId,
      project_id: projectId,
      client_type_id: firstKey?.client_type_id || '',
      role_id: firstKey?.role_id || ''
    })
  }

  // DataTable Columns
  const columns: ColumnDef<ApiKey>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-main">{row.original.name}</span>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
            row.original.status === 'ACTIVE' ? "bg-green-500/10 text-green-600" : "bg-text-muted/10 text-text-muted"
          )}>
            {row.original.status}
          </span>
        </div>
      )
    },
    {
      accessorKey: 'app_id',
      header: 'App ID',
      cell: ({ row }) => <span className="font-mono text-[11px] text-text-muted">{row.original.app_id}</span>
    },
    {
      accessorKey: 'client_id',
      header: 'Client ID',
      cell: ({ row }) => <span className="font-mono text-[11px] text-text-muted">{row.original.client_id}</span>
    },
    {
      accessorKey: 'platform',
      header: 'Platform',
      cell: ({ row }) => <span>{row.original.client_platform?.name}</span>
    },
    {
      accessorKey: 'monthly_request_limit',
      header: 'Monthly Limit',
      cell: ({ row }) => <span>{row.original.monthly_request_limit.toLocaleString()}</span>
    },
    {
      accessorKey: 'rps_limit',
      header: 'RPS Limit',
      cell: ({ row }) => <span>{row.original.rps_limit}</span>
    },
    {
      accessorKey: 'disable',
      header: 'Status',
      cell: ({ row }) => (
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
          row.original.disable ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-600"
        )}>
          {row.original.disable ? 'Disabled' : 'Enabled'}
        </span>
      )
    }
  ], [])

  if (view === 'list') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {!externalActiveTab && (
          <div className="flex items-center justify-between">
            <ReusableTabs
              activeId={activeTab}
              onTabChange={setActiveTab}
              options={[
                { id: 'api_keys', label: 'API keys', icon: <KeyRound size={14} /> },
                { id: 'secrets', label: 'Secrets', icon: <LockIcon size={14} /> },
              ]}
            />
          </div>
        )}

        {activeTab === 'api_keys' ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-text-main tracking-tight">API Keys</h1>
                <p className="text-text-muted text-sm mt-1">Manage API keys and authentication for your applications.</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleDownloadDocs}
                  className="rounded-xl h-10 px-4 text-xs font-semibold"
                >
                  <Download size={16} className="mr-2" />
                  Download API Documentation
                </Button>
                <Button
                  onClick={() => setView('create')}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl h-10 px-5 shadow-sm"
                >
                  <PlusCircle size={18} className="mr-2" />
                  Add API Key
                </Button>
              </div>
            </div>

            {isListLoading ? (
              <DataLoadingState message="Loading API keys..." />
            ) : (
              <DataTable
                columns={columns}
                data={apiKeys}
                onRowClick={(row) => {
                  setSelectedKey(row)
                  setDetailTab('api_key')
                  setView('detail')
                }}
                emptyMessage="No API keys found. Create one to get started."
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[400px] bg-bg-card border border-dashed border-border-subtle rounded-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-primary/5 p-4 rounded-full mb-4">
              <LockIcon size={32} className="text-primary/40" />
            </div>
            <h3 className="text-lg font-medium text-text-main">No secrets yet</h3>
            <p className="text-text-muted text-sm max-w-xs mt-1">Manage your environment variables and sensitive information securely.</p>
          </div>
        )}
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
          <h1 className="text-xl font-bold text-text-main leading-tight">New API Key</h1>
        </div>

        <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 max-w-lg shadow-sm">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-main">Name</label>
              <Input
                placeholder="e.g. Mobile App Key"
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                className="bg-bg-sidebar border-border-subtle focus:ring-1 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-main">Platform</label>
              <Select
                value={createForm.platformId}
                onValueChange={(v) => setCreateForm(prev => ({ ...prev, platformId: v }))}
                disabled={isPlatformsLoading}
              >
                <SelectTrigger className="bg-bg-sidebar border-border-subtle">
                  <SelectValue placeholder={isPlatformsLoading ? "Loading platforms..." : "Select platform"} />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((p: any) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                disabled={!createForm.name || !createForm.platformId || createMutation.isPending}
                onClick={handleCreate}
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

  if (view === 'detail' && selectedKey) {
    const detail = apiKeyDetail || selectedKey

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setView('list')
                setSelectedKey(null)
              }}
              className="h-8 w-8 rounded-lg"
            >
              <ChevronLeft size={16} />
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-text-main leading-tight">{selectedKey.name}</h1>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                selectedKey.disable ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-600"
              )}>
                {selectedKey.disable ? 'Disabled' : 'Enabled'}
              </span>
            </div>
          </div>
        </div>

        <ReusableTabs
          options={[
            { id: 'api_key', label: 'API Key' },
            { id: 'log', label: 'Log' },
            { id: 'tokens', label: 'Tokens' },
          ]}
          activeId={detailTab}
          onTabChange={(id) => setDetailTab(id as any)}
          className="max-w-fit"
        />

        <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm overflow-hidden">
          {detailTab === 'api_key' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 max-w-4xl">
              {[
                { label: 'Name', value: detail.name },
                { label: 'App ID', value: detail.app_id },
                { label: 'Client ID', value: detail.client_id },
                {
                  label: 'App Secret',
                  value: detail.app_secret,
                  isSecret: true
                },
                { label: 'Platform', value: detail.client_platform?.name },
                { label: 'Monthly Limit', value: detail.monthly_request_limit?.toLocaleString() },
                { label: 'RPS Limit', value: detail.rps_limit },
                { label: 'Status', value: detail.status },
                { label: 'Environment ID', value: detail.environment_id },
                { label: 'Created At', value: new Date(detail.created_at).toLocaleString() },
              ].map((field, idx) => (
                <div key={idx} className="space-y-1.5">
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{field.label}</label>
                  <div className="group relative">
                    <div className="bg-bg-sidebar border border-border-subtle rounded-xl px-4 py-2.5 text-sm font-mono select-all cursor-text text-text-main pr-10">
                      {field.isSecret && !showSecret ? '••••••••••••••••' : field.value}
                    </div>
                    {field.isSecret && (
                      <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
                      >
                        {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {detailTab === 'log' && (
            <div className="space-y-4">
              {isLogsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-primary/40" />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ScrollText size={32} className="text-text-muted/30 mb-3" />
                  <p className="text-text-muted text-sm">No logs available for this period</p>
                </div>
              ) : (
                <DataTable
                  columns={[
                    { accessorKey: 'action', header: 'Action' },
                    { accessorKey: 'collection', header: 'Collection' },
                    { accessorKey: 'action_on', header: 'Action On' }
                  ]}
                  data={logs}
                />
              )}
            </div>
          )}

          {detailTab === 'tokens' && (
            <div className="space-y-4">
              {isTokensLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-primary/40" />
                </div>
              ) : tokens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <KeyRound size={32} className="text-text-muted/30 mb-3" />
                  <p className="text-text-muted text-sm">No active tokens found</p>
                </div>
              ) : (
                <DataTable
                  columns={[
                    { accessorKey: 'client_id', header: 'Client ID' },
                    { accessorKey: 'given_time', header: 'Given Time' },
                    { accessorKey: 'info', header: 'Info' }
                  ]}
                  data={tokens}
                />
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
