'use client'

import React, { useState, useMemo } from 'react'
import {
  PlusCircle,
  Search,
  Trash2,
  ArrowLeft,
  Terminal,
  Copy,
  Check,
  Settings,
  Database,
  Play,
  X,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  Edit2,
  LayoutGrid,
  ChevronRight
} from 'lucide-react'
import { Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Switch, Skeleton, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, ReusableTabs, UsageIndicator } from '@/shared/ui'
import { WorkspaceDataTable } from './workspace-data-table'
import { ApiIntegrationsPage } from './api-integrations-page'
import { ApiKeysPage } from './api-keys-page'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { useTables } from '@/entities/database'
import Editor from '@monaco-editor/react'
import { useUIStore } from '@/shared/model/theme/use-ui-store'
import { useAuthStore } from '@/entities/session'

interface CustomEndpointParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date'
  required: boolean
}

interface CustomEndpoint {
  id: string
  name: string
  description: string
  sql: string
  method: string
  parameters: CustomEndpointParameter[]
  in_transaction: boolean
  created_at: string
}

const EndpointsView = ({ projectId }: { projectId: string }) => {
  const { theme } = useUIStore()
  const queryClient = useQueryClient()
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'detail'>('list')
  const [search, setSearch] = useState('')
  const [selectedEndpoint, setSelectedEndpoint] = useState<CustomEndpoint | null>(null)
  const [endpointToDelete, setEndpointToDelete] = useState<CustomEndpoint | null>(null)

  const apiKey = useAuthStore((state) => state.apiKey)

  // Execution State
  const [executionParams, setExecutionParams] = useState<Record<string, any>>({})
  const [executionResults, setExecutionResults] = useState<any[]>([])
  const [tableSearch, setTableSearch] = useState('')

  // Form State
  const [formData, setFormData] = useState<Partial<CustomEndpoint>>({
    name: '',
    description: '',
    method: 'GET',
    sql: '',
    parameters: [],
    in_transaction: false
  })

  // Queries
  const { data: endpoints = [], isLoading } = useQuery({
    queryKey: ['custom-endpoints', projectId],
    queryFn: async () => {
      const { data } = await api.get('/v1/custom-endpoints')
      return (data?.data?.endpoints ?? []) as CustomEndpoint[]
    }
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/v1/custom-endpoints', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-endpoints'] })
      setView('list')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.put(`/v1/custom-endpoints/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-endpoints'] })
      setView('list')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/custom-endpoints/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-endpoints'] })
      setEndpointToDelete(null)
    }
  })

  const runMutation = useMutation({
    mutationFn: async ({ id, params }: { id: string; params: any }) => {
      const { data } = await api.post(`/v1/custom-endpoints/${id}/run`, { params })
      const result = data?.data
      return result as any[]
    },
    onSuccess: (data) => {
      setExecutionResults(data)
    }
  })

  const [copied, setCopied] = useState(false)

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }: any) => <span className="font-bold text-text-main">{row.original.name}</span>
    },
    {
      accessorKey: 'method',
      header: 'Method',
      cell: ({ row }: any) => (
        <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full uppercase">
          {row.original.method}
        </span>
      )
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }: any) => <span className="text-sm text-text-muted truncate max-w-[300px] block">{row.original.description}</span>
    },
    {
      id: 'actions',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              setFormData(row.original)
              setSelectedEndpoint(row.original)
              setView('edit')
            }}
            className="text-text-muted hover:bg-hover-bg rounded-lg h-8 w-8"
          >
            <Edit2 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              setEndpointToDelete(row.original)
            }}
            className="text-destructive hover:bg-destructive/10 rounded-lg h-8 w-8"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ], [deleteMutation])

  const handleAddParam = () => {
    setFormData(prev => ({
      ...prev,
      parameters: [...(prev.parameters || []), { name: '', type: 'string', required: true }]
    }))
  }

  const handleRemoveParam = (index: number) => {
    setFormData(prev => ({
      ...prev,
      parameters: (prev.parameters || []).filter((_, i) => i !== index)
    }))
  }

  const handleUpdateParam = (index: number, updates: Partial<CustomEndpointParameter>) => {
    setFormData(prev => ({
      ...prev,
      parameters: (prev.parameters || []).map((p, i) => i === index ? { ...p, ...updates } : p)
    }))
  }

  const { data: tables, isLoading: isTablesLoading } = useTables(tableSearch)

  const handleTableClick = (tableName: string) => {
    const newSql = `SELECT * FROM ${tableName} LIMIT 10;`
    setFormData(p => ({ ...p, sql: newSql }))
  }

  if (view === 'create' || view === 'edit') {
    const isEdit = view === 'edit'
    return (
      <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col min-h-0 overflow-y-auto pb-10">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setView('list')} className="h-8 w-8 rounded-lg">
              <ArrowLeft size={16} className="text-text-muted" />
            </Button>
            <h1 className="text-2xl font-bold text-text-main tracking-tight">
              {isEdit ? `Edit Endpoint: ${formData.name}` : 'Create New Endpoint'}
            </h1>
          </div>
          <Button
            disabled={createMutation.isPending || updateMutation.isPending}
            onClick={() => isEdit ? updateMutation.mutate({ id: formData.id!, payload: formData }) : createMutation.mutate(formData)}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 h-10 shadow-sm font-bold"
          >
            {(createMutation.isPending || updateMutation.isPending) && <Loader2 size={16} className="mr-2 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Endpoint'}
          </Button>
        </div>

        {/* Horizontal Settings Bar */}
        <div className="ai-card p-5 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                <Edit2 size={10} className="text-primary/60" /> Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="Endpoint Name"
                className="bg-bg-sidebar h-10 border-border-subtle/50 text-sm font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                <Terminal size={10} className="text-primary/60" /> Method
              </label>
              <Select
                value={formData.method}
                onValueChange={(v) => setFormData(p => ({ ...p, method: v }))}
              >
                <SelectTrigger className="bg-bg-sidebar h-10 border-border-subtle/50 text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                Description
              </label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="What does this do?"
                className="bg-bg-sidebar h-10 border-border-subtle/50 text-sm"
              />
            </div>

            <div className="flex items-center gap-4 bg-bg-main/30 rounded-xl border border-border-subtle/50 px-4 h-10 mt-5">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-text-main uppercase tracking-widest block leading-none">Atomic</label>
                <span className="text-[9px] text-text-muted">Transaction safe</span>
              </div>
              <Switch
                checked={formData.in_transaction}
                onCheckedChange={(v) => setFormData(p => ({ ...p, in_transaction: v }))}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          {/* Main Work Area (Editor + Parameters) */}
          <div className="lg:col-span-8 xl:col-span-8 flex flex-col gap-6 min-h-0">
            <div className="grid grid-cols-1 gap-6 flex-1 min-h-0">
              {/* SQL Editor Section */}
              <div className="flex flex-col h-full min-h-0">
                <div className="ai-card p-0 flex flex-col h-full overflow-hidden border-primary/5">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle/50 bg-bg-main/20">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                      <Terminal size={12} className="text-primary" /> Source SQL
                    </label>
                    <span className="text-[9px] text-text-muted font-mono bg-bg-sidebar px-2 py-0.5 rounded border border-border-subtle/50">SQL EDITOR v1</span>
                  </div>
                  <div className="flex-1 min-h-[400px]">
                    <Editor
                      height="100%"
                      defaultLanguage="sql"
                      theme={theme === 'dark' ? 'vs-dark' : 'light'}
                      value={formData.sql}
                      onChange={(v) => setFormData(p => ({ ...p, sql: v || '' }))}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        padding: { top: 16, bottom: 16 },
                        fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Parameters Section (Now at the bottom) */}
              <div className="flex flex-col shrink-0">
                <div className="ai-card p-0 flex flex-col overflow-hidden border-primary/5 max-h-[400px]">
                  <div className="flex items-center justify-between px-5 py-2.5 border-b border-border-subtle/50 bg-bg-main/20">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                      <Settings size={12} className="text-primary" /> Parameters
                    </label>
                    <Button variant="ghost" size="sm" onClick={handleAddParam} className="h-7 px-2 text-[10px] rounded-md hover:bg-primary/10 hover:text-primary">
                      <Plus size={12} className="mr-1" /> New Parameter
                    </Button>
                  </div>

                  <div className="overflow-y-auto p-4 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {formData.parameters?.map((param, idx) => (
                        <div key={idx} className="space-y-2 p-3 bg-bg-main/30 rounded-xl border border-border-subtle group relative">
                          <button
                            onClick={() => handleRemoveParam(idx)}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-destructive/10 text-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white z-10"
                          >
                            <X size={10} />
                          </button>

                          <Input
                            value={param.name}
                            onChange={(e) => handleUpdateParam(idx, { name: e.target.value })}
                            placeholder="param_name"
                            className="h-8 bg-bg-sidebar text-xs"
                          />

                          <div className="flex items-center gap-2">
                            <Select
                              value={param.type}
                              onValueChange={(v) => handleUpdateParam(idx, { type: v as any })}
                            >
                              <SelectTrigger className="flex-1 h-8 bg-bg-sidebar text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                              </SelectContent>
                            </Select>

                            <div className="flex items-center gap-2 px-2 h-8 border border-border-subtle rounded-lg bg-bg-sidebar">
                              <span className="text-[9px] font-bold text-text-muted uppercase">Req</span>
                              <Switch
                                style={{ transform: 'scale(0.7)' }}
                                checked={param.required}
                                onCheckedChange={(v) => handleUpdateParam(idx, { required: v })}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {(!formData.parameters || formData.parameters.length === 0) && (
                      <div className="text-center py-8 border border-dashed border-border-subtle rounded-2xl flex flex-col items-center justify-center gap-2 opacity-50">
                        <Settings size={20} className="text-text-muted" />
                        <p className="text-[10px] font-medium leading-tight text-center">No dynamic parameters defined. Use <span className="text-primary">:name</span> in your SQL query.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 xl:col-span-4 ai-card p-4 overflow-y-auto h-full max-h-[446px] border-primary/5 order-last lg:order-none">
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                  <LayoutGrid size={12} className="text-primary" />
                  Schema
                </span>
                {isTablesLoading && <Loader2 size={12} className="animate-spin text-primary/40" />}
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted opacity-50" />
                <input
                  type="text"
                  placeholder="Search tables..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full bg-bg-sidebar border border-border-subtle/50 rounded-lg py-1.5 pl-9 pr-3 text-[11px] outline-none focus:border-primary/30 transition-all"
                />
              </div>

              {isTablesLoading ? (
                <div className="space-y-2.5 p-2">
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              ) : (
                <div className="space-y-1 custom-scrollbar">
                  {tables?.map(table => (
                    <button
                      key={table.slug}
                      onClick={() => handleTableClick(table.slug)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-text-muted hover:text-primary hover:bg-primary/5 transition-all group active:scale-[0.98]"
                    >
                      <ChevronRight size={10} className="text-primary/30 transition-transform group-hover:translate-x-0.5" />
                      <span className="truncate flex-1 text-left">{table?.label || table.slug}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'detail' && selectedEndpoint) {
    const curlCommand = `curl --location '${process.env.NEXT_PUBLIC_BASE_URL || 'https://api.ucode.io'}/v1/custom-endpoints/${selectedEndpoint.id}/run' \\
      --request POST \\
      --header 'authorization: API-KEY' \\
      --header 'x-api-key: ${apiKey}' \\
      --header 'Content-Type: application/json' \\
      --data '${JSON.stringify({ params: executionParams }, null, 2)}'`;

    const resultsColumns = executionResults && executionResults.length > 0
      ? Object.keys(executionResults[0]).map(key => ({
        accessorKey: key,
        header: key,
        cell: ({ row }: any) => {
          const val = row.getValue(key)
          const displayVal = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '')

          return (
            <div className="group relative flex items-center gap-2 max-w-[200px]">
              <span title={displayVal} className="truncate block flex-1">{displayVal}</span>
              {displayVal && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity p-0 shrink-0 hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(displayVal)
                  }}
                >
                  <Copy size={12} className="text-primary" />
                </Button>
              )}
            </div>
          )
        }
      }))
      : []

    return (
      <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col min-h-0 overflow-y-auto pb-10">
        <div className="flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setView('list')} className="h-8 w-8 rounded-lg">
              <ArrowLeft size={16} className="text-text-muted" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-text-main tracking-tight">{selectedEndpoint.name}</h1>
              <p className="font-mono text-xs text-text-muted mt-0.5">
                <span className="text-primary font-bold">{selectedEndpoint.method}</span> /v1/custom-endpoints/{selectedEndpoint.id}/run
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setFormData(selectedEndpoint)
              setView('edit')
            }}
            className="h-10 rounded-xl flex items-center gap-2"
          >
            <Edit2 size={16} /> Edit Endpoint
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="ai-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                  <Play size={14} className="text-primary" /> Execution Parameters
                </span>
                <Button
                  onClick={() => runMutation.mutate({ id: selectedEndpoint.id, params: executionParams })}
                  disabled={runMutation.isPending}
                  className="h-9 px-6 bg-primary text-white rounded-xl"
                >
                  {runMutation.isPending ? <RefreshCw size={14} className="animate-spin mr-2" /> : <Play size={14} className="mr-2" />}
                  Run Endpoint
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedEndpoint.parameters?.map((p, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted flex items-center justify-between">
                      {p.name}
                      {p.required && <span className="text-[10px] text-destructive">*</span>}
                    </label>
                    {p.type === 'date' ? (
                      <Input
                        type="date"
                        value={executionParams[p.name] || ''}
                        onChange={(e) => setExecutionParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                        className="h-9 bg-bg-sidebar"
                      />
                    ) : p.type === 'number' ? (
                      <Input
                        type="number"
                        value={executionParams[p.name] || ''}
                        onChange={(e) => setExecutionParams(prev => ({ ...prev, [p.name]: Number(e.target.value) }))}
                        className="h-9 bg-bg-sidebar"
                      />
                    ) : (
                      <Input
                        value={executionParams[p.name] || ''}
                        onChange={(e) => setExecutionParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                        className="h-9 bg-bg-sidebar"
                      />
                    )}
                  </div>
                ))}
                {(!selectedEndpoint.parameters || selectedEndpoint.parameters.length === 0) && (
                  <div className="col-span-full py-2 text-text-muted text-xs italic">
                    No dynamic parameters required for this query.
                  </div>
                )}
              </div>
            </div>

            <div className="ai-card p-4 flex flex-col gap-3 shrink-0 border border-border-subtle bg-bg-card rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                  <Terminal size={14} className="text-primary" /> cURL Command
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(curlCommand)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? <Check size={14} className="mr-1.5 text-green-500" /> : <Copy size={14} className="mr-1.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <pre className="bg-bg-main p-3.5 rounded-lg text-xs leading-relaxed font-mono text-text-main overflow-x-auto border border-border-subtle/50 whitespace-pre-wrap word-break">
                {curlCommand}
              </pre>
            </div>
          </div>

          <div className="ai-card p-0 flex flex-col border border-border-subtle bg-bg-card rounded-xl overflow-hidden min-h-[400px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-main/30 shrink-0">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                <Database size={14} className="text-primary" /> Results
              </span>
              {executionResults?.length > 0 && (
                <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">
                  {executionResults.length} ROWS
                </span>
              )}
            </div>
            <div className="flex-1 overflow-auto bg-bg-main/5">
              {runMutation.isPending ? (
                <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-60">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Executing Query...</span>
                </div>
              ) : runMutation.error ? (
                <div className="p-6 h-full flex items-center justify-center">
                  <div className="flex items-start gap-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive max-w-md w-full">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-sm">Execution Error</p>
                      <p className="text-xs opacity-90">{(runMutation.error as any).response?.data?.message || (runMutation.error as any).message}</p>
                    </div>
                  </div>
                </div>
              ) : executionResults?.length > 0 ? (
                <WorkspaceDataTable
                  columns={resultsColumns}
                  data={executionResults}
                  className="border-none shadow-none"
                  containerClassName="border-none shadow-none"
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-4 text-text-muted/40 py-20">
                  <Database size={48} />
                  {
                    !executionResults ? <p className="text-xs font-medium italic">Data is empty</p> : <p className="text-xs font-medium italic">Run the endpoint to see results</p>
                  }
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="ai-card p-6 space-y-4">
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Database size={14} className="text-primary" /> Source SQL
          </label>
          <div className="h-[200px] border border-border-subtle rounded-xl overflow-hidden relative group">
            <Editor
              height="100%"
              defaultLanguage="sql"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              value={selectedEndpoint.sql}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                readOnly: true,
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted h-4 w-4" />
            <input
              placeholder="Search endpoints..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[280px] h-8 pl-9 pr-4 rounded-lg bg-bg-sidebar border border-border-subtle text-sm text-text-main placeholder:text-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
          <Button
            onClick={() => {
              setFormData({
                name: '',
                description: '',
                method: 'GET',
                sql: '',
                parameters: [],
                in_transaction: false
              })
              setView('create')
            }}
            className="bg-primary hover:bg-primary/90 text-white rounded-lg px-5 h-8 shadow-sm font-bold text-[13px] font-medium"
          >
            <PlusCircle size={18} className="mr-2" />
            New Endpoint
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4 opacity-50">
          <RefreshCw size={32} className="text-primary animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Loading Endpoints...</span>
        </div>
      ) : (
        <WorkspaceDataTable
          columns={columns}
          data={endpoints?.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))}
          onRowClick={(row) => {
            setSelectedEndpoint(row)
            setExecutionParams({})
            setExecutionResults([])
            setView('detail')
          }}
          emptyMessage="No endpoints found. Create your first SQL API endpoint."
        />
      )}

      <Dialog open={!!endpointToDelete} onOpenChange={(open) => !open && setEndpointToDelete(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete endpoint <span className="font-semibold text-text-main">{endpointToDelete?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="ghost"
              onClick={() => setEndpointToDelete(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (endpointToDelete) {
                  deleteMutation.mutate(endpointToDelete.id)
                }
              }}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Deleting...
                </>
              ) : "Delete Endpoint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const CustomEndpointsPage = ({ projectId }: { projectId: string }) => {
  const [activeTab, setActiveTab] = useState('sdk')


  const { data: pricingData } = useQuery({
    queryKey: ['pricing-all'],
    queryFn: async () => {
      const { data } = await api.get('/v1/pricing/all')
      return data
    },
  })

  const apiCallsItem = pricingData?.data?.monthly_api_calls
  const apiCurrent = apiCallsItem?.current || 0
  const apiLimit = apiCallsItem?.limit || 0
  const apiPercentage = apiLimit > 0 ? Math.min((apiCurrent / apiLimit) * 100, 100) : 0
  

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6">
        <div className='flex items-center justify-between'>
          <div>
            <h1 className="text-[22px] font-bold text-text-main mb-1">API</h1>
            <p className="text-text-muted text-[13px]">Manage endpoints, SDK, and API keys</p>
          </div>
          {/* ── API calls usage indicator ── */}
          <div className='max-w-[320px] grow'>
            <UsageIndicator
              label="API calls / month"
              value={apiCurrent.toLocaleString()}
              total={apiLimit.toLocaleString()}
              percentage={apiPercentage}
              className="flex-1"
            />
          </div>
        </div>

        <ReusableTabs
          className="w-fit"
          activeId={activeTab}
          onTabChange={setActiveTab}
          options={[
            // { id: 'endpoints', label: 'Custom Endpoints' },
            { id: 'sdk', label: 'SDK' },
            { id: 'keys', label: 'API Keys' },
          ]}
        />
      </div>

      <div className="pt-2">
        {activeTab === 'endpoints' && <EndpointsView projectId={projectId} />}
        {activeTab === 'sdk' && <ApiIntegrationsPage projectId={projectId} />}
        {activeTab === 'keys' && <ApiKeysPage projectId={projectId} hideHeader />}
      </div>
    </div>
  )
}
