'use client'
import { useEffect, useRef, useState } from 'react'
import { ShieldCheck, Loader2 } from 'lucide-react'
import {
  WorkspaceTableWrapper,
  WorkspaceTable,
  WorkspaceTableHeader,
  WorkspaceTableBody,
  WorkspaceTableRow,
  WorkspaceTableHead,
  WorkspaceTableCell
} from '@/widgets/project-workspace/ui/workspace-table'
import { cn } from '@/shared/lib/utils/cn'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { DataLoadingState } from '@/shared/ui'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

type PermField = 'read' | 'write' | 'update' | 'delete'
const PERM_FIELDS: PermField[] = ['read', 'write', 'update', 'delete']

interface ExistingPermission {
  custom_permission_id: string
  title: string
  attributes?: any
  read?: string
  write?: string
  update?: string
  delete?: string
}

const EMPTY_ROUTES: Array<{ path: string; label?: string }> = []
const EMPTY_PERMS: ExistingPermission[] = []

interface MenuRow {
  uid: string
  nav_path: string
  label: string
  title: string
  custom_permission_id?: string
  read: boolean
  write: boolean
  update: boolean
  delete: boolean
}

interface MenuPermissionsTableProps {
  projectId: string
  roleId: string
  clientTypeId: string
  existingPermissions?: ExistingPermission[]
  isLoading: boolean
}

const getNavPath = (attributes: any): string => {
  if (!attributes) return ''
  if (typeof attributes === 'string') {
    try {
      const parsed = JSON.parse(attributes)
      return typeof parsed?.nav_path === 'string' ? parsed.nav_path : ''
    } catch {
      return ''
    }
  }
  return typeof attributes.nav_path === 'string' ? attributes.nav_path : ''
}

const PermissionBadge = ({
  label,
  checked,
  disabled,
  onChange
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (val: boolean) => void
}) => (
  <div className="flex items-center gap-1 justify-center">
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative min-w-[75px] px-2 py-1 text-[10px] font-medium rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        checked
          ? 'bg-primary text-white'
          : 'bg-bg-sidebar/40 border border-border-subtle/50 text-text-muted hover:text-text-main hover:border-border-subtle hover:bg-bg-sidebar shadow-sm'
      )}
    >
      {label}
    </button>
  </div>
)

export const MenuPermissionsTable = ({
  projectId,
  roleId,
  clientTypeId,
  existingPermissions,
  isLoading
}: MenuPermissionsTableProps) => {
  const t = useTranslations('widgets.permissionManage')
  const queryClient = useQueryClient()
  const [isScrolled, setIsScrolled] = useState(false)

  // Rows are mirrored into a ref so rapid consecutive toggles read the latest
  // values synchronously (React state updates are async and would otherwise
  // clobber each other when several perms are flipped in quick succession).
  const [rows, setRows] = useState<MenuRow[]>([])
  const rowsRef = useRef<MenuRow[]>([])
  const commitRows = (updater: (prev: MenuRow[]) => MenuRow[]) => {
    const next = updater(rowsRef.current)
    rowsRef.current = next
    setRows(next)
  }

  // In-flight create calls keyed by nav_path. A row with no custom permission
  // yet may receive two quick toggles; both must reuse the SAME create call
  // instead of inserting duplicate permission rows.
  const inFlightCreates = useRef<Map<string, Promise<string>>>(new Map())
  const [pendingPaths, setPendingPaths] = useState<Set<string>>(new Set())

  // Routes generated for this project's admin panel sidebar, persisted in the
  // MCP project's project_env (nav_routes). Each route becomes a table row.
  const { data: navRoutesData } = useQuery<Array<{ path: string; label?: string }>>({
    queryKey: ['mcp-nav-routes', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await api.get(`/v1/mcp_project/${projectId}`)
      const env = data?.data?.project_env
      const routes = env && typeof env === 'object' ? (env as any).nav_routes : null
      return Array.isArray(routes) ? routes : []
    }
  })

  const navRoutes = navRoutesData ?? EMPTY_ROUTES
  const existing = existingPermissions ?? EMPTY_PERMS

  // Merge nav routes with the already-created custom permissions (matched by
  // nav_path). Every route shows up as if it were already added. A route with
  // no saved permission defaults to READ on (it stays visible until an admin
  // restricts it, mirroring the generated panel's default-allow); write/update/
  // delete start off.
  useEffect(() => {
    const byPath = new Map<string, ExistingPermission>()
    const noPath: ExistingPermission[] = []
    for (const p of existing) {
      const np = getNavPath(p.attributes)
      if (np) byPath.set(np, p)
      else noPath.push(p)
    }

    const usedPaths = new Set<string>()
    const routeRows: MenuRow[] = navRoutes.map((r) => {
      const p = byPath.get(r.path)
      if (p) usedPaths.add(r.path)
      return {
        uid: `nav:${r.path}`,
        nav_path: r.path,
        label: r.label || r.path,
        title: p?.title || r.label || r.path,
        custom_permission_id: p?.custom_permission_id,
        read: p ? p.read === 'Yes' : true,
        write: p?.write === 'Yes',
        update: p?.update === 'Yes',
        delete: p?.delete === 'Yes'
      }
    })

    // Existing permissions that don't map to a known route (or have no nav_path)
    // are still shown so nothing already configured silently disappears.
    const orphanRows: MenuRow[] = [
      ...Array.from(byPath.entries())
        .filter(([path]) => !usedPaths.has(path))
        .map(([, p]) => p),
      ...noPath
    ].map((p) => ({
      uid: `cp:${p.custom_permission_id}`,
      nav_path: getNavPath(p.attributes),
      label: p.title,
      title: p.title,
      custom_permission_id: p.custom_permission_id,
      read: p.read === 'Yes',
      write: p.write === 'Yes',
      update: p.update === 'Yes',
      delete: p.delete === 'Yes'
    }))

    commitRows(() => [...routeRows, ...orphanRows])
  }, [navRoutes, existing])

  // Reset transient bookkeeping when the role/user-type context changes.
  useEffect(() => {
    inFlightCreates.current.clear()
    setPendingPaths(new Set())
  }, [roleId, clientTypeId])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollLeft > 0)
  }

  // A nav-gating permission only takes effect when the generated panel runs in
  // login mode, so enable it the first time a permission is created.
  const ensureProjectLoginMode = async () => {
    if (!projectId) return
    const { data } = await api.get(`/v1/mcp_project/${projectId}`)
    const projectEnv =
      data?.data?.project_env && typeof data.data.project_env === 'object' ? data.data.project_env : {}
    if (projectEnv.auth_mode === 'login') return
    await api.put(`/v1/mcp_project/${projectId}`, {
      project_env: { ...projectEnv, auth_mode: 'login' }
    })
  }

  const markPending = (path: string, on: boolean) => {
    setPendingPaths((prev) => {
      const next = new Set(prev)
      if (on) next.add(path)
      else next.delete(path)
      return next
    })
  }

  const persistToggle = (uid: string, field: PermField, checked: boolean) => {
    const current = rowsRef.current.find((r) => r.uid === uid)
    if (!current) return

    const prevValue = current[field]
    const nextPerm = {
      read: current.read,
      write: current.write,
      update: current.update,
      delete: current.delete,
      [field]: checked
    }

    // Optimistic UI update.
    commitRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, [field]: checked } : r)))

    const toYesNo = (b: boolean) => (b ? 'Yes' : 'No')
    const putAccess = (permId: string) =>
      api.put(
        '/v1/custom-permission/accesses',
        {
          role_id: roleId,
          client_type_id: clientTypeId,
          custom_permission_id: permId,
          read: toYesNo(nextPerm.read),
          write: toYesNo(nextPerm.write),
          update: toYesNo(nextPerm.update),
          delete: toYesNo(nextPerm.delete)
        },
        { params: { role_id: roleId, client_type_id: clientTypeId } }
      )

    void (async () => {
      try {
        let permId = current.custom_permission_id

        // No permission yet → create it (once), then set the toggled access.
        if (!permId) {
          markPending(current.nav_path, true)
          let createPromise = inFlightCreates.current.get(current.nav_path)
          if (!createPromise) {
            createPromise = (async () => {
              const { data } = await api.post('/v1/custom-permission', {
                title: current.title || current.label || current.nav_path,
                client_type_id: clientTypeId,
                attributes: {
                  nav_path: current.nav_path || undefined,
                  description: current.label
                }
              })
              const newId =
                data?.data?.id || data?.data?.guid || data?.data?.custom_permission_id || data?.id
              ensureProjectLoginMode().catch(() => {})
              return newId as string
            })()
            inFlightCreates.current.set(current.nav_path, createPromise)
          }
          permId = await createPromise
          inFlightCreates.current.delete(current.nav_path)
          // Never PUT an access with an empty custom_permission_id — the backend
          // would then match every access row for this role/client type.
          if (!permId) throw new Error('Create returned no permission id')
          // Remember the new id so subsequent toggles edit instead of re-creating.
          commitRows((prev) =>
            prev.map((r) => (r.uid === uid ? { ...r, custom_permission_id: permId } : r))
          )
        }

        await putAccess(permId)
        queryClient.invalidateQueries({ queryKey: ['custom-permissions'] })
      } catch (error) {
        // Roll back the optimistic change.
        commitRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, [field]: prevValue } : r)))
        toast.error(t('menuUpdateFailed'))
        console.error('Menu permission update error:', error)
      } finally {
        markPending(current.nav_path, false)
      }
    })()
  }

  if (isLoading) return <DataLoadingState message="Fetching menu permissions..." />

  return (
    <div className="w-full relative flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <span className="text-sm font-bold text-text-main uppercase tracking-tight">{t('menuPermissions')}</span>
      </div>

      <WorkspaceTableWrapper className="border border-border-subtle/50 shadow-sm overflow-hidden rounded-[10px] max-w-[1100px]">
        <div onScroll={handleScroll} className="overflow-auto max-h-[calc(100vh-320px)] custom-scrollbar">
          <WorkspaceTable className="border-collapse w-full min-w-[1000px]">
            <WorkspaceTableHeader className="sticky top-0 z-50 bg-bg-card">
              <WorkspaceTableRow className="transition-none hover:bg-transparent">
                <WorkspaceTableHead
                  rowSpan={2}
                  className={cn(
                    'w-[300px] min-w-[300px] max-w-[300px] sticky left-0 z-50 border border-border-subtle border-t-0 border-l-0 bg-bg-card text-text-main font-bold align-middle px-6 transition-shadow duration-200',
                    isScrolled && 'border-r-2'
                  )}
                >
                  <span className="text-[12px] tracking-tight font-medium uppercase text-text-muted">{t('menu')}</span>
                </WorkspaceTableHead>
                <WorkspaceTableHead colSpan={4} className="text-center border border-border-subtle border-t-0 bg-bg-card">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted/60">
                    {t('accessPermissions')}
                  </span>
                </WorkspaceTableHead>
              </WorkspaceTableRow>
              <WorkspaceTableRow className="transition-none hover:bg-transparent">
                {PERM_FIELDS.map((field) => (
                  <WorkspaceTableHead
                    key={field}
                    className="w-[130px] text-center p-2 border border-border-subtle border-t-0 border-l-0 bg-bg-card"
                  >
                    <span className="text-[10px] font-bold text-text-muted/60 uppercase">{field}</span>
                  </WorkspaceTableHead>
                ))}
              </WorkspaceTableRow>
            </WorkspaceTableHeader>
            <WorkspaceTableBody>
              {rows.map((row) => (
                <WorkspaceTableRow key={row.uid} className="group/row transition-none hover:bg-transparent">
                  <WorkspaceTableCell
                    className={cn(
                      'w-[300px] min-w-[300px] max-w-[300px] sticky left-0 bg-bg-card border-r border-border-subtle z-30 px-6 py-2 transition-shadow duration-200 group-hover:bg-bg-card',
                      isScrolled && 'border-r-2'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[13px] text-text-main tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                        {row.label}
                      </span>
                      {row.nav_path && (
                        <span
                          title={row.nav_path}
                          className="max-w-[140px] truncate rounded-md border border-border-subtle bg-bg-sidebar px-1.5 py-0.5 font-mono text-[10px] text-text-muted"
                        >
                          {row.nav_path}
                        </span>
                      )}
                      {pendingPaths.has(row.nav_path) && (
                        <Loader2 size={12} className="animate-spin text-primary/40 ml-1" />
                      )}
                    </div>
                  </WorkspaceTableCell>

                  {PERM_FIELDS.map((field) => (
                    <WorkspaceTableCell key={field} className="align-middle px-2 py-1">
                      <PermissionBadge
                        label={field.toUpperCase()}
                        checked={row[field]}
                        onChange={(checked) => persistToggle(row.uid, field, checked)}
                      />
                    </WorkspaceTableCell>
                  ))}
                </WorkspaceTableRow>
              ))}
              {rows.length === 0 && (
                <WorkspaceTableRow>
                  <WorkspaceTableCell colSpan={5} className="py-10 text-center text-text-muted text-[13px]">
                    {t('noMenuPages')}
                  </WorkspaceTableCell>
                </WorkspaceTableRow>
              )}
            </WorkspaceTableBody>
          </WorkspaceTable>
        </div>
      </WorkspaceTableWrapper>
    </div>
  )
}
