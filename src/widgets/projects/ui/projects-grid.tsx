import { Star, Link as LinkIcon, Loader2, Folder } from "lucide-react"
import { Link } from "@/shared/lib/i18n/navigation"
import { ProjectCardActions } from "./project-card-actions"
import { FolderCardActions } from "./folder-card-actions"

interface ProjectsGridProps {
  projects: any[]
  folders?: any[]
  readOnly?: boolean
  variant?: "dashboard" | "projects"
  onProjectClick?: (project: any) => void
  switchingProjectId?: string | null
}

export const ProjectsGrid = ({ projects, folders = [], readOnly = false, variant = "projects", onProjectClick, switchingProjectId }: ProjectsGridProps) => {
  return (
    <div className={
      variant === "dashboard" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
    }>
      {folders.map(folder => (
        <div key={folder.id} className="group relative block">
          <Link href={`/projects?folder_id=${folder.id}`} className="block">
            <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border-subtle bg-bg-sidebar flex items-center justify-center transition-colors group-hover:bg-hover-bg">
              <Folder size={28} className="text-text-muted transition-colors group-hover:text-text-main" />
            </div>
            <div className="mt-2 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="truncate text-[13px] font-medium text-text-main">{folder.name}</h3>
                <p className="text-[11px] text-text-muted mt-0.5">Folder</p>
              </div>
            </div>
          </Link>
          {!readOnly && (
            <div className="absolute right-0 bottom-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
              <FolderCardActions folder={folder} />
            </div>
          )}
        </div>
      ))}

      {projects.map(proj => {
        const isSwitching = switchingProjectId === proj.mcp_project_id
        const content = (
          <>
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border-subtle bg-bg-sidebar transition-all flex items-center justify-center">
              {proj.image ? (
                <img src={proj.image} alt={proj.name} className="h-full w-full object-cover object-top" />
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
              <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-bg-main/60 text-text-main hover:bg-bg-main/80 backdrop-blur-sm transition-colors"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                >
                  <Star size={13} />
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-start gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-secondary text-[10px] font-bold text-bg-main shadow-sm">
                {proj.author.initials}
              </div>
              <div className="flex-1 overflow-hidden">
                <h3 className="truncate text-[13px] font-medium text-text-main group-hover:text-text-main">
                  {proj.name}
                </h3>
                <p className="truncate text-[11px] text-text-muted mt-0.5">{proj.editedAt}</p>
              </div>
              {proj.rawProject && (
                <div className="shrink-0 items-center gap-0.5 flex opacity-0 transition-opacity group-hover:opacity-100">
                  {proj.microfrontend_url && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(`https://${proj.microfrontend_url}`, "_blank", "noopener,noreferrer");
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-text-main hover:bg-hover-bg transition-colors"
                      title={proj.microfrontend_url}
                    >
                      <LinkIcon size={13} />
                    </button>
                  )}
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
