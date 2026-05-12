'use client'

import { useState } from 'react'
import { useRouter } from '@/shared/lib/i18n/navigation'
import { useTranslations } from 'next-intl'
import { TEMPLATES, type Template } from '@/widgets/templates-board/model/templates'
import { ArrowRight } from 'lucide-react'
import { useProjectsList } from '@/entities/project'
import { ProjectsGrid } from '@/widgets/projects/ui/projects-grid'

type TabType = 'recently_viewed' | 'my_projects' | 'templates'

export const DashboardTabs = () => {
  const tNav = useTranslations('Navigation')
  const tTemp = useTranslations('Templates')
  const tD = useTranslations('widgets.dashboard')
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('my_projects')

  const tabs: { id: TabType; label: string }[] = [
    { id: 'recently_viewed', label: tNav('recently_viewed') },
    { id: 'my_projects', label: tNav('my_projects') },
    { id: 'templates', label: tNav('templates') },
  ]

  const { data: projectsResponse, isLoading: isProjectsLoading } = useProjectsList()

  const rawData = projectsResponse?.response || projectsResponse?.data || projectsResponse
  const projectsList = Array.isArray(rawData) ? rawData : (rawData?.projects || [])

  const projectsDisplay = projectsList.map((p: any) => ({
    id: p.id,
    isFolder: false,
    mcp_project_id: p.id,
    folderItemId: undefined,
    name: p.name || p.title || tD("untitledProject"),
    description: p.description || "",
    editedAt: p.updated_at ? tD("editedAt", { date: new Date(p.updated_at).toLocaleDateString() }) : tD("recentlyEdited"),
    createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString() : tD("unknownDate"),
    author: {
      name: p.user?.name || p.owner || tD("unknownAuthor"),
      initials: (p.user?.name || p.owner || "U").substring(0, 2).toUpperCase()
    },
    image: p.image || p.thumbnail || null,
    rawProject: p
  }))

  const handleBrowseAll = () => {
    if (activeTab === 'templates') {
      router.push('/dashboard/templates')
    } else {
      router.push('/projects')
    }
  }

  const handleOpenTemplate = (template: Template) => {
    router.push(`/dashboard/templates?template=${template.id}`)
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6 z-10 relative bg-bg-main rounded-xl border border-border-subtle">
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
            onClick={() => handleOpenTemplate(template)}
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
        {activeTab === 'my_projects' && (
          <div className="col-span-full">
            {isProjectsLoading ? (
              <div className="flex h-32 w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-bg-sidebar border-t-primary"></div>
              </div>
            ) : projectsDisplay.length > 0 ? (
              <ProjectsGrid projects={projectsDisplay.slice(0, 8)} variant="dashboard" />
            ) : (
              <div className="py-12 text-center text-text-muted border border-dashed border-border-subtle rounded-xl">
                {tD("nothingToShow")}
              </div>
            )}
          </div>
        )}
        {activeTab === 'recently_viewed' && (
          <div className="col-span-full py-12 text-center text-text-muted border border-dashed border-border-subtle rounded-xl">
            {tD("nothingToShow")}
          </div>
        )}
      </div>
    </div>
  )
}
