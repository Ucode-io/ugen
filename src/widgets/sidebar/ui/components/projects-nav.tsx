'use client'
import { Link } from "@/shared/lib/i18n/navigation"
import { useTranslations } from "next-intl"
import { LayoutGrid, FolderPlus, Folder } from "lucide-react"

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
          <button
            onClick={() =>
              !isCollapsed && setIsAllProjectsOpen(!isAllProjectsOpen)
            }
            className={`text-text-muted hover:bg-hover-bg hover:text-text-main flex w-full items-center rounded-lg transition-colors ${isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"}`}
            title={isCollapsed ? t("all_projects") : undefined}
          >
            <LayoutGrid size={16} strokeWidth={2} />
            {!isCollapsed && (
              <span className="flex-1 text-left">{t("all_projects")}</span>
            )}
          </button>

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
