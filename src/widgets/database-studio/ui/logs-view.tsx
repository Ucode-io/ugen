'use client'

import React, { useState } from 'react'
import {
  Activity,
  FileText,
  Search,
  User,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { useAuthStore } from '@/entities/session'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { SubTabs } from '@/shared/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import { cn } from '@/shared/lib/utils/cn'
import { DatePickerWithRange } from '@/shared/ui'
import { useTranslations } from 'next-intl'
import {
  WorkspaceTableWrapper,
  WorkspaceTable,
  WorkspaceTableHeader,
  WorkspaceTableBody,
  WorkspaceTableRow,
  WorkspaceTableHead,
  WorkspaceTableCell,
} from '@/widgets/project-workspace/ui/workspace-table'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui"

const parseJson = (str: string) => {
  try {
    return JSON.parse(str)
  } catch (e) {
    return str
  }
}

const LogStatusBadge = ({ status, isSuccess }: { status: number | string, isSuccess: boolean }) => {
  const icon = isSuccess ? (
    <div className="w-3.5 h-3.5 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>
  ) : (
    <div className="w-3.5 h-3.5 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-bold text-[10px]">✕</div>
  )

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-bold border",
      isSuccess ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-destructive/10 text-destructive border-destructive/20"
    )}>
      {icon}
      <span>{status}</span>
    </div>
  )
}

const LogMethodBadge = ({ method }: { method: string }) => {
  const methodColors: Record<string, string> = {
    'GET': 'bg-green-500/10 text-green-500 border-green-500/20',
    'POST': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'PUT': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    'DELETE': 'bg-destructive/10 text-destructive border-destructive/20',
    'PATCH': 'bg-purple-500/10 text-purple-500 border-purple-500/20'
  }

  const colorClass = methodColors[method.toUpperCase()] || 'bg-text-muted/10 text-text-muted border-border-subtle'

  return (
    <span className={cn(
      "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border min-w-[45px] text-center",
      colorClass
    )}>
      {method}
    </span>
  )
}

const LogAccordionItem = ({ item, isExpanded, onToggle, type }: any) => {
  const [activeTab, setActiveTab] = useState('general')
  const t = useTranslations('widgets.databaseStudio')

  const isSuccess = type === 'activity' ? true : item.status === 'success'
  const statusCode = type === 'activity' ? (item?.status_code || item.action_type?.includes('DELETE') ? 204 : (item.action_type?.includes('CREATE') ? 201 : 200)) : (isSuccess ? 200 : 500)

  const req = item.request ? parseJson(item.request) : null
  const res = item.response ? parseJson(item.response) : null
  const method = type === 'activity' ? (item.method_api || 'GET') : (item.request_method || 'GET')
  const path = type === 'activity' ? (item.table_slug ? `/api/v2/items/${item.table_slug}` : item.action_source || '/api/v1/system') : (item.name || item.function_name || '/api/v1/function')

  const rawDate = (item.date || item.started_at)?.replace('Z', '')
  const timeAgo = rawDate ? formatDistanceToNow(parseISO(rawDate), { addSuffix: true }) : ''

  return (
    <div className={cn(
      "border-b border-border-subtle last:border-none transition-all",
      isExpanded && "bg-bg-card shadow-sm"
    )}>
      {/* Header */}
      <div
        onClick={onToggle}
        className="flex items-center gap-4 px-4 py-2.5 cursor-pointer hover:bg-hover-bg/30 transition-colors group"
      >
        <LogMethodBadge method={method} />

        <div className="flex-1 flex items-center justify-between min-w-0">
          <span className="text-[13.5px] font-medium text-text-main truncate pr-4">{path}</span>

          <div className="flex items-center gap-4 shrink-0">
            <span className="text-[12px] text-text-muted opacity-60 font-medium">
              {timeAgo}
            </span>
            <LogStatusBadge status={statusCode} isSuccess={isSuccess} />
            <ChevronDown
              size={16}
              className={cn("text-text-muted transition-transform duration-300", isExpanded && "rotate-180")}
            />
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="pb-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-6 border-b border-border-subtle bg-hover-bg/20 px-4 mb-4">
            {['general', 'request', 'response'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "py-2.5 text-[12.5px] font-semibold transition-all relative capitalize",
                  activeTab === tab ? "text-primary" : "text-text-muted hover:text-text-main"
                )}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_6px_rgba(59,130,246,0.3)] animate-in fade-in zoom-in-75 duration-300" />
                )}
              </button>
            ))}
          </div>

          <div className="px-6">
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-12">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{t('logs.details.url')}</p>
                  <p className="text-[13px] text-text-main font-medium break-all">{req?.data?.url || path}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{t('logs.details.method')}</p>
                  <p className="text-[13px] text-text-main font-medium uppercase">
                    <LogMethodBadge method={method} />
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{t('logs.details.status')}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-text-main font-medium">{statusCode}</span>
                    {item.duration && <span className="text-[12px] text-text-muted font-normal">({item.duration}ms)</span>}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{t('logs.details.time')}</p>
                  <div className="text-[12.5px] leading-relaxed">
                    <div className="flex items-center gap-2">
                      <span className="w-16 text-text-muted">Started:</span>
                      <span className="text-text-main font-medium">{new Date(item.date || item.started_at).toLocaleString()}</span>
                    </div>
                    {(item.completed_at || (item.date && item.duration)) && (
                      <div className="flex items-center gap-2">
                        <span className="w-16 text-text-muted">Finished:</span>
                        <span className="text-text-main font-medium">
                          {item.completed_at ? new Date(item.completed_at).toLocaleString() : new Date(new Date(item.date).getTime() + (item.duration || 0)).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{t('logs.details.actionBy')}</p>
                  <div className="flex items-center gap-2 text-text-main font-medium text-[13px]">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <User size={12} />
                    </div>
                    {item.user_info || 'system'}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{t('logs.details.actionType')}</p>
                  <p className="text-[13px] text-text-main font-mono bg-ring/20 px-2 py-0.5 rounded w-fit">{item.action_type}</p>
                </div>
                {item.table_slug && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{t('logs.details.collection')}</p>
                    <p className="text-[13px] text-text-main font-mono bg-hover-bg/50 px-2 py-0.5 rounded w-fit">{item.table_slug}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'request' && (
              <div className="animate-in fade-in duration-300">
                <pre className="bg-bg-sidebar/50 rounded-xl border border-border-subtle p-4 text-[12px] font-mono text-text-main overflow-auto max-h-[400px] whitespace-pre-wrap scrollbar-thin scrollbar-thumb-border-subtle">
                  {req ? JSON.stringify(req, null, 2) : '// No request data'}
                </pre>
              </div>
            )}

            {activeTab === 'response' && (
              <div className="animate-in fade-in duration-300">
                <pre className={cn(
                  "bg-bg-sidebar/50 rounded-xl border border-border-subtle p-4 text-[12px] font-mono overflow-auto max-h-[400px] whitespace-pre-wrap scrollbar-thin scrollbar-thumb-border-subtle",
                  !isSuccess ? "text-destructive" : "text-text-main"
                )}>
                  {res ? JSON.stringify(res, null, 2) : '// No response data'}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const TablePaginationFooter = ({ page, setPage, limit, setLimit, totalCount, t }: any) => {
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
          <PaginationLink isActive={page === i} onClick={() => setPage(i)}>{i}</PaginationLink>
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-y-4 sm:gap-x-6 px-4 py-3 border-t border-border-subtle bg-bg-card/40 backdrop-blur-md shrink-0">
      <div className="flex flex-col sm:flex-row items-center gap-y-3 sm:gap-x-6 w-full sm:w-auto">
        <div className="flex items-center gap-x-2 w-full sm:w-auto justify-center sm:justify-start">
          <p className="text-[13px] font-medium text-text-muted whitespace-nowrap">Rows per page</p>
          <Select value={limit.toString()} onValueChange={(value) => setLimit(Number(value))}>
            <SelectTrigger className="h-8 w-[70px] bg-bg-card border-border-subtle">
              <SelectValue placeholder={limit.toString()} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>{pageSize}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-[12px] text-text-muted whitespace-nowrap w-full text-center sm:text-left">
          Showing {Math.min((page - 1) * limit + 1, totalCount)} to {Math.min(page * limit, totalCount)} of {totalCount} entries
        </p>
      </div>

      <Pagination className="mx-0 w-full sm:w-auto justify-center sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setPage(Math.max(1, page - 1))}
              className={cn("cursor-pointer", page === 1 && "pointer-events-none opacity-50")}
            />
          </PaginationItem>
          {renderPageNumbers()}
          <PaginationItem>
            <PaginationNext
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              className={cn("cursor-pointer", (page === totalPages || totalPages === 0) && "pointer-events-none opacity-50")}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export const LogsView = ({ activeTab: externalActiveTab }: { activeTab?: string }) => {
  const t = useTranslations('widgets.databaseStudio')

  const ACTION_OPTIONS = [
    { label: t("logs.allActions"), value: "all" },
    { label: "Create", value: "CREATE" },
    { label: "Update", value: "UPDATE" },
    { label: "Delete", value: "DELETE" },
    { label: "Bulkwrite", value: "BULKWRITE" },
    { label: "Get", value: "GET" },
    { label: "Login", value: "LOGIN" },
    { label: "Delete Item", value: "DELETE ITEM" },
    { label: "Create Item", value: "CREATE ITEM" },
    { label: "Update Item", value: "UPDATE ITEM" },
    { label: "Create Table", value: "CREATE TABLE" },
    { label: "Update Table", value: "UPDATE TABLE" },
    { label: "Delete Table", value: "DELETE TABLE" },
    { label: "Create Menu", value: "CREATE MENU" },
    { label: "Delete Menu", value: "DELETE MENU" },
    { label: "Update Menu", value: "UPDATE MENU" },
    { label: "Create Field", value: "CREATE FIELD" },
    { label: "Update Field", value: "UPDATE FIELD" },
    { label: "Delete Field", value: "DELETE FIELD" },
    { label: "Create View", value: "CREATE VIEW" },
    { label: "Delete View", value: "DELETE VIEW" },
    { label: "Update View", value: "UPDATE VIEW" },
    { label: "Create Relation", value: "CREATE RELATION" },
    { label: "Delete Relation", value: "DELETE RELATION" },
    { label: "Update Relation", value: "UPDATE RELATION" },
    { label: "Delete Layout", value: "DELETE LAYOUT" },
    { label: "Update Layout", value: "UPDATE LAYOUT" },
    { label: "Create Client Type", value: "CREATE CLIENT TYPE" },
    { label: "Update Client Type", value: "UPDATE CLIENT TYPE" },
    { label: "Delete Client Type", value: "DELETE CLIENT TYPE" },
    { label: "Create Role", value: "CREATE ROLE" },
    { label: "Delete Role", value: "DELETE ROLE" },
    { label: "Update Permission", value: "UPDATE PERMISSION" },
    { label: "Create User", value: "CREATE USER" },
    { label: "Update User", value: "UPDATE USER" },
    { label: "Delete User", value: "DELETE USER" },
    { label: "Upsert Many Item", value: "UPSERT MANY ITEM" },
  ]

  const STATUS_OPTIONS = [
    { label: t("logs.allStatuses"), value: "all" },
    { label: "Success", value: "success" },
    { label: "Error", value: "error" },
  ]
  const [internalActiveTab, setInternalActiveTab] = useState('activity')
  const activeTab = externalActiveTab || internalActiveTab
  const setActiveTab = externalActiveTab ? () => { } : setInternalActiveTab
  const environmentId = useAuthStore((state) => state.user?.environment_id)
  const projectId = useAuthStore((state) => state.project?.project_id)

  const getFirstDayOfMonthDate = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }

  const getLastDayOfMonthDate = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0)
  }

  // Activity Logs States
  const [activityPage, setActivityPage] = useState(1)
  const [activityLimit, setActivityLimit] = useState(10)
  const [actionType, setActionType] = useState("")
  const [collection, setCollection] = useState("")
  const [userInfo, setUserInfo] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: getFirstDayOfMonthDate(),
    to: getLastDayOfMonthDate()
  })
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null)

  const debouncedCollection = useDebounce(collection, 500)
  const debouncedUserInfo = useDebounce(userInfo, 500)

  // Function Logs States
  const [functionPage, setFunctionPage] = useState(1)
  const [functionLimit, setFunctionLimit] = useState(10)
  const [functionId, setFunctionId] = useState("")
  const [status, setStatus] = useState("")
  const [expandedFunctionId, setExpandedFunctionId] = useState<string | null>(null)

  const formattedFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
  const formattedTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''

  const { data: activityLogsData, isLoading: isActivityLoading } = useQuery({
    queryKey: ['activity-logs', environmentId, activityPage, activityLimit, actionType, debouncedCollection, debouncedUserInfo, formattedFrom, formattedTo],
    queryFn: async () => {
      const { data } = await api.get(`/v2/version/history/${environmentId}`, {
        params: {
          type: 'GLOBAL',
          limit: activityLimit,
          offset: (activityPage - 1) * activityLimit,
          action_type: actionType === 'all' ? '' : actionType,
          collection: debouncedCollection,
          user_info: debouncedUserInfo,
          from_date: formattedFrom,
          to_date: formattedTo,
        }
      })
      return data.data
    },
    enabled: activeTab === 'activity'
  })

  const { data: functionsListData } = useQuery({
    queryKey: ['functions-list', projectId],
    queryFn: async () => {
      const { data } = await api.get('/v2/function', {
        params: {
          'project-id': projectId
        }
      })
      return data.data.functions
    },
    enabled: !!projectId && activeTab === 'function'
  })

  const { data: functionLogsData, isLoading: isFunctionLoading } = useQuery({
    queryKey: ['function-logs', projectId, functionPage, functionLimit, functionId, status],
    queryFn: async () => {
      const { data } = await api.get('/v2/functions/log', {
        params: {
          function_id: functionId === 'all' ? '' : functionId,
          status: status === 'all' ? '' : status,
          limit: functionLimit,
          offset: (functionPage - 1) * functionLimit,
          'project-id': projectId
        }
      })
      return data.data
    },
    enabled: !!projectId && activeTab === 'function'
  })

  return (
    <div className="flex flex-col gap-4 w-full h-full animate-in fade-in duration-500 min-h-0">
      <div className="mb-2 shrink-0">
        <h1 className="text-[22px] font-bold text-text-main mb-1">Logs</h1>
        <p className="text-text-muted text-[13px]">Monitor system activity and serverless function executions.</p>
      </div>

      <SubTabs
        options={[
          { id: 'activity', label: 'Activity Logs', icon: Activity },
          { id: 'function', label: 'Function Logs', icon: FileText },
        ]}
        activeId={activeTab}
        onTabChange={(id) => setActiveTab(id)}
        containerClassName="px-0 shrink-0"
      />

      <div className="ai-card overflow-hidden flex flex-col flex-1 min-h-[400px]">
        {activeTab === 'activity' ? (
          <>
            <div className="flex flex-wrap gap-3 p-4 border-b border-border-subtle bg-bg-card/30 items-end shrink-0">
              <div className="space-y-1.5 flex-none">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Time Range</label>
                <DatePickerWithRange
                  date={dateRange}
                  setDate={(range) => {
                    setDateRange(range)
                    setActivityPage(1)
                  }}
                />
              </div>

              <div className="space-y-1.5 w-[160px] flex-none">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Action</label>
                <Select
                  value={actionType}
                  onValueChange={(val) => {
                    setActionType(val)
                    setActivityPage(1)
                  }}
                >
                  <SelectTrigger className="bg-bg-card border-border-subtle h-9 text-[13px] rounded-lg">
                    <SelectValue placeholder={t('logs.allActions')} />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Collection</label>
                <div className="relative group">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    placeholder={t('logs.searchCollection')}
                    value={collection}
                    onChange={(e) => {
                      setCollection(e.target.value)
                      setActivityPage(1)
                    }}
                    className="w-full h-9 pl-9 pr-4 rounded-lg bg-bg-card border border-border-subtle text-[13px] text-text-main placeholder:text-text-muted transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">User</label>
                <div className="relative group">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    placeholder={t('logs.searchByUser')}
                    value={userInfo}
                    onChange={(e) => {
                      setUserInfo(e.target.value)
                      setActivityPage(1)
                    }}
                    className="w-full h-9 pl-9 pr-4 rounded-lg bg-bg-card border border-border-subtle text-[13px] text-text-main placeholder:text-text-muted transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-bg-main relative">
              <div className="flex flex-col min-h-0">
                {isActivityLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="h-10 w-full bg-hover-bg animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : activityLogsData?.histories?.length ? (
                  activityLogsData.histories.map((item: any) => (
                    <LogAccordionItem
                      key={item.id}
                      item={item}
                      isExpanded={expandedActivityId === item.id}
                      onToggle={() => setExpandedActivityId(expandedActivityId === item.id ? null : item.id)}
                      type="activity"
                    />
                  ))
                ) : (
                  <div className="h-48 flex items-center justify-center text-text-muted text-sm italic">
                    No activity logs found.
                  </div>
                )}
              </div>
            </div>

            <TablePaginationFooter
              page={activityPage}
              setPage={setActivityPage}
              limit={activityLimit}
              setLimit={setActivityLimit}
              totalCount={activityLogsData?.total || 0}
              t={t}
            />
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 p-4 border-b border-border-subtle bg-bg-card/30 items-end shrink-0">
              <div className="space-y-1.5 w-[240px] flex-none">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Function</label>
                <Select
                  value={functionId}
                  onValueChange={(val) => {
                    setFunctionId(val)
                    setFunctionPage(1)
                  }}
                >
                  <SelectTrigger className="bg-bg-card border-border-subtle h-9 text-[13px] rounded-lg">
                    <SelectValue placeholder={t('logs.allFunctions')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('logs.allFunctions')}</SelectItem>
                    {functionsListData?.map((f: any) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 w-[140px] flex-none">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Status</label>
                <Select
                  value={status}
                  onValueChange={(val) => {
                    setStatus(val)
                    setFunctionPage(1)
                  }}
                >
                  <SelectTrigger className="bg-bg-card border-border-subtle h-9 text-[13px] rounded-lg">
                    <SelectValue placeholder={t('logs.allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Search Logs</label>
                <div className="relative group">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    placeholder="Search in log contents..."
                    className="w-full h-9 pl-9 pr-4 rounded-lg bg-bg-card border border-border-subtle text-[13px] text-text-main placeholder:text-text-muted transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-bg-main relative">
              <div className="flex flex-col min-h-0">
                {isFunctionLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="h-10 w-full bg-hover-bg animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : functionLogsData?.function_logs?.length ? (
                  functionLogsData.function_logs.map((item: any) => (
                    <LogAccordionItem
                      key={item.id}
                      item={item}
                      isExpanded={expandedFunctionId === item.id}
                      onToggle={() => setExpandedFunctionId(expandedFunctionId === item.id ? null : item.id)}
                      type="function"
                    />
                  ))
                ) : (
                  <div className="h-48 flex items-center justify-center text-text-muted text-sm italic">
                    No function logs found.
                  </div>
                )}
              </div>
            </div>

            <TablePaginationFooter
              page={functionPage}
              setPage={setFunctionPage}
              limit={functionLimit}
              setLimit={setFunctionLimit}
              totalCount={functionLogsData?.total_count || 0}
              t={t}
            />
          </>
        )}
      </div>
    </div>
  )
}
