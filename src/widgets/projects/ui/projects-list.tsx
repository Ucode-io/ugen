import { Folder, Loader2, ExternalLink } from "lucide-react"
import { Link } from "@/shared/lib/i18n/navigation"
import { ProjectCardActions } from "./project-card-actions"
import { FolderCardActions } from "./folder-card-actions"
import { useTranslations } from "next-intl"

interface ProjectsListProps {
  projects: any[]
  folders?: any[]
  readOnly?: boolean
  onProjectClick?: (project: any) => void
  onFolderClick?: (folder: any) => void
  switchingProjectId?: string | null
}

export const ProjectsList = ({
  projects,
  folders = [],
  readOnly = false,
  onProjectClick,
  onFolderClick,
  switchingProjectId,
}: ProjectsListProps) => {
  const t = useTranslations("widgets.projects")

  return (
    <div className="bg-bg-card border-border-subtle overflow-hidden rounded-xl border shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-border-subtle bg-bg-sidebar border-b">
            <th className="text-text-muted px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider uppercase">
              {t("name")}
            </th>
            <th className="text-text-muted px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider uppercase hidden sm:table-cell">
              {t("createdAt")}
            </th>
            <th className="text-text-muted px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider uppercase hidden md:table-cell">
              {t("projectUrl")}
            </th>
            <th className="w-16" />
          </tr>
        </thead>
        <tbody>
          {folders.map((folder) => (
            <tr
              key={folder.id}
              onClick={() => onFolderClick?.(folder)}
              className="border-border-subtle hover:bg-bg-sidebar cursor-pointer border-b transition-colors group"
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Folder className="text-primary h-4 w-4 shrink-0" />
                  <span className="text-text-main text-[13px] font-medium truncate max-w-[300px]">
                    {folder.name}
                  </span>
                </div>
              </td>
              <td className="text-text-muted px-4 py-2.5 text-[12px] hidden sm:table-cell">
                —
              </td>
              <td className="text-text-muted px-4 py-2.5 text-[12px] hidden md:table-cell">
                —
              </td>
              <td className="px-4 py-2.5">
                {!readOnly && (
                  <div
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FolderCardActions folder={folder} />
                  </div>
                )}
              </td>
            </tr>
          ))}

          {projects.map((project) => {
            const isSwitching = switchingProjectId === project.mcp_project_id

            const inner = (
              <>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="relative h-7 w-12 shrink-0 overflow-hidden rounded-md border border-border-subtle bg-bg-sidebar flex items-center justify-center">
                      {project.image ? (
                        <img
                          src={project.image}
                          alt={project.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" className="text-border-subtle group-hover:text-text-muted transition-colors">
                          <path fill="currentColor" fillRule="evenodd" d="M13.02.088c-1.458.366-2.342 1.629-2.22 3.17.02.248.153 1.03.294 1.738.24 1.207.257 1.362.256 2.504-.001 1.386-.069 1.745-.506 2.687-.66 1.424-1.79 2.02-3.02 1.592-.499-.174-1.066-.756-1.26-1.295-.36-.996-.332-1.984.126-4.45.438-2.353.428-3.416-.04-4.373C6.331 1.01 5.62.429 4.847.187 4.244-.003 3.277.03 2.703.26c-.582.233-1.145.7-1.587 1.32C.396 2.583.075 3.74.079 5.308.08 5.845.11 6.412.148 6.57c.05.214.04.42-.036.8-.167.834-.143 2.901.043 3.8.473 2.288 1.508 3.962 3.134 5.069.718.49 2.172 1.127 3.225 1.415 2.037.557 4.037.438 5.629-.334 2.885-1.4 5.063-4.746 5.734-8.812.164-.992.164-3.032 0-3.964-.431-2.458-1.58-4.05-3.207-4.448-.512-.125-1.172-.128-1.65-.008" clipRule="evenodd" />
                        </svg>
                      )}
                      {isSwitching && (
                        <div className="absolute inset-0 flex items-center justify-center bg-bg-main/60">
                          <Loader2 size={12} className="animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                    <span className="text-text-main text-[13px] font-medium truncate max-w-[280px]">
                      {project.name}
                    </span>
                  </div>
                </td>
                <td className="text-text-muted px-4 py-2.5 text-[12px] hidden sm:table-cell">
                  {project.createdAt}
                </td>
                <td className="px-4 py-2.5 text-[12px] hidden md:table-cell">
                  {project.microfrontend_url ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(`https://${project.microfrontend_url}`, "_blank", "noopener,noreferrer");
                      }}
                      className="text-primary hover:text-primary/80 inline-flex max-w-full items-center gap-1.5 hover:underline"
                      title={project.microfrontend_url}
                    >
                      <ExternalLink size={12} className="shrink-0" />
                      <span className="truncate">{project.name || t("projectLink")}</span>
                    </button>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                    {project.rawProject && (
                      <div onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>
                        <ProjectCardActions project={project.rawProject} folderItemId={project.folderItemId} />
                      </div>
                    )}
                  </div>
                </td>
              </>
            )

            return onProjectClick ? (
              <tr
                key={project.id}
                onClick={() => onProjectClick(project)}
                className="border-border-subtle hover:bg-bg-sidebar cursor-pointer border-b transition-colors last:border-b-0 group"
              >
                {inner}
              </tr>
            ) : (
              <tr
                key={project.id}
                className="border-border-subtle hover:bg-bg-sidebar cursor-pointer border-b transition-colors last:border-b-0 group"
              >
                <Link href={`/projects/${project.mcp_project_id}`} className="contents">
                  {inner}
                </Link>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
