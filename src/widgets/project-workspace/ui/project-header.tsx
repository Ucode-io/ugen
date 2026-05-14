"use client";
import { CodeXml, Globe, Settings, Sparkles } from "lucide-react";
import { useState } from "react";
import type { ChatPosition } from "@/entities/chat";
import { useTranslations } from "next-intl";
import { ReusableTabs } from "@/shared/ui";
import { PublishPopover } from "./publish-popover";
import { GithubPopover } from "./github-popover";
import { AddTemplateDialog } from "./add-template-dialog";
import { LogoPopover } from "@/widgets/workspace-chat/ui/logo-popover";
import { Sidebar } from "@/widgets/sidebar";
import { cn } from "@/shared/lib/utils/cn";

export type DeviceType = "desktop" | "tablet" | "mobile";

interface ProjectHeaderProps {
  projectTitle: string;
  projectId?: string;
  activeTab: "dashboard" | "code" | "preview";
  setActiveTab: (tab: "dashboard" | "code" | "preview") => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isLoading: boolean;
  hasNoFiles: boolean;
  onSave?: () => void;
  isChatCollapsed: boolean;
  onToggleChat: () => void;
  chatPosition?: ChatPosition;
  projectUrl?: string;
  isUgen?: boolean;
}

export const ProjectHeader = ({
  projectTitle,
  projectId,
  activeTab,
  setActiveTab,
  isLoading,
  onSave,
  isChatCollapsed,
  onToggleChat,
  projectUrl,
  isUgen = true,
}: ProjectHeaderProps) => {
  const t = useTranslations("features.project");
  const [isSidebarForced, setIsSidebarForced] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLogoPopoverOpen, setIsLogoPopoverOpen] = useState(false);

  const isSidebarVisible = (isHovered || isSidebarForced) && !isLogoPopoverOpen;

  const handleChangeTab = (tab: "dashboard" | "code" | "preview") => {
    if (tab === "code" && activeTab !== "code") {
      onSave?.();
    }
    setActiveTab(tab);
  };

  const allTabOptions = [
    { id: "dashboard", label: "Settings", icon: <Settings size={16} /> },
    {
      id: "preview",
      label: "Preview",
      icon: <Globe size={16} />,
      disabled: isLoading,
    },
    {
      id: "code",
      label: "Code",
      icon: <CodeXml size={16} />,
    },
  ];

  const tabOptions = isUgen
    ? allTabOptions
    : allTabOptions.filter((t) => t.id === "preview");

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
    <header className="bg-bg-main z-10 flex h-12 shrink-0 items-center justify-between px-4 transition-all duration-300">
      <div className="flex min-w-[135px] items-center gap-2">
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
          <div
            className={cn(
              "pointer-events-none fixed top-12 bottom-0 left-0 z-180 -translate-x-4 opacity-0 transition-all duration-200 ease-out",
              isSidebarVisible &&
                "pointer-events-auto translate-x-0 opacity-100",
            )}
          >
            <Sidebar
              className="border-border-subtle h-full w-72 rounded-r-2xl border-t border-r border-b shadow-2xl"
              hideLogo
              onProfilePopupChange={setIsSidebarForced}
            />
          </div>
        </div>
        <span className="text-text-main max-w-[120px] truncate text-[15px] font-medium">
          {projectTitle}
        </span>
      </div>

      <ReusableTabs
        options={tabOptions}
        activeId={activeTab}
        onTabChange={(id) =>
          handleChangeTab(id as "dashboard" | "code" | "preview")
        }
      />

      <div className="flex min-w-[135px] items-center justify-end gap-1.5">
        <GithubPopover projectId={projectId} />
        {isUgen && (
          <AddTemplateDialog
            projectId={projectId}
            projectTitle={projectTitle}
            projectUrl={projectUrl}
          />
        )}
        {toggleButton}
        {isUgen && (
          <>
            <div className="bg-border-subtle mx-2 h-4 w-[1px]" />
            <PublishPopover
              projectTitle={projectTitle}
              projectUrl={projectUrl}
            />
          </>
        )}
      </div>
    </header>
  );
};
