'use client'
import { Link } from "@/shared/lib/i18n/navigation"
import { useTranslations } from "next-intl"
import { LayoutGrid, Folder, ChevronRight, FileIcon } from "lucide-react"
import { useState } from "react"
import { useProjectFolders, ProjectFolder } from "@/entities/project-folder"
import { useProjectsList } from "@/entities/project"

const FolderNode = ({
  folder,
  level,
  isCollapsed,
}: {
  folder: ProjectFolder
  level: number
  isCollapsed: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const { data: children } = useProjectFolders(folder.id, undefined, isOpen)
  const tWidgets = useTranslations('widgets.sidebar')

  return (
    <div className="w-full">
      <div className="text-text-muted hover:bg-hover-bg hover:text-text-main flex w-full items-center rounded-lg transition-colors py-1 pl-1 pr-2">
        <div className="flex items-center gap-1.5 overflow-hidden flex-1">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-text-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-main flex items-center justify-center rounded-md p-0.5 transition-colors shrink-0"
          >
            <ChevronRight
              size={14}
              strokeWidth={2}
              className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
            />
          </button>
          <Link
            href={`/projects?folder_id=${folder.id}`}
            className="flex items-center gap-1.5 flex-1 overflow-hidden"
          >
            <Folder size={14} strokeWidth={2} className="shrink-0" />
            <span className="flex-1 truncate text-sm select-none">{folder.label}</span>
          </Link>
        </div>
      </div>

      {!isCollapsed && isOpen && (
        <div className="border-border-subtle mt-0.5 ml-3.5 space-y-0.5 border-l py-0.5 pl-1.5">
          {(children || []).map((child) => {
            if (child.type?.toUpperCase() === 'FOLDER') {
              return (
                <FolderNode key={child.id} folder={child} level={level + 1} isCollapsed={isCollapsed} />
              )
            }
            return (
              <Link
                key={child.id}
                href={child.type?.toUpperCase() === 'PROJECT' ? `/projects/${child.mcp_project_id}` : `/chat/${child.chat_id}`}
                className="text-text-muted hover:bg-hover-bg hover:text-text-main flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors"
                title={child.label}
              >
                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                  <span className="text-[10px] uppercase font-bold text-text-muted">
                    {child.icon || <FileIcon size={14} />}
                  </span>
                </div>
                <span className="truncate">{child?.project_data?.title}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface ProjectsNavReadOnlyProps {
  isCollapsed: boolean
  isAllProjectsOpen: boolean
  setIsAllProjectsOpen: (val: boolean) => void
}

export const ProjectsNavReadOnly = ({
  isCollapsed,
  isAllProjectsOpen,
  setIsAllProjectsOpen,
}: ProjectsNavReadOnlyProps) => {
  const tNav = useTranslations('Navigation')
  const tWidgets = useTranslations('widgets.sidebar')
  const { data: rootFolders } = useProjectFolders(undefined, undefined, !isCollapsed && isAllProjectsOpen)
  const { data: recentProjectsResponse } = useProjectsList(
    { order_by: 'updated_at', order_direction: 'desc', limit: 4 },
    { enabled: !isCollapsed && isAllProjectsOpen }
  )

  const rawRecentData = recentProjectsResponse?.response || recentProjectsResponse?.data || recentProjectsResponse
  const recentProjects: { id: string; name: string }[] = (
    Array.isArray(rawRecentData) ? rawRecentData : rawRecentData?.projects || []
  ).map((p: any) => ({ id: p.id, name: p.name || p.title || tWidgets('untitledProject') }))

  const foldersData = rootFolders || []

  return (
    <div>
      {!isCollapsed && (
        <h3 className="text-text-muted/70 mb-2 px-3 text-xs font-semibold tracking-wide uppercase">
          {tNav("projects")}
        </h3>
      )}
      <nav className="space-y-0.5">
        <div>
          <div
            className={`text-text-muted hover:bg-hover-bg hover:text-text-main flex w-full items-center rounded-lg transition-colors ${isCollapsed ? "justify-center p-2" : "py-1.5 pl-1.5 pr-3"}`}
            title={isCollapsed ? tNav("all_projects") : undefined}
          >
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => setIsAllProjectsOpen(!isAllProjectsOpen)}
                className="text-text-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-main mr-1 flex items-center justify-center rounded-md p-0.5 transition-colors shrink-0"
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
                <span className="flex-1 truncate text-left">{tNav("all_projects")}</span>
              )}
            </Link>
          </div>

          {!isCollapsed && isAllProjectsOpen && (
            <div className="border-border-subtle mt-0.5 ml-5 space-y-0.5 border-l py-1 pl-2">
              {foldersData.map((folder: ProjectFolder) => (
                <FolderNode key={folder.id} folder={folder} level={0} isCollapsed={isCollapsed} />
              ))}

              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="text-text-muted hover:bg-hover-bg hover:text-text-main flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors"
                  title={project.name}
                >
                  <FileIcon size={14} className="shrink-0 text-text-muted" />
                  <span className="truncate">{project.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}
