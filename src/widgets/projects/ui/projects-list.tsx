import { Star, Link as LinkIcon, Loader2 } from "lucide-react"
import { Link } from "@/shared/lib/i18n/navigation"
import { ProjectCardActions } from "./project-card-actions"
import { useTranslations } from "next-intl"

interface ProjectsListProps {
  projects: any[]
  onProjectClick?: (project: any) => void
  switchingProjectId?: string | null
}

export const ProjectsList = ({ projects, onProjectClick, switchingProjectId }: ProjectsListProps) => {
  const t = useTranslations('widgets.projects')

  return (
    <div className="w-full">
      <div className="grid grid-cols-[140px_1fr_150px_250px] items-center gap-4 px-4 py-2 text-[13px] font-semibold text-text-muted border-b border-border-subtle/50 mb-2">
        <div className="invisible">Image</div>
        <div>{t("name")}</div>
        <div className="hidden sm:block">{t("createdAt")}</div>
        <div className="hidden sm:block">{t("createdBy")}</div>
      </div>

      <div className="flex flex-col gap-1">
        {projects.map(project => {
          const isSwitching = switchingProjectId === project.mcp_project_id

          const inner = (
            <div className="grid w-full grid-cols-[140px_1fr] sm:grid-cols-[140px_1fr_150px_250px] items-center gap-4 px-2">
              <div className="relative aspect-[16/9] w-full max-w-[140px] overflow-hidden rounded-xl border border-border-subtle bg-bg-sidebar flex items-center justify-center">
                {project.image ? (
                  <img src={project.image} alt={project.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-border-subtle group-hover:text-text-muted transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none"><path fill="currentColor" fillRule="evenodd" d="M13.02.088c-1.458.366-2.342 1.629-2.22 3.17.02.248.153 1.03.294 1.738.24 1.207.257 1.362.256 2.504-.001 1.386-.069 1.745-.506 2.687-.66 1.424-1.79 2.02-3.02 1.592-.499-.174-1.066-.756-1.26-1.295-.36-.996-.332-1.984.126-4.45.438-2.353.428-3.416-.04-4.373C6.331 1.01 5.62.429 4.847.187 4.244-.003 3.277.03 2.703.26c-.582.233-1.145.7-1.587 1.32C.396 2.583.075 3.74.079 5.308.08 5.845.11 6.412.148 6.57c.05.214.04.42-.036.8-.167.834-.143 2.901.043 3.8.473 2.288 1.508 3.962 3.134 5.069.718.49 2.172 1.127 3.225 1.415 2.037.557 4.037.438 5.629-.334 2.885-1.4 5.063-4.746 5.734-8.812.164-.992.164-3.032 0-3.964-.431-2.458-1.58-4.05-3.207-4.448-.512-.125-1.172-.128-1.65-.008" clipRule="evenodd" /></svg>
                  </div>
                )}
                {isSwitching && (
                  <div className="absolute inset-0 flex items-center justify-center bg-bg-main/60">
                    <Loader2 size={16} className="animate-spin text-primary" />
                  </div>
                )}
              </div>

              <div className="flex flex-col min-w-0 pr-4">
                <h3 className="truncate text-[15px] font-medium text-text-main flex items-center gap-2">{project.name}</h3>
                <p className="truncate text-[13px] text-text-muted mt-1">{project.editedAt}</p>
              </div>

              <div className="hidden sm:block text-[14px] text-text-muted truncate">{project.createdAt}</div>

              <div className="hidden sm:flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-secondary text-xs font-bold text-bg-main shadow-sm">
                    {project.author.initials}
                  </div>
                  <span className="truncate text-[14px] text-text-muted">{project.author.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 pr-2">
                  <button className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:text-text-main transition-colors" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>
                    <Star size={18} />
                  </button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:text-text-main transition-colors" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>
                    <LinkIcon size={18} />
                  </button>
                  {project.rawProject && (
                    <div className="mx-1">
                      <ProjectCardActions project={project.rawProject} folderItemId={project.folderItemId} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )

          return onProjectClick ? (
            <div
              key={project.id}
              className="group flex cursor-pointer items-center rounded-2xl transition-colors hover:bg-hover-bg/50 px-2 py-2"
              onClick={() => onProjectClick(project)}
            >
              {inner}
            </div>
          ) : (
            <Link
              key={project.id}
              href={`/projects/${project.mcp_project_id}`}
              className="group flex cursor-pointer items-center rounded-2xl transition-colors hover:bg-hover-bg/50 px-2 py-2"
            >
              {inner}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
