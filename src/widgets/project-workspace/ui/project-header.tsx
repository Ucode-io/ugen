'use client'
import {
  MessageSquare,
  CodeXml,
  Globe,
  LayoutDashboard,
  BrainCircuit,
  Sparkles,
  BookTemplate,
} from "lucide-react";
import type { ChatPosition } from "@/entities/chat"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  ReusableTabs,
} from "@/shared/ui"
import { PublishPopover } from "./publish-popover"
import { GithubPopover } from "./github-popover"
import { cn } from "@/shared/lib/utils/cn"
import { LogoPopover } from "@/widgets/workspace-chat/ui/logo-popover"

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
  chatPosition = 'left',
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
    <header className={cn(
      "bg-bg-main flex items-center justify-between px-4 shrink-0 z-10 transition-all duration-300",
      !isChatCollapsed && chatPosition === 'left' && "pl-0",
    )}>
      <div className="flex items-center gap-2 min-w-[135px]">
        {chatPosition === 'right' && !isChatCollapsed && (
          <>
            <LogoPopover projectTitle={projectTitle} />
            <span className="text-[15px] font-medium text-text-main truncate max-w-[120px]">
              {projectTitle}
            </span>
          </>
        )}
      </div>

      <ReusableTabs
        options={tabOptions}
        activeId={activeTab}
        onTabChange={(id) => handleChangeTab(id as 'dashboard' | 'code' | 'preview')}
      />

      <div className="flex items-center gap-1.5 justify-end min-w-[135px]">
        <GithubPopover projectId={projectId} />
        {isUgen && (
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg flex h-7 shrink-0 items-center gap-1.5 rounded-lg border px-2 text-[12px] font-medium transition-all"
                title="Add to template"
                aria-label="Add to template"
              >
                <BookTemplate size={14} className="text-primary/70" />
                <span className="hidden sm:inline">Add template</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[520px] gap-5 overflow-hidden p-0">
              <div className="border-b border-border-subtle px-5 py-4">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-text-main">
                    <BookTemplate size={16} className="text-primary" />
                    Add to templates
                  </DialogTitle>
                  <DialogDescription className="text-xs text-text-muted">
                    Create a reusable template from this workspace.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="grid gap-4 px-5">
                <div className="rounded-lg border border-border-subtle bg-bg-sidebar/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookTemplate size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-text-main">
                        {projectTitle}
                      </div>
                      <div className="text-[11px] text-text-muted">
                        Workspace template
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="template-name" className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Template name
                  </label>
                  <input
                    id="template-name"
                    type="text"
                    defaultValue={projectTitle}
                    className="h-9 w-full rounded-lg border border-border-subtle bg-bg-main px-3 text-sm text-text-main outline-none transition-all placeholder:text-text-muted focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>

              <DialogFooter className="border-t border-border-subtle bg-bg-sidebar/40 px-5 py-3">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:bg-hover-bg hover:text-text-main"
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  type="button"
                  className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-primary/90"
                >
                  Add template
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
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
