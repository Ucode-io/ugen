'use client'

import React from 'react'
import { Table as TableIcon, ChevronRight, Trash2 } from 'lucide-react'
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
  const { data: tables, isLoading } = useTables()
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col p-4 rounded-ai border border-border-subtle bg-bg-card space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables?.map((table: Table) => (
          <div
            key={table.id}
            onClick={() => {
              // setSelectedTable(table.slug)
              // setCurrentView('records')
            }}
            className="flex flex-col p-4 rounded-ai border border-border-subtle bg-bg-card hover:border-primary/50 text-left transition-all hover:shadow-md group cursor-pointer relative"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/5 text-primary transition-colors">
                  <TableIcon size={20} />
                </div>
                <span className="font-semibold text-text-main">{table.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setTableToDelete(table)
                  }}
                  className="p-1.5 rounded-md text-text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title={t('tables.delete')}
                >
                  <Trash2 size={16} />
                </button>
                {/* <ChevronRight size={16} className="text-text-muted group-hover:text-primary transition-colors" /> */}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span>{table.slug}</span>
            </div>
          </div>
        ))}
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
    </>
  )
}
