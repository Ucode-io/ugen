'use client'

import React, { useState, useMemo } from 'react'
import {
  Plus,
  Filter,
  RefreshCw,
  Terminal,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Check,
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
  DialogFooter,
  Popover,
  PopoverContent,
  PopoverTrigger
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

  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)

  const schema: Column[] = tableDetail?.fields || (tableDetail as any)?.data?.fields || []
  const allColumns = useMemo(() => schema.map(c => c.slug), [schema])
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])

  React.useEffect(() => {
    if (allColumns.length > 0 && selectedColumns.length === 0) {
      setSelectedColumns(allColumns)
    }
  }, [allColumns])

  React.useEffect(() => {
    const handler = setTimeout(() => {
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
    }, 400);
    return () => clearTimeout(handler);
  }, [localFilters]);

  // Reset offset when limit changes or filters apply
  React.useEffect(() => {
    setOffset(0);
  }, [limit, appliedFilters]);

  const { data: records, isLoading: isRecordsLoading, refetch } = useTableRecords(
    selectedTable,
    ucodeProjectId || projectId,
    undefined,
    limit,
    offset,
    appliedFilters.length > 0 ? appliedFilters : undefined,
    selectedColumns.length > 0 ? selectedColumns : undefined
  )

  const isSchemaLoading = isDetailLoading

  const columns = useMemo(() => {
    let baseKeys: string[] = []
    if (records && records.length > 0) {
      baseKeys = Object.keys(records[0])
    } else if (schema && schema.length > 0) {
      baseKeys = schema.map((c) => c.slug)
    }

    if (selectedColumns.length > 0) {
      baseKeys = baseKeys.filter((k) => selectedColumns.includes(k))
    }

    return baseKeys.map((key) => {
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
  }, [schema, records, selectedColumns])

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
      <div className="flex items-center justify-between p-4 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-text-main">
            {tableDetail?.label || selectedTable}
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium tracking-wide flex items-center gap-1.5 uppercase">
            {t('records.count', { count: records?.length || 0 })}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-bg-main/50 border-b border-border-subtle overflow-x-auto whitespace-nowrap min-h-[47px] shrink-0">
        <div className="flex items-center gap-2">
          <AddRowDialog tableName={selectedTable} schema={schema || []} />
          <button
            onClick={() => {
              if (!isFilterOpen && localFilters.length === 0) {
                const defaultCol = schema?.[0]?.slug || '';
                setLocalFilters([{ id: Math.random().toString(36).substring(7), column: defaultCol, operator: 'eq', value: '' }])
              }
              setIsFilterOpen(!isFilterOpen)
            }}
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

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border-subtle text-xs font-medium text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors">
                <SlidersHorizontal size={14} />
                Columns
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0 bg-bg-card border-border-subtle shadow-md rounded-md" align="start">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
                <span className="text-xs font-medium text-text-main">Toggle columns</span>
                <button
                  onClick={() => setSelectedColumns([])}
                  className="text-[11px] text-text-muted hover:text-text-main"
                >
                  Deselect all
                </button>
              </div>
              <div className="p-1 max-h-[300px] overflow-y-auto">
                {allColumns.map(col => {
                  const isSelected = selectedColumns.includes(col);
                  return (
                    <div
                      key={col}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-hover-bg rounded-sm cursor-pointer text-xs group"
                      onClick={() => {
                        setSelectedColumns(prev =>
                          isSelected ? prev.filter(c => c !== col) : [...prev, col]
                        )
                      }}
                    >
                      <div className="w-4 h-4 flex items-center justify-center shrink-0">
                        {isSelected && <Check size={14} className="text-primary" />}
                      </div>
                      <span className="text-text-main group-hover:text-text-main transition-colors truncate">{col}</span>
                    </div>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <div className="flex items-center h-8 rounded-md border border-border-subtle bg-bg-main overflow-hidden text-xs font-mono text-text-muted shadow-sm">
            <button
              className="h-full px-2 border-r border-border-subtle hover:bg-hover-bg hover:text-text-main disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              <ChevronLeft size={16} />
            </button>
            <div className="h-full px-3 flex items-center border-r border-border-subtle bg-bg-card font-medium text-text-main">
              {limit}
            </div>
            <div className="h-full px-3 flex items-center border-r border-border-subtle bg-bg-card font-medium text-text-main">
              {offset}
            </div>
            <button
              className="h-full px-2 hover:bg-hover-bg hover:text-text-main transition-colors"
              onClick={() => setOffset(offset + limit)}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-md border border-border-subtle bg-bg-card hover:bg-hover-bg text-text-muted hover:text-text-main transition-colors shadow-sm"
            title="Refresh"
          >
            <RefreshCw size={14} className={cn(isRecordsLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {isFilterOpen && (
        <div className="p-3 bg-bg-main/30 border-b border-border-subtle flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-200 shrink-0">
          {localFilters.length === 0 ? (
            <div className="text-xs text-text-muted px-3 py-2 font-medium">No active filters. Click Add filter.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {localFilters.map((filter) => (
                <div key={filter.id} className="flex items-center gap-2">
                  <button
                    onClick={() => setLocalFilters(prev => prev.filter(f => f.id !== filter.id))}
                    className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-destructive bg-bg-card border border-border-subtle rounded-md hover:border-destructive/30 transition-colors shrink-0"
                    title="Remove filter"
                  >
                    <X size={12} />
                  </button>
                  <span className="text-[13px] font-medium text-text-muted shrink-0 w-12 flex justify-center px-2 py-1 bg-bg-card rounded-md">where</span>

                  <select
                    value={filter.column}
                    onChange={(e) => setLocalFilters(prev => prev.map(f => f.id === filter.id ? { ...f, column: e.target.value } : f))}
                    className="bg-bg-card border border-border-subtle rounded-md text-[13px] font-medium outline-none text-text-main px-3 py-1 h-8 focus:border-primary/50 w-[180px] shrink-0"
                  >
                    {schema?.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                  </select>

                  <select
                    value={filter.operator}
                    onChange={(e) => setLocalFilters(prev => prev.map(f => f.id === filter.id ? { ...f, operator: e.target.value } : f))}
                    className="bg-bg-card border border-border-subtle rounded-md text-[13px] font-medium outline-none text-text-main px-3 py-1 h-8 focus:border-primary/50 w-[160px] shrink-0"
                  >
                    <option value="eq">equals</option>
                    <option value="neq">not equal</option>
                    <option value="gt">greater than</option>
                    <option value="gte">greater or eq</option>
                    <option value="lt">less</option>
                    <option value="lte">less or eq</option>
                    <option value="ilike">contains</option>
                    <option value="not_like">not contains</option>
                    <option value="is_null">is null</option>
                    <option value="is_not_null">is not null</option>
                    <option value="in">is in</option>
                  </select>

                  {!['is_null', 'is_not_null'].includes(filter.operator) && (
                    <input
                      type="text"
                      value={filter.value}
                      onChange={(e) => setLocalFilters(prev => prev.map(f => f.id === filter.id ? { ...f, value: e.target.value } : f))}
                      placeholder={filter.operator === 'in' ? 'v1,v2,...' : '...'}
                      className="bg-bg-card border border-border-subtle rounded-md px-3 py-1 h-8 text-[13px] outline-none focus:border-primary/50 w-[240px] shrink-0 font-medium"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 pl-8">
            <button
              onClick={() => {
                const defaultCol = schema?.[0]?.slug || '';
                setLocalFilters(prev => [...prev, { id: Math.random().toString(36).substring(7), column: defaultCol, operator: 'eq', value: '' }])
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-main transition-colors"
            >
              <Plus size={12} /> Add filter
            </button>
            <span className="text-border-subtle">|</span>
            <button
              onClick={() => {
                setLocalFilters([])
              }}
              className="text-xs font-medium text-text-muted hover:text-destructive transition-colors"
            >
              Clear filters
            </button>
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
