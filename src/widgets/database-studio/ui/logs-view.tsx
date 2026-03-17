'use client'

import React from 'react'
import { History, User, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useLogs } from '@/entities/database'
import { DataTable } from '@/shared/ui/data-table'
import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/utils/cn'

export const LogsView = () => {
  const t = useTranslations('databaseStudio')
  const { data: logs, isLoading } = useLogs()

  const columns = [
    {
      accessorKey: 'timestamp',
      header: t('columns.timestamp'),
      cell: ({ row }: { row: { getValue: (key: string) => string } }) => {
        const date = new Date(row.getValue('timestamp'))
        return <span className="text-xs text-text-muted">{date.toLocaleString()}</span>
      }
    },
    {
      accessorKey: 'event',
      header: t('columns.event'),
      cell: ({ row }: { row: { getValue: (key: string) => string } }) => (
        <span className="text-xs font-semibold text-text-main">
          {row.getValue('event')}
        </span>
      )
    },
    {
      accessorKey: 'user',
      header: t('columns.user'),
      cell: ({ row }: { row: { getValue: (key: string) => string } }) => (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
            <User size={10} className="text-primary" />
          </div>
          <span className="text-xs text-text-muted">{row.getValue('user')}</span>
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: t('columns.status'),
      cell: ({ row }: { row: { getValue: (key: string) => string } }) => {
        const status = row.getValue('status')
        const isSuccess = status === 'SUCCESS'
        return (
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
            isSuccess ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
          )}>
            {isSuccess ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
            {status}
          </div>
        )
      }
    }
  ]

  return (
    <div className="bg-bg-card rounded-ai border border-border-subtle shadow-sm overflow-hidden flex flex-col min-h-[400px]">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-bg-main/20">
        <h3 className="text-sm font-semibold text-text-main flex items-center gap-2">
          <History size={16} className="text-primary" />
          {t('tabs.logs')}
        </h3>
      </div>
      <div className="flex-1 p-0 bg-bg-main/5">
        <DataTable 
          columns={columns} 
          data={logs || []} 
          isLoading={isLoading}
          emptyMessage={t('placeholders.noLogs')}
          containerClassName="border-none shadow-none bg-transparent"
        />
      </div>
    </div>
  )
}
