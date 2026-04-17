import { Plus, Star, Link as LinkIcon, Loader2 } from "lucide-react"
import { Link } from "@/shared/lib/i18n/navigation"
import { ProjectCardActions } from "./project-card-actions"
import { useTranslations } from "next-intl"
import { useAuthStore } from "@/entities/session"

interface ProjectsGridProps {
  projects: any[]
  variant?: "dashboard" | "projects"
  onProjectClick?: (project: any) => void
  switchingProjectId?: string | null
}

export const ProjectsGrid = ({ projects, variant = "projects", onProjectClick, switchingProjectId }: ProjectsGridProps) => {
  const t = useTranslations('widgets.projects')
  const { project } = useAuthStore()
  const isUgen = project?.is_ugen ?? false

  return (
    <div className={
      variant === "dashboard" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    }>
      {(variant === "projects" && isUgen) && (
        <Link href="/?focus=prompt" className="group cursor-pointer block">
          <div className="aspect-[16/9] w-full rounded-2xl border-2 border-dashed border-border-subtle bg-transparent flex flex-col items-center justify-center transition-colors hover:border-text-muted hover:bg-hover-bg/30">
            <Plus size={24} className="text-text-muted transition-colors group-hover:text-text-main" />
          </div>
          <div className="mt-3">
            <h3 className="text-[15px] font-medium text-text-main">{t("createNewProject")}</h3>
          </div>
        </Link>
      )}

      {projects.map(proj => {
        const isSwitching = switchingProjectId === proj.mcp_project_id
        const content = (
          <>
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border-subtle bg-bg-sidebar transition-all flex items-center justify-center">
              {proj.image ? (
                <img src={proj.image} alt={proj.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-border-subtle group-hover:text-text-muted transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none"><path fill="currentColor" fillRule="evenodd" d="M13.02.088c-1.458.366-2.342 1.629-2.22 3.17.02.248.153 1.03.294 1.738.24 1.207.257 1.362.256 2.504-.001 1.386-.069 1.745-.506 2.687-.66 1.424-1.79 2.02-3.02 1.592-.499-.174-1.066-.756-1.26-1.295-.36-.996-.332-1.984.126-4.45.438-2.353.428-3.416-.04-4.373C6.331 1.01 5.62.429 4.847.187 4.244-.003 3.277.03 2.703.26c-.582.233-1.145.7-1.587 1.32C.396 2.583.075 3.74.079 5.308.08 5.845.11 6.412.148 6.57c.05.214.04.42-.036.8-.167.834-.143 2.901.043 3.8.473 2.288 1.508 3.962 3.134 5.069.718.49 2.172 1.127 3.225 1.415 2.037.557 4.037.438 5.629-.334 2.885-1.4 5.063-4.746 5.734-8.812.164-.992.164-3.032 0-3.964-.431-2.458-1.58-4.05-3.207-4.448-.512-.125-1.172-.128-1.65-.008" clipRule="evenodd" /></svg>
                </div>
              )}
              {isSwitching && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-main/60 backdrop-blur-sm">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              )}
              <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-main/60 text-text-main hover:bg-bg-main/80 backdrop-blur-sm transition-colors"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                >
                  <Star size={18} />
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-secondary text-xs font-bold text-bg-main shadow-sm">
                {proj.author.initials}
              </div>
              <div className="flex-1 overflow-hidden">
                <h3 className="truncate text-[15px] font-medium text-text-main group-hover:text-text-main flex items-center gap-2">
                  {proj.name}
                </h3>
                <p className="truncate text-[13px] text-text-muted mt-0.5">{proj.editedAt}</p>
              </div>
              {proj.rawProject && (
                <div className="shrink-0 items-center gap-1 flex mt-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    className="flex h-7 w-7 items-center justify-center rounded-md text-text-main hover:bg-hover-bg transition-colors"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                  >
                    <LinkIcon size={16} />
                  </button>
                  <ProjectCardActions project={proj.rawProject} folderItemId={proj.folderItemId} />
                </div>
              )}
            </div>
          </>
        )

        if (onProjectClick) {
          return (
            <div
              key={proj.id}
              className="group cursor-pointer block"
              onClick={() => onProjectClick(proj)}
            >
              {content}
            </div>
          )
        }

        return (
          <Link
            href={`/projects/${proj.mcp_project_id}`}
            key={proj.id}
            className="group cursor-pointer block"
          >
            {content}
          </Link>
        )
      })}
    </div>
  )
}
