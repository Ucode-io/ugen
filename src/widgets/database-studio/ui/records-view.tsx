'use client'

import React, { useState, useMemo } from 'react'
import {
  Plus,
  Filter,
  RefreshCw,
  Terminal,
  ChevronLeft,
  Search,
  MoreVertical,
  X,
  PlusCircle,
  AlertCircle,
  Database
} from 'lucide-react'
import {
  useDatabaseStore,
  useTableRecords,
  useAddRecord,
  useTableDetail
} from '@/entities/database'
import { DataTable } from '@/shared/ui'
import { Button } from '@/shared/ui'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/shared/ui'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/shared/lib/utils/cn'

import { Skeleton } from '@/shared/ui'
import { useTranslations } from 'next-intl'
import { Column } from '@/entities/database/model/types'
import { useAuthStore } from '@/entities/session'

export const RecordsView = ({ projectId }: { projectId: string }) => {
  const t = useTranslations('widgets.databaseStudio')
  const ucodeProjectId = useAuthStore(state => state.ucodeProjectId)
  const { selectedTable, setCurrentView, resetToTables, setFilters } = useDatabaseStore()
  const { data: tableDetail, isLoading: isDetailLoading } = useTableDetail(selectedTable, ucodeProjectId || "")
  const [filterQuery, setFilterQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const [localFilters, setLocalFilters] = useState<{ id: string; column: string; operator: string; value: string }[]>([])
  const [appliedFilters, setAppliedFilters] = useState<any[]>([])

  const schema: Column[] = tableDetail?.fields || (tableDetail as any)?.data?.fields || []
  const allColumns = useMemo(() => schema.map(c => c.slug), [schema])

  const { data: records, isLoading: isRecordsLoading, refetch } = useTableRecords(
    selectedTable,
    ucodeProjectId || projectId,
    undefined,
    appliedFilters.length > 0 ? appliedFilters : undefined,
    appliedFilters.length > 0 ? allColumns : undefined
  )

  const isSchemaLoading = isDetailLoading

  const columns = useMemo(() => {
    // Dynamically build columns based on the returned records to support dynamic keys
    if (records && records.length > 0) {
      const firstRecord = records[0]
      return Object.keys(firstRecord).map((key) => {
        const schemaField = schema?.find((s) => s.slug === key)
        const label = schemaField?.label || key
        return {
          accessorKey: key,
          header: () => <div className="min-w-[200px] font-medium text-text-muted">{label}</div>,
          cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
            const val = row.getValue(key)
            let content = <span>{String(val ?? '')}</span>

            if (typeof val === 'boolean') {
              content = (
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wider",
                  val
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-text-muted/10 text-text-muted border border-text-muted/20"
                )}>
                  {val ? 'TRUE' : 'FALSE'}
                </span>
              )
            } else if (val === null) {
              content = <span className="text-text-muted italic opacity-70">null</span>
            } else if (typeof val === 'object') {
              content = <span className="text-text-main font-mono text-xs">{JSON.stringify(val)}</span>
            }

            return <div className="min-w-[200px] max-w-[300px] truncate text-sm">{content}</div>
          }
        }
      })
    }

    // Fallback to schema if records are empty but schema is available
    if (!schema || schema.length === 0) return []
    return schema.map((col) => ({
      accessorKey: col.slug,
      header: () => <div className="min-w-[200px] font-medium text-text-muted">{col.label}</div>,
      cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
        const val = row.getValue(col.slug)
        let content = <span>{String(val ?? '')}</span>

        if (typeof val === 'boolean') {
          content = (
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wider",
              val
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-text-muted/10 text-text-muted border border-text-muted/20"
            )}>
              {val ? 'TRUE' : 'FALSE'}
            </span>
          )
        } else if (val === null) {
          content = <span className="text-text-muted italic opacity-70">null</span>
        } else if (typeof val === 'object') {
          content = <span className="text-text-main font-mono text-xs">{JSON.stringify(val)}</span>
        }

        return <div className="min-w-[200px] max-w-[300px] truncate text-sm">{content}</div>
      }
    }))
  }, [schema, records])

  React.useEffect(() => {
    // We no longer redirect to 'tables' when selectedTable is null since they are shown side by side
  }, [selectedTable])

  if (!selectedTable) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted">
        <Database size={32} className="mb-4 opacity-50" />
        <p className="text-sm">Select a table to view its records</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden w-full">
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-text-main">
            {tableDetail?.label || selectedTable}
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium tracking-wide flex items-center gap-1.5 uppercase">
            {t('records.count', { count: records?.length || 0 })}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder={t('records.searchPlaceholder')}
              className="h-9 w-full sm:w-64 pl-9 pr-3 text-sm bg-bg-main border border-border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 rounded-md bg-bg-main border border-border-subtle hover:bg-hover-bg text-text-muted hover:text-text-main transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={cn(isRecordsLoading && "animate-spin")} />
          </button>

          {/* <button
            onClick={() => setCurrentView('query')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Terminal size={14} />
            {t('records.sqlQuery')}
          </button> */}
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-bg-main/50 border-b border-border-subtle overflow-x-auto whitespace-nowrap min-h-[47px]">
        <AddRowDialog tableName={selectedTable} schema={schema || []} />
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors",
            isFilterOpen
              ? "bg-primary/10 border-primary/30 text-primary"
              : "border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg"
          )}
        >
          <Filter size={14} />
          {t('records.filter')}
        </button>
        {/* <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border-subtle text-xs font-medium text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors">
          {t('records.viewPolicies')}
        </button> */}
      </div>

      {isFilterOpen && (
        <div className="p-4 bg-bg-main/30 border-b border-border-subtle flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">

          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Filter size={14} />
              {t('records.filters')}
            </span>

            <button
              onClick={() => {
                const cleanedFilters = localFilters.map(f => {
                  let val: any = f.value;
                  if (f.operator === 'in') {
                    val = val.split(',').map((s: string) => s.trim()).filter(Boolean);
                  } else if (f.value === 'true') {
                    val = true;
                  } else if (f.value === 'false') {
                    val = false;
                  } else if (!isNaN(Number(f.value)) && f.value.trim() !== '') {
                    val = Number(f.value);
                  }
                  return { column: f.column, operator: f.operator, value: val };
                }).filter(f => ['is_null', 'is_not_null'].includes(f.operator) || f.value !== '');
                setAppliedFilters(cleanedFilters);
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm"
            >
              Apply Filters
            </button>
          </div>

          {/* Split Section */}
          <div className="flex flex-col sm:flex-row gap-6">

            {/* Left Side: Filters vertical list (bigger) */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              {localFilters.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-text-muted/60 border border-dashed border-border-subtle rounded-lg bg-bg-card/50">
                  <Filter size={24} className="mb-2 opacity-50" />
                  <p className="text-xs font-medium">No active filters.</p>
                  <p className="text-[10px] mt-1">Click &quot;Add Condition&quot; to start filtering records.</p>
                </div>
              ) : (
                localFilters.map((filter) => (
                  <div key={filter.id} className="flex items-center gap-3 bg-bg-card p-2 rounded-md border border-border-subtle shadow-sm flex-wrap">
                    <select
                      value={filter.column}
                      onChange={(e) => setLocalFilters(prev => prev.map(f => f.id === filter.id ? { ...f, column: e.target.value } : f))}
                      className="bg-bg-main border border-border-subtle rounded-md text-xs outline-none text-text-main px-2 py-1.5 focus:border-primary/50 flex-1 min-w-[150px]"
                    >
                      {schema?.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                    </select>

                    <select
                      value={filter.operator}
                      onChange={(e) => setLocalFilters(prev => prev.map(f => f.id === filter.id ? { ...f, operator: e.target.value } : f))}
                      className="bg-bg-main border border-border-subtle rounded-md text-xs outline-none text-text-main px-2 py-1.5 focus:border-primary/50 w-[140px] shrink-0"
                    >
                      <option value="eq">Equals (=)</option>
                      <option value="neq">Not equal (!=)</option>
                      <option value="gt">Greater (&gt;)</option>
                      <option value="gte">Greater or Eq (&gt;=)</option>
                      <option value="lt">Less (&lt;)</option>
                      <option value="lte">Less or Eq (&lt;=)</option>
                      <option value="ilike">Contains</option>
                      <option value="not_like">Not Contains</option>
                      <option value="is_null">Is Null</option>
                      <option value="is_not_null">Is Not Null</option>
                      <option value="in">IN (array)</option>
                    </select>

                    {['is_null', 'is_not_null'].includes(filter.operator) ? (
                      <div className="flex-1 min-w-[200px]" /> /* Space filler */
                    ) : (
                      <input
                        type="text"
                        value={filter.value}
                        onChange={(e) => setLocalFilters(prev => prev.map(f => f.id === filter.id ? { ...f, value: e.target.value } : f))}
                        placeholder={filter.operator === 'in' ? 'v1,v2,...' : t('records.valuePlaceholder')}
                        className="bg-bg-main border border-border-subtle rounded-md px-3 py-1.5 text-xs outline-none focus:border-primary/50 flex-1 min-w-[200px]"
                      />
                    )}

                    <button
                      onClick={() => setLocalFilters(prev => prev.filter(f => f.id !== filter.id))}
                      className="p-1.5 hover:bg-destructive/10 hover:border-destructive/30 border border-transparent hover:text-destructive rounded-md text-text-muted transition-colors ml-auto"
                      title="Remove condition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Right Side: Buttons (narrow) */}
            <div className="sm:w-[200px] flex flex-row sm:flex-col gap-3 shrink-0 sm:border-r border-border-subtle sm:pr-6">
              <button
                onClick={() => {
                  const defaultCol = schema?.[0]?.slug || '';
                  setLocalFilters(prev => [...prev, { id: Math.random().toString(36).substring(7), column: defaultCol, operator: 'eq', value: '' }])
                }}
                className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-md border border-dashed border-border-subtle text-xs font-medium text-text-muted hover:text-text-main hover:border-text-muted transition-colors w-full"
              >
                <PlusCircle size={14} />
                {t('records.addCondition')}
              </button>

              <button
                onClick={() => {
                  setLocalFilters([])
                  setAppliedFilters([])
                  setIsFilterOpen(false)
                }}
                className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-md border border-border-subtle text-xs font-medium text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
              >
                <X size={14} />
                {t('records.clearAll')}
              </button>
            </div>

          </div>
        </div>
      )}

      {isRecordsLoading ? (
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: columns.length || 4 }).map((_, j) => (
                <Skeleton key={j} className="h-8 flex-1" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={records || []}
          isLoading={isRecordsLoading}
          emptyMessage={t('records.noResults')}
          containerClassName="border-none shadow-none max-w-[958px]"
          className="min-w-max rounded-none border-none"
        />
      )}
    </div>
  )
}

const AddRowDialog = ({ tableName, schema }: { tableName: string; schema: Column[] }) => {
  const t = useTranslations('databaseStudio')
  const [open, setOpen] = useState(false)
  const addRecordMutation = useAddRecord()

  const formSchema = useMemo(() => {
    const shape: Record<string, any> = {}
    schema.forEach(col => {
      if (col.isPrimaryKey && col.type === 'uuid') return
      shape[col.slug] = col.isNullable ? z.any().optional() : z.any()
    })
    return z.object(shape)
  }, [schema])

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema)
  })

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      await addRecordMutation.mutateAsync({ tableName, data: data as any })
      setOpen(false)
      reset()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border-subtle text-xs font-medium text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors">
          <Plus size={14} />
          {t('records.addRow')}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-bg-card border-border-subtle">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database size={18} className="text-primary" />
            {t('records.addRecordTitle', { table: tableName })}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid gap-4">
            {schema.filter(col => !(col.isPrimaryKey && col.type === 'uuid')).map(col => (
              <div key={col.slug} className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-xs font-medium text-text-muted">
                  {col.label}
                  {!col.isNullable && <span className="text-destructive ml-0.5">*</span>}
                </label>
                <div className="col-span-3">
                  <input
                    {...register(col.slug)}
                    className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-md focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder={`Enter ${col.type}...`}
                  />
                  {errors[col.slug] && <p className="text-[10px] text-destructive mt-1">{t('records.fieldRequired')}</p>}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-white"
              loading={addRecordMutation.isPending}
            >
              {t('records.saveRecord')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
