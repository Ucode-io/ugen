'use client'

import { useState } from 'react'
import { useRouter } from '@/shared/lib/i18n/navigation'
import { useTranslations } from 'next-intl'
import { TEMPLATES } from '@/widgets/templates-board/model/templates'
import { ArrowRight } from 'lucide-react'

type TabType = 'recently_viewed' | 'my_projects' | 'templates'

export const DashboardTabs = () => {
  const tNav = useTranslations('Navigation')
  const tTemp = useTranslations('Templates')
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('templates')

  const tabs: { id: TabType; label: string }[] = [
    { id: 'recently_viewed', label: tNav('recently_viewed') },
    { id: 'my_projects', label: tNav('my_projects') },
    { id: 'templates', label: tNav('templates') },
  ]

  const handleBrowseAll = () => {
    if (activeTab === 'templates') {
      router.push('/dashboard/templates')
    } else {
      router.push('/dashboard/projects')
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 z-10 relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${activeTab === tab.id
                ? 'bg-transparent border border-border-subtle text-text-main shadow-sm'
                : 'text-text-muted hover:text-text-main'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleBrowseAll}
          className="flex items-center gap-2 text-sm font-medium text-text-main hover:opacity-80 transition-opacity"
        >
          {tNav('browse_all')}
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeTab === 'templates' && TEMPLATES.slice(0, 4).map((template) => (
          <div
            key={template.id}
            className="group cursor-pointer flex flex-col gap-3"
            onClick={() => router.push('/dashboard/templates')}
          >
            <div
              className={`w-full aspect-[16/10] rounded-xl overflow-hidden shadow-sm transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md ${template.bg}`}
            >
              {template.content && template.content}
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-text-main">
                {tTemp(`cards.${template.id}.title`)}
              </h3>
              <p className="text-[13px] text-text-muted mt-0.5">
                {tTemp(`cards.${template.id}.description`)}
              </p>
            </div>
          </div>
        ))}
        {activeTab !== 'templates' && (
          <div className="col-span-full py-12 text-center text-text-muted border border-dashed border-border-subtle rounded-xl">
            Nothing to show here yet.
          </div>
        )}
      </div>
    </div>
  )
}
