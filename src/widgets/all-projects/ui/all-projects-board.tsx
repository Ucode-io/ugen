'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  useAllProjects,
  useExportAllProjects,
  useSwitchProjectSuperAdmin,
  type AllProject,
} from '@/entities/project'
import { useAuthStore } from '@/entities/session'
import { useRouter } from '@/shared/lib/i18n/navigation'
import { useDebounce } from '@/shared/hooks/useDebounce'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import {
  Search,
  Building2,
  CreditCard,
  Calendar,
  Clock,
  FolderOpen,
  LogIn,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils/cn'

const PaginationFooter = ({
  page,
  setPage,
  limit,
  setLimit,
  totalCount,
}: {
  page: number
  setPage: (p: number) => void
  limit: number
  setLimit: (l: number) => void
  totalCount: number
}) => {
  const totalPages = Math.ceil(totalCount / limit)
  if (totalCount === 0) return null

  const renderPageNumbers = () => {
    const pages = []
    const showMax = 5
    let startPage = Math.max(1, page - 2)
    const endPage = Math.min(totalPages, startPage + showMax - 1)
    if (endPage - startPage < showMax - 1) {
      startPage = Math.max(1, endPage - showMax + 1)
    }

    if (startPage > 1) {
      pages.push(
        <PaginationItem key="1">
          <PaginationLink onClick={() => setPage(1)}>1</PaginationLink>
        </PaginationItem>
      )
      if (startPage > 2) pages.push(<PaginationEllipsis key="start-ellipsis" />)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink isActive={page === i} onClick={() => setPage(i)}>
            {i}
          </PaginationLink>
        </PaginationItem>
      )
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push(<PaginationEllipsis key="end-ellipsis" />)
      pages.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => setPage(totalPages)}>{totalPages}</PaginationLink>
        </PaginationItem>
      )
    }
    return pages
  }

  return (
    <div className="border-border-subtle bg-bg-card/40 flex flex-col items-center justify-between gap-y-4 border-t px-4 py-3 backdrop-blur-md sm:flex-row sm:gap-x-6">
      <div className="flex w-full flex-col items-center gap-y-3 sm:w-auto sm:flex-row sm:gap-x-6">
        <div className="flex w-full items-center justify-center gap-x-2 sm:w-auto sm:justify-start">
          <p className="text-text-muted whitespace-nowrap text-[13px] font-medium">
            Rows per page
          </p>
          <Select
            value={limit.toString()}
            onValueChange={(value) => {
              setLimit(Number(value))
              setPage(1)
            }}
          >
            <SelectTrigger className="border-border-subtle bg-bg-card h-8 w-[70px]">
              <SelectValue placeholder={limit.toString()} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 50].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-text-muted w-full whitespace-nowrap text-center text-[12px] sm:text-left">
          Showing {Math.min((page - 1) * limit + 1, totalCount)} to{' '}
          {Math.min(page * limit, totalCount)} of {totalCount} entries
        </p>
      </div>

      <Pagination className="mx-0 w-full justify-center sm:w-auto sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setPage(Math.max(1, page - 1))}
              className={cn('cursor-pointer', page === 1 && 'pointer-events-none opacity-50')}
            />
          </PaginationItem>
          {renderPageNumbers()}
          <PaginationItem>
            <PaginationNext
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              className={cn(
                'cursor-pointer',
                (page === totalPages || totalPages === 0) && 'pointer-events-none opacity-50'
              )}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export const AllProjectsBoard = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const debouncedSearch = useDebounce(searchQuery, 500)

  const { data, isLoading } = useAllProjects({
    page,
    limit,
    title: debouncedSearch || undefined,
  })

  const projects = data?.projects ?? []
  const totalCount = data?.count ?? 0

  const { user, refreshToken, switchProjectAuth, beginSuperAdminImpersonation } = useAuthStore()
  const { mutateAsync: switchProject } = useSwitchProjectSuperAdmin()
  const { mutateAsync: exportProjects, isPending: isExporting } = useExportAllProjects()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  const handleExport = async () => {
    if (isExporting) return
    try {
      const fileUrl = await exportProjects()
      if (!fileUrl) {
        toast.error('Export failed: no file returned')
        return
      }
      window.open(fileUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('Export projects failed', err)
      toast.error('Failed to export projects')
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setPage(1)
  }

  // Switch the super-admin into another project using the same refresh flow as
  // "switch organization" (project-dropdown). Snapshot the home session first so
  // the sidebar return button can restore it.
  const handleSwitch = async (project: AllProject) => {
    if (switchingId) return
    setSwitchingId(project.project_id)
    beginSuperAdminImpersonation()
    try {
      const responseData = await switchProject({
        refresh_token: refreshToken ?? '',
        role_id: user?.role?.id ?? '',
        client_type_id: user?.role?.client_type_id ?? '',
        env_id: project.environment_id,
        project_id: project.project_id,
      })
      const token = responseData?.token
      switchProjectAuth(
        {
          project_id: project.project_id,
          title: project.title,
          environment_id: project.environment_id,
          is_ugen: true,
          company_id: project.company_id,
        },
        token.access_token,
        token.refresh_token,
      )
      queryClient.clear()
      router.push('/projects' as any)
    } catch (err) {
      console.error('Switch into project failed', err)
    } finally {
      setSwitchingId(null)
    }
  }

  return (
    <div className="bg-bg-card flex h-full w-full flex-col rounded-2xl p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-text-main text-2xl font-semibold">
          All projects
          {totalCount > 0 && (
            <span className="text-text-muted ml-2 text-base font-normal">({totalCount})</span>
          )}
        </h1>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="border-border-subtle text-text-main hover:bg-primary hover:border-primary inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors hover:text-white disabled:cursor-default disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileSpreadsheet size={14} />
          )}
          Export Excel
        </button>
      </div>

      <div className="mb-4">
        <div className="border-border-subtle bg-bg-main focus-within:border-primary/50 focus-within:ring-primary/5 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all focus-within:ring-4">
          <Search size={14} className="text-text-muted shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by title..."
            className="text-text-main w-full bg-transparent outline-none placeholder:text-text-muted/60"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 w-full items-center justify-center">
            <div className="border-bg-sidebar border-t-primary h-8 w-8 animate-spin rounded-full border-4" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-2">
            <FolderOpen size={32} className="text-text-muted/40" />
            <p className="text-text-muted text-sm">No projects found</p>
          </div>
        ) : (
          <div className="border-border-subtle flex flex-1 flex-col overflow-hidden rounded-xl border shadow-sm">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="border-border-subtle bg-bg-sidebar border-b">
                    <th className="text-text-muted px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider">
                      Title
                    </th>
                    <th className="text-text-muted hidden px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider sm:table-cell">
                      Status
                    </th>
                    <th className="text-text-muted hidden px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider md:table-cell">
                      Balance
                    </th>
                    <th className="text-text-muted hidden px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider lg:table-cell">
                      Projects in company
                    </th>
                    <th className="text-text-muted hidden px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider xl:table-cell">
                      Created
                    </th>
                    <th className="text-text-muted hidden px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider xl:table-cell">
                      Last activity
                    </th>
                    <th className="w-px px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr
                      key={project.project_id}
                      className="border-border-subtle hover:bg-bg-sidebar group border-b transition-colors last:border-b-0"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="bg-bg-sidebar border-border-subtle flex h-7 w-7 shrink-0 items-center justify-center rounded-md border">
                            <Building2 size={14} className="text-text-muted" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-text-main max-w-[220px] truncate text-[13px] font-medium">
                              {project.title}
                            </p>
                            <p className="text-text-muted max-w-[220px] truncate text-[11px]">
                              {project.project_id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-2.5 sm:table-cell">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            project.status === 'active'
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-text-muted/10 text-text-muted'
                          }`}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="hidden px-4 py-2.5 md:table-cell">
                        {project.balance != null ? (
                          <div className="flex items-center gap-1">
                            <CreditCard size={12} className="text-text-muted shrink-0" />
                            <span className="text-text-main text-[12px] font-medium">
                              {project.balance.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-text-muted text-[12px]">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-2.5 lg:table-cell">
                        <span className="text-text-muted text-[12px]">
                          {project.company_projects_count}
                        </span>
                      </td>
                      <td className="hidden px-4 py-2.5 xl:table-cell">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-text-muted shrink-0" />
                          <span className="text-text-muted text-[12px]">
                            {new Date(project.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-2.5 xl:table-cell">
                        {project.last_activity_date ? (
                          <div className="flex items-center gap-1">
                            <Clock size={12} className="text-text-muted shrink-0" />
                            <span className="text-text-muted text-[12px]">
                              {new Date(project.last_activity_date).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-text-muted text-[12px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSwitch(project)}
                            disabled={!!switchingId}
                            className="border-border-subtle text-text-main hover:bg-primary hover:border-primary inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors hover:text-white disabled:cursor-default disabled:opacity-50"
                          >
                            {switchingId === project.project_id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <LogIn size={13} />
                            )}
                            Switch
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationFooter
              page={page}
              setPage={setPage}
              limit={limit}
              setLimit={setLimit}
              totalCount={totalCount}
            />
          </div>
        )}
      </div>
    </div>
  )
}
