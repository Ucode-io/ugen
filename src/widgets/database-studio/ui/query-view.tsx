'use client'

import React, { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { Play, Terminal, ChevronLeft, RefreshCw, Sparkles, AlertCircle } from 'lucide-react'
import { useDatabaseStore, useExecuteQuery } from '@/entities/database'
import { DataTable } from '@/shared/ui'
import { useUIStore } from '@/shared/model/theme/use-ui-store'

import { useTranslations } from 'next-intl'

export const QueryView = () => {
  const t = useTranslations('widgets.databaseStudio')
  const { theme } = useUIStore()
  const { selectedTable, setCurrentView } = useDatabaseStore()
  const executeMutation = useExecuteQuery()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    if (selectedTable) {
      setQuery(`SELECT * FROM public."${selectedTable}" LIMIT 100;`)
    }
  }, [selectedTable])

  const handleRun = async () => {
    if (!query) return
    try {
      const data = await executeMutation.mutateAsync(query)
      setResults(data)
    } catch (err) {
      console.error(err)
    }
  }

  const columns = React.useMemo(() => {
    if (!results.length) return []
    return Object.keys(results[0]).map(key => ({
      accessorKey: key,
      header: key,
      cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
        const val = row.getValue(key)
        return <span>{String(val ?? '')}</span>
      }
    }))
  }, [results])

  if (!selectedTable) return null

  return (
    <div className="flex flex-col h-full bg-bg-card rounded-ai border border-border-subtle shadow-sm overflow-hidden min-h-[500px] h-[calc(100vh-280px)]">
      <div className="flex items-center justify-between p-4 border-b border-border-subtle h-[57px] bg-bg-main/30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('records')}
            className="p-1 rounded hover:bg-hover-bg text-text-muted hover:text-text-main transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <h3 className="text-sm font-semibold text-text-main flex items-center gap-2">
            <Terminal size={14} className="text-primary" />
            {t('query.title', { table: selectedTable })}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border-subtle text-xs font-semibold text-text-muted hover:text-text-main hover:bg-hover-bg transition-all active:scale-[0.98]">
            <Sparkles size={14} className="text-primary/60" />
            {t('sqlConsole.prettify')}
          </button>
          <button
            onClick={handleRun}
            disabled={executeMutation.isPending}
            className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            {executeMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            {t('query.runQuery')}
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
              <p className="text-xs font-medium tracking-wide italic">{t('query.resultsPlaceholder')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
