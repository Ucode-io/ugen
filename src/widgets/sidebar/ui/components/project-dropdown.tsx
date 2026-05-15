'use client'
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Settings, ChevronsUpDown, Loader2, Lock, User, ChevronRight, Sparkles, Plus } from "lucide-react"
import { useUserProjects, UserCompany, useSwitchProject, useCreateCompany } from "@/entities/project"
import { useAuthStore } from "@/entities/session"
import { useRouter } from "@/shared/lib/i18n/navigation"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/api"

interface ProjectPopupProps {
  project: any
  projectInitial: string
  isProjectPopupOpen: boolean
  setIsProjectPopupOpen: (val: boolean) => void
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

function formatShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`
  return n.toString()
}

function TokenBar({ label, item, color }: { label: string; item: any; color: string }) {
  const current = item?.current || 0
  const limit = item?.limit || 0
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0
  const isHigh = pct >= 80

  return (
    <div
      className="flex items-center gap-2"
      title={`${current.toLocaleString()} / ${limit.toLocaleString()}`}
    >
      <span className="text-text-muted w-12 shrink-0 text-[10px] font-medium uppercase tracking-wide">{label}</span>
      <div className="bg-bg-main relative h-1 flex-1 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-destructive' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`shrink-0 text-[10px] font-semibold tabular-nums ${isHigh ? 'text-destructive' : 'text-text-muted'}`}>
        {formatShort(current)}/{formatShort(limit)}
      </span>
    </div>
  )
}

export const ProjectDropdown = ({
  project,
  projectInitial,
  isProjectPopupOpen,
  setIsProjectPopupOpen,
  onOpenProfileModal,
}: ProjectPopupProps) => {
  const t = useTranslations('widgets.sidebar')
  const { data: companies = [], isLoading: isCompaniesLoading } = useUserProjects()
  const { refreshToken, user, switchProjectAuth, activeCompanyId, apiKey } = useAuthStore()
  const { mutateAsync: switchProject } = useSwitchProject()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const { mutateAsync: createCompany, isPending: isCreating } = useCreateCompany()
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)
  const workspacesRowRef = useRef<HTMLButtonElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const submenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const [submenuPos, setSubmenuPos] = useState<{ top: number; left: number } | null>(null)
  const [isWorkspacesOpen, setIsWorkspacesOpen] = useState(false)

  const { data: pricingData } = useQuery({
    queryKey: ['pricing-all', apiKey],
    queryFn: async () => {
      const headers = apiKey ? { Authorization: 'API-KEY', 'x-api-key': apiKey } : {}
      const { data } = await api.get('/v1/pricing/all', { headers })
      return data
    },
    enabled: isProjectPopupOpen,
    staleTime: 30_000,
  })

  const dailyTokens = pricingData?.data?.today_tokens
  const monthlyTokens = pricingData?.data?.monthly_tokens

  useEffect(() => {
    if (isProjectPopupOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 8, left: 4 })
    }
  }, [isProjectPopupOpen])

  useEffect(() => {
    if (!isProjectPopupOpen) {
      setIsWorkspacesOpen(false)
      setIsCreatingWorkspace(false)
      setNewWorkspaceName('')
      return
    }
    const handler = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target)) return
      if (portalRef.current?.contains(target)) return
      if (submenuRef.current?.contains(target)) return
      setIsProjectPopupOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [isProjectPopupOpen, setIsProjectPopupOpen])

  useEffect(() => {
    return () => {
      if (submenuCloseTimerRef.current) clearTimeout(submenuCloseTimerRef.current)
    }
  }, [])

  const openSubmenu = () => {
    if (submenuCloseTimerRef.current) {
      clearTimeout(submenuCloseTimerRef.current)
      submenuCloseTimerRef.current = null
    }
    if (portalRef.current) {
      const popupRect = portalRef.current.getBoundingClientRect()
      setSubmenuPos({ top: popupRect.top + 60, left: popupRect.right - 8 })
    }
    setIsWorkspacesOpen(true)
  }

  const scheduleCloseSubmenu = () => {
    if (submenuCloseTimerRef.current) clearTimeout(submenuCloseTimerRef.current)
    submenuCloseTimerRef.current = setTimeout(() => {
      setIsWorkspacesOpen(false)
      setIsCreatingWorkspace(false)
      setNewWorkspaceName('')
    }, 150)
  }

  const currentCompanyId = activeCompanyId ?? user?.company_id ?? null
  const currentCompany = companies.find((c) => c.id === currentCompanyId)
  const displayName = currentCompany?.name || project?.title || t("myWorkspace")
  const displayInitial = currentCompany?.name
    ? getInitial(currentCompany.name)
    : projectInitial

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newWorkspaceName.trim()
    if (!name || isCreating) return
    try {
      await createCompany(name)
      setNewWorkspaceName('')
      setIsCreatingWorkspace(false)
    } catch (err) {
      console.error('Create workspace failed', err)
    }
  }

  const handleSelectCompany = async (company: UserCompany) => {
    const firstProject = company.projects[0]
    if (!firstProject || switchingId) return

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
      queryClient.clear()
      router.push('/projects' as any)
    } catch (err) {
      console.error('Company switch failed', err)
    } finally {
      setSwitchingId(null)
    }
  }

  const sortedCompanies = [...companies].sort((a, b) => {
    if (a.has_personal_fork !== b.has_personal_fork) return a.has_personal_fork ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="relative min-w-0 flex-1">
      <button
        ref={buttonRef}
        onClick={() => setIsProjectPopupOpen(!isProjectPopupOpen)}
        className="hover:bg-hover-bg flex w-full min-w-0 items-center gap-1.5 rounded-md px-1 py-1 transition-colors"
        title={displayName}
      >
        <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#d946ef] text-[10px] font-bold text-white uppercase">
          {currentCompany?.logo ? (
            <CompanyLogo logo={currentCompany.logo} title={displayName} />
          ) : (
            displayInitial
          )}
        </div>
        <span className="text-text-main min-w-0 flex-1 truncate text-sm">{displayName}</span>
        <ChevronsUpDown size={13} className="text-text-muted shrink-0" />
      </button>

      {isProjectPopupOpen && dropdownPos && createPortal(
        <>
          <div
            ref={portalRef}
            className="bg-bg-card border-border-subtle fixed z-[200] w-64 overflow-hidden rounded-xl border shadow-lg"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#d946ef] text-xs font-bold text-white uppercase">
                {currentCompany?.logo ? (
                  <CompanyLogo logo={currentCompany.logo} title={displayName} />
                ) : (
                  displayInitial
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-text-main truncate text-sm font-semibold leading-tight">
                  {displayName}
                </div>
                <div className="text-text-muted truncate text-[11px] capitalize leading-tight">
                  {project?.subscription_type || t("freePlan")}
                </div>
              </div>
              <button
                onClick={() => { setIsProjectPopupOpen(false); onOpenProfileModal() }}
                title={t("settings") ?? "Settings"}
                className="text-text-muted hover:text-text-main hover:bg-hover-bg flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors"
              >
                <Settings size={14} />
              </button>
            </div>

            <div className="bg-border-subtle h-px" />

            {/* Token usage (compact) */}
            <div className="flex flex-col gap-2 px-3 py-2.5">
              <TokenBar label="Daily" item={dailyTokens} color="bg-pink-500" />
              <TokenBar label="Monthly" item={monthlyTokens} color="bg-orange-500" />
              <button className="from-primary/15 to-primary/5 text-primary hover:from-primary/25 hover:to-primary/10 border-primary/20 mt-1 flex items-center justify-center gap-1.5 rounded-md border bg-gradient-to-r py-1.5 text-xs font-semibold transition-colors">
                <Sparkles size={12} />
                Upgrade your plan
              </button>
            </div>

            <div className="bg-border-subtle h-px" />

            {/* Workspaces (hover to expand) */}
            <div className="p-1.5">
              <button
                ref={workspacesRowRef}
                onMouseEnter={openSubmenu}
                onMouseLeave={scheduleCloseSubmenu}
                onClick={() => (isWorkspacesOpen ? scheduleCloseSubmenu() : openSubmenu())}
                className={`text-text-main hover:bg-hover-bg flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                  isWorkspacesOpen ? 'bg-hover-bg' : ''
                }`}
              >
                <span className="flex-1 truncate text-sm">{t("allWorkspaces")}</span>
                <span className="text-text-muted shrink-0 text-[11px]">{companies.length}</span>
                <ChevronRight size={14} className="text-text-muted shrink-0" />
              </button>
            </div>
          </div>

          {/* Workspaces sub-dropdown (opens on the right side)  */}
          {isWorkspacesOpen && submenuPos && (
            <div
              ref={submenuRef}
              onMouseEnter={openSubmenu}
              onMouseLeave={scheduleCloseSubmenu}
              className="bg-bg-card border-border-subtle fixed z-[201] w-64 overflow-hidden rounded-xl border shadow-[0_8px_24px_-4px_rgba(0,0,0,0.18),0_4px_12px_-2px_rgba(0,0,0,0.12)]"
              style={{ top: submenuPos.top, left: submenuPos.left }}
            >
              <div className="max-h-64 space-y-0.5 overflow-y-auto p-1.5">
                <div className="text-text-muted/70 px-2 py-1 text-xs font-semibold uppercase">
                  {t("allWorkspaces")}
                </div>

                {isCompaniesLoading && (
                  <div className="text-text-muted px-2 py-2 text-xs">{t("loading")}</div>
                )}

                {sortedCompanies.map((company) => {
                  const isCurrent = company.id === currentCompanyId
                  const isOwn = company.has_personal_fork
                  return (
                    <button
                      key={company.id}
                      disabled={!!switchingId}
                      onClick={() => handleSelectCompany(company)}
                      className={`text-text-main flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors disabled:cursor-default disabled:opacity-60 ${
                        isCurrent ? 'bg-primary/10 ring-primary/30 ring-1' : 'hover:bg-hover-bg'
                      }`}
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded bg-[#d946ef]/10 font-mono text-xs font-bold text-[#d946ef]">
                        <CompanyLogo logo={company.logo} title={company.name} />
                      </div>
                      <span className={`flex-1 truncate text-sm ${isCurrent ? 'font-semibold' : ''}`}>
                        {company.name}
                      </span>
                      {isOwn ? (
                        <span
                          className="text-primary bg-primary/10 flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium uppercase"
                          title={t("yourWorkspace") ?? "Your workspace"}
                        >
                          <User size={10} />
                        </span>
                      ) : (
                        <Lock size={12} className="text-text-muted shrink-0" />
                      )}
                      {switchingId === company.id && (
                        <Loader2 size={13} className="text-text-muted shrink-0 animate-spin" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="border-border-subtle border-t p-1.5">
                {isCreatingWorkspace ? (
                  <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-1.5">
                    <input
                      ref={inputRef}
                      autoFocus
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      placeholder={t("workspaceNamePlaceholder")}
                      className="border-border-subtle bg-bg-sidebar text-text-main placeholder:text-text-muted focus:ring-primary/50 w-full rounded-md border px-2 py-1.5 text-sm outline-none focus:ring-1"
                      disabled={isCreating}
                    />
                    <div className="flex gap-1">
                      <button
                        type="submit"
                        disabled={!newWorkspaceName.trim() || isCreating}
                        className="bg-primary hover:bg-primary/90 flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {isCreating ? (
                          <><Loader2 size={11} className="animate-spin" />{t("creating")}</>
                        ) : t("createWorkspace")}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsCreatingWorkspace(false); setNewWorkspaceName('') }}
                        className="hover:bg-hover-bg text-text-muted rounded-md px-2 py-1 text-xs"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsCreatingWorkspace(true)}
                    className="hover:bg-hover-bg text-text-main group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors"
                  >
                    <div className="border-text-muted/60 text-text-muted group-hover:border-primary group-hover:text-primary group-hover:bg-primary/10 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-dashed transition-colors">
                      <Plus size={12} strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-medium">{t("createWorkspace")}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  )
}
