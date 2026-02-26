'use client'
import { Link } from "@/shared/lib/i18n/navigation"
import { useTranslations } from "next-intl"
import {
  Settings,
  ChevronDown,
  Check,
} from "lucide-react"

interface ProjectPopupProps {
  isCollapsed: boolean;
  project: any;
  projectInitial: string;
  isProjectPopupOpen: boolean;
  setIsProjectPopupOpen: (val: boolean) => void;
  projectPopupRef: React.RefObject<HTMLDivElement | null>;
}

export const ProjectDropdown = ({
  isCollapsed,
  project,
  projectInitial,
  isProjectPopupOpen,
  setIsProjectPopupOpen,
  projectPopupRef,
}: ProjectPopupProps) => {
  return (
    <div className="relative" ref={projectPopupRef}>
      <button
        onClick={() => setIsProjectPopupOpen(!isProjectPopupOpen)}
        className={`bg-bg-card hover:bg-hover-bg border-border-subtle flex w-full items-center rounded-lg border shadow-sm transition-colors ${isCollapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-1.5"
          }`}
      >
        <div
          className={`flex shrink-0 items-center justify-center rounded bg-[#d946ef] font-bold text-white uppercase ${isCollapsed ? "h-7 w-7 text-xs" : "h-5 w-5 text-[10px]"}`}
        >
          {projectInitial}
        </div>
        {!isCollapsed && (
          <>
            <span className="text-text-main flex-1 truncate text-left text-sm whitespace-nowrap">
              {project?.title || "My Workspace"}
            </span>
            <ChevronDown
              size={14}
              className={`text-text-muted shrink-0 transition-transform ${isProjectPopupOpen ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>

      {isProjectPopupOpen && (
        <div
          className={`absolute top-[calc(100%+8px)] ${isCollapsed ? "left-[calc(100%+8px)]" : "left-0"} bg-bg-card border-border-subtle z-[100] w-64 overflow-hidden rounded-xl border shadow-lg`}
        >
          {/* Header */}
          <div className="border-border-subtle bg-bg-sidebar/50 flex items-center justify-between border-b p-3">
            <div className="overflow-hidden">
              <div className="text-text-main truncate text-sm font-bold">
                {project?.title || "Workspace"}
              </div>
              <div className="text-text-muted truncate text-xs capitalize">
                {project?.subscription_type || "Free plan"}
              </div>
            </div>
            <button className="text-text-muted hover:text-text-main hover:bg-hover-bg shrink-0 rounded-md p-1.5 transition-colors">
              <Settings size={16} />
            </button>
          </div>
          {/* Body */}
          <div className="max-h-48 space-y-0.5 overflow-y-auto p-1.5">
            <div className="text-text-muted/70 px-2 py-1 text-xs font-semibold uppercase">
              All workspaces
            </div>
            <button className="bg-hover-bg text-text-main flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#d946ef]/10 font-mono text-xs font-bold text-[#d946ef]">
                {projectInitial}
              </div>
              <span className="flex-1 truncate text-sm">
                {project?.title || "Workspace"}
              </span>
              <Check size={14} className="text-primary shrink-0" />
            </button>
          </div>
          {/* Footer */}
          <div className="border-border-subtle border-t p-1.5">
            <button className="hover:bg-hover-bg text-text-main flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left">
              <div className="border-text-muted relative flex h-5 w-5 shrink-0 items-center justify-center rounded border border-dashed">
                <span className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] text-lg leading-none">
                  +
                </span>
              </div>
              <span className="text-sm font-medium">Create workspace</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
