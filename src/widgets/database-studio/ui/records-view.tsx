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
  const { data: records, isLoading: isRecordsLoading, refetch } = useTableRecords(selectedTable, ucodeProjectId || projectId)
  const { data: tableDetail, isLoading: isDetailLoading } = useTableDetail(selectedTable, ucodeProjectId || "")
  const [filterQuery, setFilterQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const schema: Column[] = tableDetail?.fields || []
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
    if (!selectedTable) {
      resetToTables()
    }
  }, [selectedTable, resetToTables])

  if (!selectedTable) {
    return null
  }

  return (
    <div className="flex flex-col h-full bg-bg-card rounded-ai border border-border-subtle shadow-sm overflow-hidden min-h-[500px] max-w-[100%]">
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('tables')}
            className="p-1 rounded hover:bg-hover-bg text-text-muted hover:text-text-main transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
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

      <div className="flex items-center gap-2 p-3 bg-bg-main/50 border-b border-border-subtle overflow-x-auto whitespace-nowrap">
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
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border-subtle text-xs font-medium text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors">
          {t('records.viewPolicies')}
        </button>
      </div>

      {isFilterOpen && (
        <div className="p-4 bg-bg-main/30 border-b border-border-subtle flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">{t('records.filters')}</span>
            <button
              onClick={() => { setFilters({}); setIsFilterOpen(false); }}
              className="text-[10px] font-medium text-text-muted hover:text-primary transition-colors"
            >
              {t('records.clearAll')}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-bg-card p-1.5 rounded-md border border-border-subtle shadow-sm">
              <select className="bg-transparent text-xs outline-none border-none text-text-main pr-2">
                {schema?.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
              </select>
              <span className="text-[10px] text-text-muted px-1">{t('records.contains')}</span>
              <input
                type="text"
                placeholder={t('records.valuePlaceholder')}
                className="bg-bg-main border border-border-subtle rounded px-2 py-0.5 text-xs outline-none focus:border-primary/50"
              />
              <button className="p-1 hover:bg-hover-bg rounded text-text-muted">
                <X size={12} />
              </button>
            </div>
            <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-dashed border-border-subtle text-[11px] text-text-muted hover:text-text-main hover:border-text-muted transition-colors">
              <PlusCircle size={12} />
              {t('records.addCondition')}
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
