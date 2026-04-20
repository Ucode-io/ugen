'use client'
import { useState } from "react"
import { Settings, ChevronDown, Loader2 } from "lucide-react"
import { useUserProjects, UserCompany, useSwitchProject } from "@/entities/project"
import { useAuthStore } from "@/entities/session"
import { useRouter } from "@/shared/lib/i18n/navigation"
import { useTranslations } from "next-intl"
import Image from "next/image"

interface ProjectPopupProps {
  isCollapsed: boolean
  project: any
  projectInitial: string
  isProjectPopupOpen: boolean
  setIsProjectPopupOpen: (val: boolean) => void
  projectPopupRef: React.RefObject<HTMLDivElement | null>
  onOpenProfileModal: () => void
}

function getInitial(title: string) {
  return title?.[0]?.toUpperCase() || 'U'
}

function CompanyLogo({ logo, title }: { logo: string; title: string }) {
  if (logo) {
    return (
      <Image src={logo} alt={title} width={20} height={20} className="h-full w-full object-cover" />
    )
  }
  return <>{getInitial(title)}</>
}

export const ProjectDropdown = ({
  isCollapsed,
  project,
  projectInitial,
  isProjectPopupOpen,
  setIsProjectPopupOpen,
  projectPopupRef,
  onOpenProfileModal,
}: ProjectPopupProps) => {
  const t = useTranslations('widgets.sidebar')
  const { data: companies = [], isLoading: isCompaniesLoading } = useUserProjects()
  const { refreshToken, user, switchProjectAuth } = useAuthStore()
  const { mutateAsync: switchProject } = useSwitchProject()
  const router = useRouter()
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  const handleSelectCompany = async (company: UserCompany) => {
    const firstProject = company.projects[0]
    if (!firstProject || switchingId) return

    // is_ugen is known directly from the project data
    const is_ugen = firstProject.is_ugen

    setSwitchingId(company.id)
    try {
      const responseData = await switchProject({
        refresh_token: refreshToken ?? '',
        role_id: user?.role?.id ?? firstProject.id,
        client_type_id: user?.role?.client_type_id ?? '',
        env_id: firstProject.environment_id,
        project_id: firstProject.id,
      })

      const token = responseData?.token

      switchProjectAuth(
        {
          project_id: firstProject.id,
          title: firstProject.title,
          environment_id: firstProject.environment_id,
          is_ugen,
          company_id: company.id,
        },
        token.access_token,
        token.refresh_token,
      )

      setIsProjectPopupOpen(false)
      router.push('/projects' as any)
    } catch (err) {
      console.error('Company switch failed', err)
    } finally {
      setSwitchingId(null)
    }
  }

  return (
    <div className="relative" ref={projectPopupRef}>
      <button
        onClick={() => setIsProjectPopupOpen(!isProjectPopupOpen)}
        className={`bg-bg-card hover:bg-hover-bg border-border-subtle flex w-full items-center rounded-lg border shadow-sm transition-colors ${
          isCollapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-1.5"
        }`}
      >
        <div
          className={`flex shrink-0 items-center justify-center rounded bg-[#d946ef] font-bold text-white uppercase ${
            isCollapsed ? "h-7 w-7 text-xs" : "h-5 w-5 text-[10px]"
          }`}
        >
          {projectInitial}
        </div>
        {!isCollapsed && (
          <>
            <span className="text-text-main flex-1 truncate text-left text-sm whitespace-nowrap">
              {project?.title || t("myWorkspace")}
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
          className={`absolute top-[calc(100%+8px)] ${
            isCollapsed ? "left-[calc(100%+8px)]" : "left-0"
          } bg-bg-card border-border-subtle z-[100] w-64 overflow-hidden rounded-xl border shadow-lg`}
        >
          {/* Header */}
          <div className="border-border-subtle bg-bg-sidebar/50 flex items-center justify-between border-b p-3">
            <div className="overflow-hidden">
              <div className="text-text-main truncate text-sm font-bold">
                {project?.title || t("workspace")}
              </div>
              <div className="text-text-muted truncate text-xs capitalize">
                {project?.subscription_type || t("freePlan")}
              </div>
            </div>
            <button
              onClick={() => { setIsProjectPopupOpen(false); onOpenProfileModal() }}
              className="text-text-muted hover:text-text-main hover:bg-hover-bg shrink-0 rounded-md p-1.5 transition-colors"
            >
              <Settings size={16} />
            </button>
          </div>

          {/* Company list — flat, names only */}
          <div className="max-h-64 space-y-0.5 overflow-y-auto p-1.5">
            <div className="text-text-muted/70 px-2 py-1 text-xs font-semibold uppercase">
              {t("allWorkspaces")}
            </div>

            {isCompaniesLoading && (
              <div className="text-text-muted px-2 py-2 text-xs">{t("loading")}</div>
            )}

            {[...companies].sort((a, b) => a.name.localeCompare(b.name)).map((company) => (
              <button
                key={company.id}
                disabled={!!switchingId}
                onClick={() => handleSelectCompany(company)}
                className="hover:bg-hover-bg text-text-main flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors disabled:opacity-60 disabled:cursor-default"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded bg-[#d946ef]/10 font-mono text-xs font-bold text-[#d946ef]">
                  <CompanyLogo logo={company.logo} title={company.name} />
                </div>
                <span className="flex-1 truncate text-sm">{company.name}</span>
                {switchingId === company.id && (
                  <Loader2 size={13} className="text-text-muted shrink-0 animate-spin" />
                )}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="border-border-subtle border-t p-1.5">
            <button className="hover:bg-hover-bg text-text-main flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left">
              <div className="border-text-muted relative flex h-5 w-5 shrink-0 items-center justify-center rounded border border-dashed">
                <span className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] text-lg leading-none">+</span>
              </div>
              <span className="text-sm font-medium">{t("createWorkspace")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
