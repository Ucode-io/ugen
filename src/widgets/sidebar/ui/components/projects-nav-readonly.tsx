'use client'
import { useState } from "react"
import { useTranslations } from "next-intl"
import { LayoutGrid, ChevronRight, FileIcon, Loader2 } from "lucide-react"
import { useCompanyProjects, useSwitchProject } from "@/entities/project"
import { useAuthStore } from "@/entities/session"
import { Link, useRouter } from "@/shared/lib/i18n/navigation"

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
  const router = useRouter()
  const { activeCompanyId, refreshToken, user, switchProjectAuth } = useAuthStore()
  const { mutateAsync: switchProject } = useSwitchProject()
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  const shouldFetch = !!activeCompanyId && !isCollapsed && isAllProjectsOpen
  const { data: companyProjectsData, isLoading } = useCompanyProjects(
    shouldFetch ? (activeCompanyId ?? '') : ''
  )

  const rawData = Array.isArray(companyProjectsData)
    ? companyProjectsData
    : companyProjectsData?.projects || companyProjectsData?.data || []
  const list = Array.isArray(rawData) ? rawData : rawData?.projects || []

  const projects = list.map((p: any) => ({
    id: p.id || p.project_id || p.mcp_project_id,
    name: p.name || p.title || tWidgets('untitledProject'),
    environment_id: p.environment_id,
    is_ugen: p.is_ugen ?? false,
  }))

  const handleProjectClick = async (proj: typeof projects[number]) => {
    if (!proj.id || switchingId) return
    setSwitchingId(proj.id)
    try {
      const responseData = await switchProject({
        refresh_token: refreshToken ?? '',
        role_id: user?.role?.id ?? '',
        client_type_id: user?.role?.client_type_id ?? '',
        env_id: proj.environment_id ?? '',
        project_id: proj.id,
      })
      const token = responseData?.token
      switchProjectAuth(
        {
          project_id: proj.id,
          title: proj.name,
          environment_id: proj.environment_id ?? '',
          is_ugen: proj.is_ugen,
          company_id: activeCompanyId ?? null,
        },
        token.access_token,
        token.refresh_token,
      )
      router.push(`/projects/${proj.id}` as any)
    } catch (e) {
      console.error('Project switch failed', e)
    } finally {
      setSwitchingId(null)
    }
  }

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
              {isLoading ? (
                <div className="text-text-muted/50 px-2 py-1 text-xs">
                  {tWidgets('loading')}
                </div>
              ) : projects.length === 0 ? (
                <div className="text-text-muted/50 px-2 py-1 text-xs">
                  {tWidgets('noRecentProjects')}
                </div>
              ) : (
                projects.map((proj: typeof projects[number]) => (
                  <button
                    key={proj.id}
                    type="button"
                    disabled={!!switchingId}
                    onClick={() => handleProjectClick(proj)}
                    className="text-text-muted hover:bg-hover-bg hover:text-text-main flex w-full items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors text-left disabled:opacity-60 disabled:cursor-default"
                    title={proj.name}
                  >
                    <FileIcon size={14} className="shrink-0 text-text-muted" />
                    <span className="flex-1 truncate">{proj.name}</span>
                    {switchingId === proj.id && (
                      <Loader2 size={12} className="text-text-muted shrink-0 animate-spin" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}
