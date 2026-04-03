'use client'

import React, { useState } from 'react'
import {
  Database,
  Table as TableIcon,
  ShieldCheck,
  Terminal,
  Plus,
  RefreshCw,
  Filter,
  Play,
  ChevronRight,
  Search,
  Lock,
  Settings2
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

export const DatabaseStudio = ({ projectId }: { projectId: string }) => {
  const t = useTranslations('widgets.databaseStudio')
  const { currentView, setCurrentView, breadcrumbs, resetToTables } = useDatabaseStore()

  console.log({ currentView })

  const renderContent = () => {
    switch (currentView) {
      case 'tables': return <TablesView />
      case 'records': return <RecordsView projectId={projectId} />
      case 'query': return <QueryView />
      case 'sql-console': return <SqlConsole />
      default: return <TablesView />
    }
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-text-main">{t('title')}</h2>
          <nav className="flex items-center text-sm text-text-muted">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <button
                  onClick={() => setCurrentView(crumb.view)}
                  className={cn(
                    "hover:text-text-main transition-colors",
                    idx === breadcrumbs.length - 1 && "font-medium text-text-main pointer-events-none"
                  )}
                >
                  {crumb.label.includes('.') ? t(crumb.label) : crumb.label}
                </button>
                {idx < breadcrumbs.length - 1 && <ChevronRight size={14} className="mx-1.5" />}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCurrentView('sql-console')
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Terminal size={14} />
            {currentView === 'sql-console'
              ? t('sqlConsole.activeHeader')
              : t('sqlConsole.header')}
          </button>
        </div> */}
      </motion.div>

      <div className="flex flex-col gap-6 flex-1 pt-2">
        <div className="min-h-0 flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
