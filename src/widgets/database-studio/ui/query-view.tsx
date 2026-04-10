'use client'

import React, { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { Play, Terminal, ChevronLeft, RefreshCw, Sparkles, AlertCircle } from 'lucide-react'
import { useDatabaseStore, useExecuteQuery } from '@/entities/database'
import { DataTable } from '@/shared/ui'
import { useUIStore } from '@/shared/model/theme/use-ui-store'
import { cn } from '@/shared/lib/utils/cn'

import { useTranslations } from 'next-intl'

interface QueryViewProps {
  defaultQuery?: string;
  hideBackButton?: boolean;
}

export const QueryView = ({ defaultQuery, hideBackButton = false }: QueryViewProps = {}) => {
  const t = useTranslations('widgets.databaseStudio')
  const tGlobal = useTranslations('databaseStudio')
  const { theme } = useUIStore()
  const { selectedTable, setCurrentView } = useDatabaseStore()
  const executeMutation = useExecuteQuery()

  const [query, setQuery] = useState(defaultQuery || '')
  const [results, setResults] = useState<any[]>([])
  const [types, setTypes] = useState<Record<string, string>>({})

  useEffect(() => {
    if (defaultQuery) {
      setQuery(defaultQuery)
    } else if (selectedTable) {
      setQuery(`SELECT * FROM public."${selectedTable}" LIMIT 100;`)
    }
  }, [selectedTable, defaultQuery])

  const handleRun = async () => {
    if (!query) return
    try {
      const data = await executeMutation.mutateAsync(query)
      setResults(data.items)
      setTypes(data.types)
    } catch (err) {
      console.error(err)
    }
  }

  const columns = React.useMemo(() => {
    if (!results.length) return []
    return Object.keys(results[0]).map(key => {
      const pgType = types[key] || ''
      return {
        accessorKey: key,
        header: () => (
          <div className="min-w-[150px] py-1 flex items-center gap-2">
            <span className="font-bold text-text-main text-[11px] uppercase tracking-wider truncate">{key}</span>
            {pgType && (
              <span className="text-[9px] text-text-muted/60 font-mono font-medium bg-bg-sidebar px-1 rounded border border-border-subtle/50">
                {pgType}
              </span>
            )}
          </div>
        ),
        cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
          const val = row.getValue(key)
          let content: React.ReactNode = null

          const isUuid = pgType === 'uuid' || (typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val))
          const isBool = pgType === 'bool' || typeof val === 'boolean'
          const isTimestamp = pgType === 'timestamp' || pgType === 'timestamptz' || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val))

          if (typeof val === 'number') {
            content = <span className="text-blue-500 font-mono text-[12px] font-semibold">{val}</span>
          } else if (isBool) {
            const boolVal = val === true || val === 'true' || val === '1'
            return (
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide inline-flex items-center justify-center min-w-[50px]",
                boolVal ? "bg-primary/10 text-primary border border-primary/20" : "bg-text-muted/10 text-text-muted border border-text-muted/20"
              )}>
                {boolVal ? 'TRUE' : 'FALSE'}
              </span>
            )
          } else if (val === null) {
            content = <span className="text-text-muted/40 italic text-[11px]">null</span>
          } else if (isUuid) {
            content = <span className="text-amber-600/80 font-mono text-[11px] truncate block w-[180px]" title={String(val)}>{String(val)}</span>
          } else {
            const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')
            content = (
              <span className={cn("text-[13px] font-medium truncate", isTimestamp ? "text-text-muted/70 font-mono" : "text-text-main")} title={displayVal}>
                {displayVal}
              </span>
            )
          }

          return <div className="min-w-[150px] max-w-[300px] truncate">{content}</div>
        }
      }
    })
  }, [results, types])

  if (!selectedTable && !defaultQuery) return null

  return (
    <div className="flex flex-col h-full bg-bg-card rounded-ai border border-border-subtle shadow-sm overflow-hidden min-h-[500px] h-[calc(100vh-280px)]">
      <div className="flex items-center justify-between p-4 border-b border-border-subtle h-[57px] bg-bg-main/30">
        <div className="flex items-center gap-2">
          {!hideBackButton && (
            <button
              onClick={() => setCurrentView('records')}
              className="p-1 rounded hover:bg-hover-bg text-text-muted hover:text-text-main transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <h3 className="text-sm font-semibold text-text-main flex items-center gap-2">
            <Terminal size={14} className="text-primary" />
            {defaultQuery ? 'Code View' : tGlobal('query.title', { table: selectedTable || '' })}
          </h3>
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
            {tGlobal('query.runQuery')}
          </button>
        </div>
      </div>

      {/* Editor Section */}
      <div className="h-1/3 min-h-[150px] relative border-b border-border-subtle">
        <Editor
          height="100%"
          defaultLanguage="sql"
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={query}
          onChange={(v) => v !== undefined && setQuery(v)}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace'
          }}
        />
      </div>

      {/* Results Section */}
      <div className="flex-1 flex flex-col bg-bg-main/20 overflow-hidden">
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
                <p className="text-xs opacity-90">{executeMutation.error instanceof Error ? executeMutation.error.message : 'Server returned 500'}</p>
              </div>
            </div>
          ) : results.length > 0 ? (
            <DataTable
              columns={columns}
              data={results}
              containerClassName="border-none shadow-none"
            />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[150px] text-text-muted space-y-3 grayscale opacity-70">
              <Terminal size={32} />
              <p className="text-xs font-medium tracking-wide italic">{tGlobal('query.resultsPlaceholder')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
