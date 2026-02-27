'use client'
import { Link } from "@/shared/lib/i18n/navigation"
import { useTranslations } from "next-intl"
import { LayoutGrid, FolderPlus, Folder, ChevronRight } from "lucide-react"

interface ProjectsNavProps {
  isCollapsed: boolean;
  isAllProjectsOpen: boolean;
  setIsAllProjectsOpen: (val: boolean) => void;
}

export const ProjectsNav = ({ isCollapsed, isAllProjectsOpen, setIsAllProjectsOpen }: ProjectsNavProps) => {
  const t = useTranslations('Navigation')

  return (
    <div>
      {!isCollapsed && (
        <h3 className="text-text-muted/70 mb-2 px-3 text-xs font-semibold tracking-wide uppercase">
          {t("projects")}
        </h3>
      )}
      <nav className="space-y-0.5">
        <div>
          <div
            className={`text-text-muted hover:bg-hover-bg hover:text-text-main flex w-full items-center rounded-lg transition-colors ${isCollapsed ? "justify-center p-2" : "py-1.5 pl-1.5 pr-3"}`}
            title={isCollapsed ? t("all_projects") : undefined}
          >
            {!isCollapsed && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsAllProjectsOpen(!isAllProjectsOpen);
                }}
                className="text-text-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-main mr-1 flex items-center justify-center rounded-md p-0.5 transition-colors"
              >
                <ChevronRight
                  size={16}
                  strokeWidth={2}
                  className={`transition-transform duration-200 ${isAllProjectsOpen ? "rotate-90" : ""}`}
                />
              </button>
            )}

            <Link
              href="/projects"
              className="flex flex-1 items-center gap-2 overflow-hidden"
            >
              <LayoutGrid size={16} strokeWidth={2} className="shrink-0" />
              {!isCollapsed && (
                <span className="flex-1 truncate text-left">{t("all_projects")}</span>
              )}
            </Link>
          </div>

          {!isCollapsed && isAllProjectsOpen && (
            <div className="border-border-subtle mt-0.5 ml-5 space-y-0.5 border-l py-1 pl-2">
              <Link
                href="/projects/new"
                className="text-text-muted hover:bg-hover-bg hover:text-text-main flex items-center gap-3 rounded-lg px-3 py-1.5 transition-colors"
              >
                <FolderPlus size={16} strokeWidth={2} />
                <span>{t("new_folder")}</span>
              </Link>
              <Link
                href="/projects/test"
                className="text-text-muted hover:bg-hover-bg hover:text-text-main flex items-center gap-3 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Folder size={16} strokeWidth={2} />
                <span>{t("test")}</span>
              </Link>
            </div>
          )}
        </div>
        {/* Removed starred and shared with me items */}
      </nav>
    </div>
  )
}
