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
  History,
  Lock,
  Settings2
} from 'lucide-react'
import { ReusableTabs } from '@/shared/ui/tabs'
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
  const t = useTranslations('databaseStudio')
  const { currentView, setCurrentView, breadcrumbs, resetToTables } = useDatabaseStore()
  const [activeTab, setActiveTab] = useState('tables')

  const TABS = [
    { id: 'tables', label: t('tabs.tables'), icon: <TableIcon size={16} /> },
    { id: 'logs', label: t('tabs.logs'), icon: <History size={16} /> },
    { id: 'security', label: t('tabs.security'), icon: <Lock size={16} /> },
    { id: 'advanced', label: t('tabs.advanced'), icon: <Settings2 size={16} /> },
  ]

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    if (tabId === 'tables') {
      resetToTables()
    } else {
      // For other tabs we might just stay in a generic state
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'tables':
        switch (currentView) {
          case 'tables': return <TablesView />
          case 'records': return <RecordsView projectId={projectId} />
          case 'query': return <QueryView />
          case 'sql-console': return <SqlConsole />
          default: return <TablesView />
        }
      case 'logs':
        return <LogsView />
      case 'security':
        return (
          <PlaceholderView
            title={t('tabs.security')}
            description={t('placeholders.securityComingSoon')}
            icon={ShieldCheck}
          />
        )
      case 'advanced':
        return (
          <PlaceholderView
            title={t('tabs.advanced')}
            description={t('placeholders.advancedComingSoon')}
            icon={Settings2}
          />
        )
      default:
        return <TablesView />
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('tables')
              setCurrentView('sql-console')
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Terminal size={14} />
            {activeTab === 'tables' && currentView === 'sql-console'
              ? t('sqlConsole.activeHeader')
              : t('sqlConsole.header')}
          </button>
        </div>
      </motion.div>

      <div className="flex flex-col gap-6 flex-1">
        <ReusableTabs
          options={TABS}
          activeId={activeTab}
          onTabChange={handleTabChange}
        />

        <div className="min-h-0 flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${currentView}`}
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
