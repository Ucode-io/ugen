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
import { DataTable } from '@/shared/ui'
import { cn } from '@/shared/lib/utils/cn'
import { useUIStore } from '@/shared/model/theme/use-ui-store'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/shared/ui'

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
    const currentContent = activeScript?.content || ''
    updateActiveScript(`SELECT * FROM ${tableName} LIMIT 10;`.trim())
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

  console.log({ isSidebarOpen })

  return (
    <div className="flex bg-bg-card flex-1 flex-col sm:flex-row overflow-hidden max-w-[960px] min-h-[600px] h-[calc(100vh-280px)]">
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
          <button
            onClick={() => addScript(`Query ${sqlScripts.length + 1}`, 'SELECT * FROM users LIMIT 10;')}
            className="p-1 px-1.5 rounded-md hover:bg-hover-bg text-text-muted hover:text-text-main transition-all border border-transparent hover:border-border-subtle"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4">
          {/* Scripts Section */}
          <div className="space-y-1">
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
      <div className="flex-1 flex flex-col bg-bg-card min-w-0">
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
    </div>
  )
}
