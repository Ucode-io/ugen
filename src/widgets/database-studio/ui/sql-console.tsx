'use client'

import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  Play,
  Trash2,
  Plus,
  ChevronRight,
  Database,
  History,
  FileCode,
  LayoutGrid,
  Menu,
  ChevronLeft,
  Settings,
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import {
  useDatabaseStore,
  useTables,
  useExecuteQuery
} from '@/entities/database'
import { api } from '@/shared/api'
import { useAuthStore } from '@/entities/session'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '@/shared/ui'
import { cn } from '@/shared/lib/utils/cn'
import { useUIStore } from '@/shared/model/theme/use-ui-store'
import { useTranslations } from 'next-intl'
import {
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/ui'

export const SqlConsole = () => {
  const t = useTranslations('widgets.databaseStudio')
  const { theme } = useUIStore()
  const {
    sqlScripts,
    activeScriptId,
    updateActiveScript,
    setActiveScriptId,
    addScript
  } = useDatabaseStore()

  const { data: tables, isLoading: isTablesLoading } = useTables()
  const executeMutation = useExecuteQuery()

  const activeScript = sqlScripts.find(s => s.id === activeScriptId)
  const [results, setResults] = useState<any[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const handleRun = async () => {
    if (!activeScript?.content) return
    try {
      const data = await executeMutation.mutateAsync(activeScript.content)
      setResults(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) updateActiveScript(value)
  }

  const handleTableClick = (tableName: string) => {
    updateActiveScript(`SELECT * FROM ${tableName} LIMIT 10;`.trim())
  }

  const projectId = useAuthStore((state) => state.project?.project_id)
  const queryClient = useQueryClient()

  const { data: customEndpoints = [], isLoading: isEndpointsLoading } = useQuery({
    queryKey: ['custom-endpoints', projectId],
    queryFn: async () => {
      const { data } = await api.get('/v1/custom-endpoints')
      return (data?.data?.endpoints ?? []) as any[]
    },
    enabled: !!projectId
  })

  console.log({ customEndpoints })

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', method: 'GET' })

  const createEndpointMutation = useMutation({
    mutationFn: (payload: any) => api.post('/v1/custom-endpoints', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-endpoints'] })
      setIsSaveModalOpen(false)
      setFormData({ name: '', description: '', method: 'GET' })
    }
  })

  const handleSaveEndpoint = () => {
    if (!activeScript?.content) return
    createEndpointMutation.mutate({
      ...formData,
      sql: activeScript.content,
      parameters: [],
      in_transaction: false
    })
  }

  const loadEndpointAsScript = (endpoint: any) => {
    const existingScript = sqlScripts.find(s => s.id === endpoint.id)
    if (!existingScript) {
      addScript(endpoint.name, endpoint.sql)
      // The store sets active script internally, but we can't easily know the new ID here unless we change store logic.
      // Assuming store appends, we could guess the ID or we update the store to accept IDs.
      // For simplicity, we just add it. The user will click it in local scripts.
    }
  }

  const columns = React.useMemo(() => {
    if (!results.length) return []
    return Object.keys(results[0]).map(key => ({
      accessorKey: key,
      header: key,
      cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
        const val = row.getValue(key)
        const displayVal = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '')
        return <span title={displayVal} className="truncate block max-w-[200px]">{displayVal}</span>
      }
    }))
  }, [results])

  return (
    <div className="flex bg-bg-card flex-1 flex-col sm:flex-row overflow-hidden min-h-[600px] h-[calc(100vh-280px)]">
      {/* Sidebar Panel */}
      <div
        className={cn(
          "w-64 flex flex-col border-r border-border-subtle bg-bg-main/50 transition-all duration-300",
          !isSidebarOpen && "w-0 -translate-x-full pointer-events-none sm:w-0 sm:opacity-0"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-subtle h-[57px]">
          <h4 className="text-sm font-semibold text-text-main flex items-center gap-2">
            <Database size={14} className="text-primary" />
            {t('sqlConsole.explorer')}
          </h4>
          {/* <button
            onClick={() => addScript(`Query ${sqlScripts.length + 1}`, 'SELECT * FROM users LIMIT 10;')}
            className="p-1 px-1.5 rounded-md hover:bg-hover-bg text-text-muted hover:text-text-main transition-all border border-transparent hover:border-border-subtle"
          >
            <Plus size={14} />
          </button> */}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4">
          {/* Scripts Section */}
          {/* <div className="space-y-1">
            <span className="px-2 py-1.5 text-[11px] font-bold text-text-muted/70 uppercase tracking-widest flex items-center gap-2">
              <History size={12} />
              {t('sqlConsole.scripts')}
            </span>
            {sqlScripts.map(script => (
              <button
                key={script.id}
                onClick={() => setActiveScriptId(script.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group",
                  activeScriptId === script.id
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:text-text-main hover:bg-hover-bg active:scale-[0.98]"
                )}
              >
                <FileCode size={14} className={cn(activeScriptId === script.id ? "text-primary" : "text-text-muted/60")} />
                <span className="truncate">{script.name}</span>
              </button>
            ))}
          </div> */}

          <div className="space-y-1">
            <span className="px-2 py-1.5 text-[11px] font-bold text-text-muted/70 uppercase tracking-widest flex items-center gap-2 mt-4">
              <Sparkles size={12} />
              Custom Endpoints
            </span>
            {isEndpointsLoading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : customEndpoints.map(endpoint => (
              <button
                key={endpoint.id}
                onClick={() => loadEndpointAsScript(endpoint)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-text-muted hover:text-text-main hover:bg-hover-bg transition-all group active:scale-[0.98]"
                title="Load into Editor"
              >
                <span className="bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0">
                  {endpoint.method}
                </span>
                <span className="truncate flex-1 text-left">{endpoint.name}</span>
              </button>
            ))}
          </div>

          {/* Tables Section */}
          <div className="space-y-1">
            <span className="px-2 py-1.5 text-[11px] font-bold text-text-muted/70 uppercase tracking-widest flex items-center gap-2">
              <LayoutGrid size={12} />
              {t('sqlConsole.tables')}
            </span>
            {isTablesLoading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              tables?.map(table => (
                <button
                  key={table.slug}
                  onClick={() => handleTableClick(table.slug)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-text-muted hover:text-text-main hover:bg-hover-bg transition-all group active:scale-[0.98]"
                >
                  <ChevronRight size={12} className="text-text-muted/40 transition-transform group-hover:translate-x-0.5" />
                  <span className="truncate">{table?.label || table.slug}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col bg-bg-card min-w-0 w-full">
        <div className="flex items-center justify-between p-3 border-b border-border-subtle h-[57px] bg-bg-main/30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-md hover:bg-hover-bg text-text-muted border border-border-subtle/50 transition-colors"
            >
              <Menu size={16} />
            </button>
            <div className="h-4 w-px bg-border-subtle mx-1 hidden sm:block" />
            <h4 className="text-sm font-semibold text-text-main hidden sm:block">{activeScript?.name}</h4>
          </div>

          <div className="flex items-center gap-2">
            {/* <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border-subtle text-xs font-semibold text-text-muted hover:text-text-main hover:bg-hover-bg transition-all active:scale-[0.98]">
              <Sparkles size={14} className="text-primary/60" />
              {t('sqlConsole.prettify')}
            </button> */}
            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border-subtle text-xs font-semibold text-text-muted hover:text-text-main hover:bg-hover-bg transition-all active:scale-[0.98]"
            >
              <Settings size={14} className="text-primary/60" />
              Save Endpoint
            </button>
            <button
              onClick={handleRun}
              disabled={executeMutation.isPending}
              className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              {executeMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              {t('sqlConsole.run')}
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 min-h-0 relative group">
          <Editor
            height="100%"
            defaultLanguage="sql"
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            value={activeScript?.content}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              readOnly: false,
              padding: { top: 16, bottom: 16 },
              fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace'
            }}
          />
        </div>

        {/* Results Area */}
        <div className="h-1/2 border-t border-border-subtle flex flex-col bg-bg-main/20">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-main/40 border-b border-border-subtle backdrop-blur-sm">
            <span className="text-[11px] font-bold text-text-muted/80 uppercase tracking-widest">{t('sqlConsole.results')}</span>
            {results.length > 0 && (
              <span className="text-[10px] font-medium text-text-muted px-1.5 py-0.5 bg-hover-bg rounded border border-border-subtle/50">
                {t('sqlConsole.rowsReturned', { count: results.length })}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4">
            {executeMutation.error ? (
              <div className="flex items-start gap-4 p-4 rounded-ai border border-destructive/20 bg-destructive/5 text-destructive">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm">{t('sqlConsole.queryError')}</p>
                  <p className="text-xs opacity-90">Failed to execute SQL query. Please check your syntax and table permissions. Error: {(executeMutation.error as any).message || 'Server returned 500'}</p>
                </div>
              </div>
            ) : results.length > 0 ? (
              <DataTable
                columns={columns}
                data={results}
                containerClassName="border-none shadow-none"
                className="border-none shadow-none"
              />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[150px] text-text-muted space-y-3 grayscale opacity-70">
                <div className="p-3 bg-bg-main rounded-full border border-border-subtle shadow-inner">
                  <History size={24} />
                </div>
                <p className="text-xs font-medium tracking-wide italic">{t('sqlConsole.noResultsYet')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="sm:max-w-md bg-bg-card border-border-subtle">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-text-main">Save as Custom Endpoint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Name</label>
              <Input
                placeholder="e.g. Get Active Users"
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                className="bg-bg-sidebar border-border-subtle h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Method</label>
              <Select value={formData.method} onValueChange={(v) => setFormData(p => ({ ...p, method: v }))}>
                <SelectTrigger className="bg-bg-sidebar border-border-subtle h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Description (Optional)</label>
              <Input
                placeholder="Description of what this endpoint does..."
                value={formData.description}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                className="bg-bg-sidebar border-border-subtle h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSaveModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveEndpoint}
              disabled={createEndpointMutation.isPending || !formData.name}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {createEndpointMutation.isPending ? <RefreshCw size={14} className="animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
