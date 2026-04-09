'use client'

import React from 'react'
import { Table as TableIcon, ChevronRight, Trash2, Plus } from 'lucide-react'
import { cn } from '@/shared/lib/utils/cn'
import { useTables, useDatabaseStore, useDeleteTable } from '@/entities/database'
import { useAuthStore } from '@/entities/session'
import { Skeleton } from '@/shared/ui'
import { Table } from '@/entities/database/model/types'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/shared/ui'
import { Button } from '@/shared/ui'
import { toast } from 'sonner'

export const TablesView = () => {
  const t = useTranslations('widgets.databaseStudio')
  const ucodeProjectId = useAuthStore(state => state.ucodeProjectId)
  
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data: tables, isLoading } = useTables(debouncedSearch)
  const { setSelectedTable, setCurrentView } = useDatabaseStore()
  const deleteTableMutation = useDeleteTable()
  const [tableToDelete, setTableToDelete] = React.useState<Table | null>(null)

  const handleDelete = async () => {
    if (!tableToDelete || !ucodeProjectId) return

    try {
      await deleteTableMutation.mutateAsync({
        tableId: tableToDelete.id,
        projectId: ucodeProjectId,
      })
      toast.success(t('tables.deleteSuccess'))
      setTableToDelete(null)
    } catch (error) {
      console.error('Delete table error:', error)
      toast.error(t('tables.deleteError'))
    }
  }

  if (isLoading && !debouncedSearch) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.6px] text-text-muted font-[600]">Tables</span>
        <button className="h-6 w-6 rounded-md hover:bg-bg-sidebar text-text-muted flex items-center justify-center transition-colors">
          <Plus size={10} />
        </button>
      </div> */}
      <div className="px-2 mb-2">
        <input
          placeholder="Search tables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2 py-1.5 text-[11px] bg-bg-main border border-border-subtle rounded-md focus:border-[#004eea] outline-none"
        />
      </div>

      <div className="flex flex-col gap-0.5">
        {tables?.map((table: Table) => {
          const isActive = useDatabaseStore.getState().selectedTable === table.slug;
          return (
            <div
              key={table.id}
              onClick={() => {
                setSelectedTable(table.slug)
                // We no longer change setCurrentView because both are displayed together
              }}
              className={cn(
                "flex items-center px-3 py-1 text-[13px] rounded-lg mx-2 cursor-pointer transition-colors group",
                isActive
                  ? "bg-[#004eea]/10 text-[#004eea] font-medium"
                  : "text-text-muted hover:bg-bg-sidebar hover:text-text-main"
              )}
            >
              <TableIcon size={12} className={cn("mr-2", isActive ? "text-[#004eea]" : "text-text-muted/70 group-hover:text-text-main/70")} />
              <span className="truncate">{table.label}</span>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setTableToDelete(table)
                }}
                className={cn(
                  "ml-auto p-1 rounded-md transition-all",
                  isActive ? "text-[#004eea]/60 hover:text-destructive" : "opacity-0 group-hover:opacity-100 text-text-muted/60 hover:text-destructive"
                )}
                title={t('tables.delete')}
              >
                <Trash2 size={12} />
              </button>
            </div>
          )
        })}
      </div>

      <Dialog open={!!tableToDelete} onOpenChange={(open) => !open && setTableToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 size={20} />
              {t('tables.deleteConfirmTitle')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t('tables.deleteConfirmDescription', { table: tableToDelete?.label || '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setTableToDelete(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleDelete}
              loading={deleteTableMutation.isPending}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
