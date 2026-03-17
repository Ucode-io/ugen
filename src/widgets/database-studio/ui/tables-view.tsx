'use client'

import React from 'react'
import { Table as TableIcon, ChevronRight } from 'lucide-react'
import { useTables, useDatabaseStore } from '@/entities/database'
import { Skeleton } from '@/shared/ui/skeleton'
import { Table } from '@/entities/database/model/types'
import { useTranslations } from 'next-intl'

export const TablesView = () => {
  const t = useTranslations('databaseStudio')
  const { data: tables, isLoading } = useTables()
  const { setSelectedTable, setCurrentView } = useDatabaseStore()

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tables?.map((table: Table) => (
        <button
          key={table.name}
          onClick={() => {
            setSelectedTable(table.name)
            setCurrentView('records')
          }}
          className="flex flex-col p-4 rounded-ai border border-border-subtle bg-bg-card hover:border-primary/50 text-left transition-all hover:shadow-md group"
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <TableIcon size={20} />
              </div>
              <span className="font-semibold text-text-main">{table.name}</span>
            </div>
            <ChevronRight size={16} className="text-text-muted group-hover:text-primary transition-colors" />
          </div>
          <div className="flex items-center gap-4 text-sm text-text-muted">
             <span>{t('tables.rows', { count: table.rowsCount })}</span>
             {table.description && <span>• {table.description}</span>}
          </div>
        </button>
      ))}
    </div>
  )
}
