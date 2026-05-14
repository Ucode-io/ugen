'use client'
import {
  CodeXml,
  Globe,
  Settings,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { useState } from "react"
import type { ChatPosition } from "@/entities/chat"
import { useTranslations } from "next-intl"
import { ReusableTabs } from "@/shared/ui"
import { PublishPopover } from "./publish-popover"
import { GithubPopover } from "./github-popover"
import { LogoPopover } from "@/widgets/workspace-chat/ui/logo-popover"
import { Sidebar } from "@/widgets/sidebar"
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
  chatPosition?: ChatPosition
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
  const [isSidebarForced, setIsSidebarForced] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isLogoPopoverOpen, setIsLogoPopoverOpen] = useState(false)

  const isSidebarVisible = (isHovered || isSidebarForced) && !isLogoPopoverOpen

  const handleChangeTab = (tab: 'dashboard' | 'code' | 'preview') => {
    if (tab === 'code' && activeTab !== 'code') {
      onSave?.()
    }
    setActiveTab(tab)
  }

  const allTabOptions = [
    { id: 'dashboard', label: 'Settings', icon: <Settings size={16} /> },
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

  const toggleButton = isUgen && (
    <button
      onClick={onToggleChat}
      className="border-border-subtle flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all"
      title={isChatCollapsed ? `Open AI Chat` : `Collapse AI Chat`}
    >
      <Sparkles size={16} className="text-primary/60" />
    </button>
  );

  return (
    <header className="bg-bg-main flex h-12 items-center justify-between px-4 shrink-0 z-10 transition-all duration-300">
      <div className="flex items-center gap-2 min-w-[135px]">
        <div
          className="relative shrink-0"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <LogoPopover
            projectTitle={projectTitle}
            open={isLogoPopoverOpen}
            onOpenChange={setIsLogoPopoverOpen}
          />
          <div className={cn(
            "pointer-events-none fixed left-0 top-12 bottom-0 z-180 -translate-x-4 opacity-0 transition-all duration-200 ease-out",
            isSidebarVisible && "pointer-events-auto translate-x-0 opacity-100"
          )}>
            <Sidebar
              className="h-full w-72 rounded-r-2xl border-r border-t border-b border-border-subtle shadow-2xl"
              hideLogo
              onProfilePopupChange={setIsSidebarForced}
            />
          </div>
        </div>
        <span className="text-[15px] font-medium text-text-main truncate max-w-[120px]">
          {projectTitle}
        </span>
      </div>

      <ReusableTabs
        options={tabOptions}
        activeId={activeTab}
        onTabChange={(id) => handleChangeTab(id as 'dashboard' | 'code' | 'preview')}
      />

      <div className="flex items-center gap-1.5 justify-end min-w-[135px]">
        <GithubPopover projectId={projectId} />
        {toggleButton}
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
