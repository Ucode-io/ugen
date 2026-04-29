'use client'
import { ArrowLeftToLine, ArrowRightToLine, CodeXml, Globe, LayoutDashboard } from "lucide-react"
import { useTranslations } from "next-intl"
import { ReusableTabs } from "@/shared/ui"
import { PublishPopover } from "./publish-popover"
import { GithubPopover } from "./github-popover"
import { cn } from "@/shared/lib/utils/cn"

export type DeviceType = 'desktop' | 'tablet' | 'mobile'

interface ProjectHeaderProps {
  projectTitle: string
  projectId?: string
  activeTab: 'dashboard' | 'code' | 'preview'
  setActiveTab: (tab: 'dashboard' | 'code' | 'preview') => void
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  isLoading: boolean
  hasNoFiles: boolean
  onSave?: () => void
  isChatCollapsed: boolean
  onToggleChat: () => void
  projectUrl?: string
  isUgen?: boolean
}

export const ProjectHeader = ({
  projectTitle,
  projectId,
  activeTab,
  setActiveTab,
  isSidebarCollapsed,
  onToggleSidebar,
  isLoading,
  hasNoFiles,
  onSave,
  isChatCollapsed,
  onToggleChat,
  projectUrl,
  isUgen = true,
}: ProjectHeaderProps) => {
  const t = useTranslations('features.project')

  const handleChangeTab = (tab: 'dashboard' | 'code' | 'preview') => {
    if (tab === 'code' && activeTab !== 'code') {
      onSave?.()
    }
    setActiveTab(tab)
  }

  const allTabOptions = [
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
    }
  ]

  const tabOptions = isUgen
    ? allTabOptions
    : allTabOptions.filter(t => t.id === 'preview')

  return (
    <header className={cn("bg-bg-main flex items-center justify-between px-4 shrink-0 z-10 transition-all duration-300", {"pl-0": !isChatCollapsed})}>
      <div className="flex items-center gap-2 min-w-[135px]">
        {isUgen && (
          <button
            onClick={onToggleChat}
            className="flex items-center justify-center w-7 h-7 rounded-lg border border-border-subtle transition-all"
            title={isChatCollapsed ? `Open AI Chat` : `Collapse AI Chat`}
          >
            {isChatCollapsed ? <ArrowRightToLine size={16} /> : <ArrowLeftToLine size={16} />}
          </button>
        )}
      </div>

      <ReusableTabs
        options={tabOptions}
        activeId={activeTab}
        onTabChange={(id) => handleChangeTab(id as 'dashboard' | 'code' | 'preview')}
      />

      <div className="flex items-center gap-1.5 min-w-[135px]">
        <GithubPopover projectId={projectId} />
        {isUgen && (
          <>
            <div className="bg-border-subtle w-[1px] h-4 mx-2" />
            <PublishPopover projectTitle={projectTitle} projectUrl={projectUrl} />
          </>
        )}
      </div>
    </header>
  )
}
