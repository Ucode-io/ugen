'use client'
import { PanelLeftClose, PanelRightClose, ChevronLeft, CodeXml, Globe, LayoutDashboard } from "lucide-react"
import { useRouter } from "@/shared/lib/i18n/navigation"
import { useTranslations } from "next-intl"
import { ReusableTabs } from "@/shared/ui"

interface ProjectHeaderProps {
  projectTitle: string
  activeTab: 'dashboard' | 'code' | 'preview'
  setActiveTab: (tab: 'dashboard' | 'code' | 'preview') => void
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  isChatCollapsed: boolean
  onToggleChat: () => void
  isLoading: boolean
  hasNoFiles: boolean
  onSave?: () => void
}

export const ProjectHeader = ({
  projectTitle,
  activeTab,
  setActiveTab,
  isSidebarCollapsed,
  onToggleSidebar,
  isChatCollapsed,
  onToggleChat,
  isLoading,
  hasNoFiles,
  onSave,
}: ProjectHeaderProps) => {
  const router = useRouter()
  const t = useTranslations('features.project')

  const handleChangeTab = (tab: 'dashboard' | 'code' | 'preview') => {
    if (tab === 'code' && activeTab !== 'code') {
      onSave?.()
    }
    setActiveTab(tab)
  }

  const tabOptions = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    {
      id: 'preview',
      label: 'Preview',
      icon: <Globe size={16} />,
      disabled: isLoading
    },
    {
      id: 'code',
      label: 'Code',
      icon: <CodeXml size={16} />,
      disabled: hasNoFiles || isLoading
    }
  ]

  return (
    <header className="h-[48px] border-b border-border-subtle bg-bg-card flex items-center justify-between px-4 shrink-0 z-10 transition-all duration-300">
      <div className="flex items-center gap-2">
        {/* {activeTab === 'dashboard' && (
          <button
            onClick={onToggleSidebar}
            className="text-text-muted hover:text-text-main hover:bg-hover-bg p-1 rounded-lg transition-colors flex items-center justify-center shrink-0"
            title={isSidebarCollapsed ? `Open Sidebar` : `Collapse Sidebar`}
          >
            <LayoutDashboard size={16} className={isSidebarCollapsed ? "opacity-50" : "opacity-100"} />
          </button>
        )} */}

        {/* <div className="bg-border-subtle w-[1px] h-4 mx-1" /> */}
        <button
          onClick={() => router.push('/projects')}
          className="text-text-muted hover:text-text-main hover:bg-hover-bg p-1 rounded-lg transition-colors flex items-center justify-center shrink-0"
          title="Back to Projects"
        >
          <ChevronLeft size={16} />
        </button>
        <h1 className="text-[15px] font-medium text-text-main truncate max-w-[300px] ml-1">
          {projectTitle}
        </h1>


        <button
          onClick={onToggleChat}
          className="text-text-muted hover:text-text-main hover:bg-hover-bg p-1 rounded-lg transition-colors flex items-center justify-center shrink-0 ml-[70px]"
          title={isChatCollapsed ? `Open AI Chat` : `Collapse AI Chat`}
        >
          {isChatCollapsed ? <PanelRightClose size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <ReusableTabs
        options={tabOptions}
        activeId={activeTab}
        onTabChange={(id) => handleChangeTab(id as 'dashboard' | 'code' | 'preview')}
      />

      <div className="flex items-center gap-1.5">

        <div className="bg-border-subtle w-[1px] h-4 mx-2" />

        <button className="bg-primary text-white hover:bg-primary-hover px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors">
          {t('publish', { fallback: 'Publish' })}
        </button>
      </div>
    </header>
  )
}
