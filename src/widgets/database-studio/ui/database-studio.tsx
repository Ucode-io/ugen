'use client'

import React, { useState } from 'react'
import {
  Table as TableIcon,
  Terminal,
} from 'lucide-react'
import { useDatabaseStore, DatabaseView } from '@/entities/database'
import {
  TablesView,
  RecordsView,
  SqlConsole,
  QueryView,
  LogsView,
  PlaceholderView
} from './index'
import { cn } from '@/shared/lib/utils/cn'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { UsageIndicator } from '@/shared/ui'
import { formatMBSmart, formatMBAsGB } from '@/shared/lib/utils/format-bytes'

export const DatabaseStudio = ({ projectId }: { projectId: string }) => {
  const t = useTranslations('widgets.databaseStudio')
  const { currentView, setCurrentView, breadcrumbs, resetToTables } = useDatabaseStore()

  const [isPannelOpen, setIsPannelOpen] = useState(true)

  const { data: pricingData } = useQuery({
    queryKey: ['pricing-all'],
    queryFn: async () => {
      const { data } = await api.get('/v1/pricing/all')
      return data
    },
  })

  const dbSize = pricingData?.data?.database_size
  const dbUsed = dbSize ? formatMBSmart(dbSize.current || 0) : '0 MB'
  const dbTotal = dbSize ? formatMBAsGB(dbSize.limit || 0) : '0 GB'
  const dbPercentage = dbSize?.limit ? Math.min(((dbSize.current || 0) / dbSize.limit) * 100, 100) : 0

  const onTogglePannel = () => {
    setIsPannelOpen(!isPannelOpen)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden flex-1">
      <div className="flex items-center border-b border-border-subtle bg-bg-main px-5 gap-1 shrink-0 h-10">
        <button
          onClick={() => setCurrentView('tables')} // Using 'tables' as the default split view
          className={cn(
            "px-4 h-full border-none bg-transparent text-[13px] font-[500] cursor-pointer border-b-2 flex items-center gap-1.5 transition-colors",
            currentView !== 'sql-console' ? "text-[#004eea] border-[#004eea]" : "text-text-muted border-transparent hover:text-text-main"
          )}
        >
          <TableIcon size={14} /> Table Editor
        </button>
        <button
          onClick={() => setCurrentView('sql-console')}
          className={cn(
            "px-4 h-full border-none bg-transparent text-[13px] font-[500] cursor-pointer border-b-2 flex items-center gap-1.5 transition-colors",
            currentView === 'sql-console' ? "text-[#004eea] border-[#004eea]" : "text-text-muted border-transparent hover:text-text-main"
          )}
        >
          <Terminal size={14} /> SQL Editor
        </button>
        <div className="flex-1"></div>
        <div className="shrink-0">
          <UsageIndicator
            label="Database size"
            value={dbUsed}
            total={dbTotal}
            percentage={dbPercentage}
            className="py-1 border-none shadow-none bg-transparent"
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {currentView === 'sql-console' ? (
          <div className="flex-1 flex overflow-hidden">
            <SqlConsole />
          </div>
        ) : (
          <>
            {
              isPannelOpen && <div className="w-[220px] min-w-[220px] border-r border-border-subtle bg-bg-card flex flex-col overflow-y-auto pt-2 min-h-[540px]">
                <TablesView />
              </div>
            }
            <div className="flex-1 flex flex-col overflow-hidden bg-bg-main">
              {/* Need to be careful here: RecordsView expects to just display records. However, if no table is selected, we should show a placeholder or something */}
              <RecordsView projectId={projectId} isPannelOpen={isPannelOpen} onTogglePannel={onTogglePannel} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
