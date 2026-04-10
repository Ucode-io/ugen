'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  Play,
  History,
  Menu,
  Settings,
  Sparkles,
  RefreshCw,
  AlertCircle,
  PanelLeftClose,
  PanelRightClose
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
    addScript
  } = useDatabaseStore()

  const { data: tables, isLoading: isTablesLoading } = useTables()
  const tablesRef = useRef(tables)

  useEffect(() => {
    tablesRef.current = tables
  }, [tables])

  const executeMutation = useExecuteQuery()

  const activeScript = sqlScripts.find(s => s.id === activeScriptId)
  const [results, setResults] = useState<any[]>([])
  const [types, setTypes] = useState<any>({})
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const handleRun = async () => {
    if (!activeScript?.content) return
    try {
      const data = await executeMutation.mutateAsync(activeScript.content)
      setResults(data.items)
      setTypes(data.types)
    } catch (err) {
      console.error(err)
    }
  }

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) updateActiveScript(value)
  }

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Register completion provider for SQL tables
    const provider = monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: [' ', '.', '"'],
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const currentTables = tablesRef.current || [];

        const suggestions = currentTables.map((table: any) => ({
          label: table.slug,
          kind: monaco.languages.CompletionItemKind.Field,
          documentation: table.label || table.slug,
          insertText: table.slug,
          range: range,
          detail: 'Table'
        }));

        const keywords = [
          { label: 'SELECT', insertText: 'SELECT', kind: monaco.languages.CompletionItemKind.Keyword, range },
          { label: 'FROM', insertText: 'FROM', kind: monaco.languages.CompletionItemKind.Keyword, range },
          { label: 'WHERE', insertText: 'WHERE', kind: monaco.languages.CompletionItemKind.Keyword, range },
          { label: 'INSERT INTO', insertText: 'INSERT INTO', kind: monaco.languages.CompletionItemKind.Keyword, range },
          { label: 'UPDATE', insertText: 'UPDATE', kind: monaco.languages.CompletionItemKind.Keyword, range },
          { label: 'DELETE FROM', insertText: 'DELETE FROM', kind: monaco.languages.CompletionItemKind.Keyword, range },
          { label: 'LIMIT 10', insertText: 'LIMIT 10', kind: monaco.languages.CompletionItemKind.Snippet, range },
        ];

        return { suggestions: [...suggestions, ...keywords] };
      },
    });

    // Cleanup on editor dispose
    editor.onDidDispose(() => {
      provider.dispose();
    });
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

  const columns = useMemo(() => {
    if (!results.length) return []
    return Object.keys(results[0]).map(key => {
      const pgType = types[key] || ''
      return {
        accessorKey: key,
        header: () => (
          <div className="min-w-[200px] py-1 flex items-center gap-2">
            <div className="font-bold text-text-main text-[11px] uppercase tracking-wider truncate" title={key}>
              {key}
            </div>
            {pgType && (
              <div className="text-[9px] text-text-muted/60 font-mono font-medium bg-bg-sidebar w-fit px-1 rounded border border-border-subtle/50">
                {pgType}
              </div>
            )}
          </div>
        ),
        cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
          const val = row.getValue(key)
          let content: React.ReactNode = null

          // Enhanced rendering based on PG Type or Heuristics
          const isArrayType = pgType.startsWith('_')
          const isUuid = pgType === 'uuid' || (typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val))
          const isBool = pgType === 'bool' || typeof val === 'boolean'
          const isTimestamp = pgType === 'timestamp' || pgType === 'timestamptz' || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val))

          if (typeof val === 'number') {
            content = <span className="text-blue-500 font-mono text-[12px] font-semibold">{val}</span>
          } else if (isBool) {
            const boolVal = val === true || val === 'true' || val === '1'
            content = (
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide inline-flex items-center justify-center min-w-[50px]",
                boolVal
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-text-muted/10 text-text-muted border border-text-muted/20"
              )}>
                {boolVal ? 'TRUE' : 'FALSE'}
              </span>
            )
          } else if (val === null) {
            content = <span className="text-text-muted/40 italic text-[11px] px-1">null</span>
          } else if (isUuid) {
            content = <span className="text-amber-600/80 font-mono text-[11px] truncate block w-[200px]" title={String(val)}>{String(val)}</span>
          } else if (isArrayType || (typeof val === 'object' && val !== null)) {
            const displayObj = typeof val === 'string' ? val : JSON.stringify(val);
            content = (
              <div className="flex items-center gap-1 overflow-hidden max-w-[300px]">
                <span className="text-teal-600 font-mono text-[10px] bg-teal-50 px-1 rounded border border-teal-100/50 truncate">
                  {displayObj}
                </span>
              </div>
            )
          } else {
            const displayVal = String(val ?? '')
            content = (
              <span className={cn(isTimestamp ? "text-text-muted/70 font-mono text-[12px]" : "text-text-main")} title={displayVal}>
                {displayVal}
              </span>
            )
          }

          return (
            <div className="min-w-[200px] max-w-[400px] truncate text-[13px] leading-tight py-0 px-1 -mx-1">
              {content}
            </div>
          )
        }
      }
    })
  }, [results, types])

  return (
    <div className="flex bg-bg-card flex-1 flex-col sm:flex-row overflow-hidden min-h-[600px] h-[calc(100vh-280px)]">
      {/* Sidebar Panel */}
      <div
        className={cn(
          "w-64 flex flex-col border-r border-border-subtle bg-bg-main/50 transition-all duration-300",
          !isSidebarOpen && "w-0 -translate-x-full pointer-events-none sm:w-0 sm:opacity-0"
        )}
      >
        {/* <div className="flex items-center justify-between p-4 border-b border-border-subtle h-[57px]">
          <h4 className="text-sm font-semibold text-text-main flex items-center gap-2">
            <Database size={14} className="text-primary" />
            {t('sqlConsole.explorer')}
          </h4>
          <button
            onClick={() => addScript(`Query ${sqlScripts.length + 1}`, 'SELECT * FROM users LIMIT 10;')}
            className="p-1 px-1.5 rounded-md hover:bg-hover-bg text-text-muted hover:text-text-main transition-all border border-transparent hover:border-border-subtle"
          >
            <Plus size={14} />
          </button>
        </div> */}

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-2">
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
            <span className="px-2 py-1.5 text-[11px] font-bold text-text-muted/70 uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={12} />
              Saved Queries
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
                className="w-full flex items-center gap-3 px-3 py-1 rounded-md text-sm font-medium text-text-muted hover:text-text-main hover:bg-hover-bg transition-all group active:scale-[0.98]"
                title="Load into Editor"
              >
                <span className="bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0">
                  {endpoint.method}
                </span>
                <span className="truncate flex-1 text-left">{endpoint.name}</span>
              </button>
            ))}
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
              {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelRightClose size={16} />}
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
              Save Query
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
            onMount={handleEditorDidMount}
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
          <div className="flex-1 overflow-auto">
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
                tableClassName="min-w-max"
                className="border-none shadow-none [&_td]:p-1.5 [&_td]:border [&_td]:border-border-subtle [&_th]:p-1.5 [&_th]:border [&_th]:border-border-subtle [&_th]:h-8"
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
