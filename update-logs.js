const fs = require('fs');

const code = `'use client'

import React, { useState } from 'react'
import {
  Activity,
  FileText,
  Search,
  User,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
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

const LogDetailAccordion = ({ item, type, isSuccess }: any) => {
  const [activeTab, setActiveTab] = useState('general')
  const t = useTranslations('widgets.databaseStudio')
  
  const req = item.request ? parseJson(item.request) : null
  const res = item.response ? parseJson(item.response) : null

  return (
    <div className="p-4 bg-bg-main/30 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-6 border-b border-border-subtle mb-4 px-2">
        <button 
          onClick={() => setActiveTab('general')}
          className={cn("pb-3 text-[13px] font-semibold transition-colors relative", activeTab === 'general' ? "text-text-main" : "text-text-muted hover:text-text-main")}
        >
          General
          {activeTab === 'general' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button 
          onClick={() => setActiveTab('request')}
          className={cn("pb-3 text-[13px] font-semibold transition-colors relative", activeTab === 'request' ? "text-text-main" : "text-text-muted hover:text-text-main")}
        >
          Request
          {activeTab === 'request' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button 
          onClick={() => setActiveTab('response')}
          className={cn("pb-3 text-[13px] font-semibold transition-colors relative", activeTab === 'response' ? "text-text-main" : "text-text-muted hover:text-text-main")}
        >
          Response
          {activeTab === 'response' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
      </div>

      <div className="px-2 pb-2">
        {activeTab === 'general' && (
          type === 'activity' ? (
            <div className="grid grid-cols-2 gap-y-5 gap-x-8">
              <div>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">{t('logs.details.user')}</p>
                <p className="text-[13px] text-text-main font-medium">{item.user_info || 'System'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">{t('logs.details.action')}</p>
                <p className="text-[13px] text-text-main font-medium">{item.action_type}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">{t('logs.details.date')}</p>
                <p className="text-[13px] text-text-main font-medium">{new Date(item.date).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">{t('logs.details.collection')}</p>
                <p className="text-[13px] text-text-main font-medium font-mono">{item.table_slug || '-'}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-5 gap-x-6">
              <div className="col-span-2">
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">{t('logs.details.name')}</p>
                <p className="text-[13px] text-text-main font-medium">{item.name || item.function_name || '-'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">{t('logs.details.status')}</p>
                <span className={cn(
                  "inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                  isSuccess ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
                )}>
                  {item.status}
                </span>
                <span className="text-[12px] text-text-muted ml-2">({item.duration}ms)</span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">{t('logs.details.requestMethod')}</p>
                <p className="text-[13px] text-text-main font-medium uppercase">{item.request_method || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">{t('logs.details.time')}</p>
                <p className="text-[13px] text-text-muted">
                  Started: <span className="text-text-main">{new Date(item.started_at).toLocaleString()}</span><br/>
                  Completed: <span className="text-text-main">{new Date(item.completed_at).toLocaleString()}</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">{t('logs.details.actionType')}</p>
                <p className="text-[13px] text-text-main font-medium">{item.action_type || '-'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">{t('logs.details.tableSlug')}</p>
                <p className="text-[13px] text-text-main font-medium font-mono">{item.table_slug || '-'}</p>
              </div>
            </div>
          )
        )}
        
        {activeTab === 'request' && (
          <div>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Request Data</p>
            <pre className="bg-bg-sidebar rounded-xl border border-border-subtle p-4 text-[11.5px] font-mono text-text-main overflow-auto max-h-[300px] whitespace-pre-wrap">
              {req ? (typeof req === 'object' ? JSON.stringify(req, null, 2) : req) : 'No request data'}
            </pre>
          </div>
        )}

        {activeTab === 'response' && (
          <div>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Response Data</p>
            <pre className={cn("bg-bg-sidebar rounded-xl border border-border-subtle p-4 text-[11.5px] font-mono overflow-auto max-h-[300px] whitespace-pre-wrap", 
              !isSuccess && type === 'function' ? 'text-destructive border-destructive/20' : 'text-text-main'
            )}>
              {res ? (typeof res === 'object' ? JSON.stringify(res, null, 2) : res) : 'No response data'}
            </pre>
          </div>
        )}
      </div>
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
      const { data } = await api.get(\`/v2/version/history/\${environmentId}\`, {
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
              <WorkspaceTableWrapper className="border-none shadow-none rounded-none h-full">
                <WorkspaceTable>
                  <WorkspaceTableHeader className="sticky top-0 z-10">
                    <WorkspaceTableRow>
                      <WorkspaceTableHead className="w-16">#</WorkspaceTableHead>
                      <WorkspaceTableHead>{t('logs.columns.action')}</WorkspaceTableHead>
                      <WorkspaceTableHead>{t('logs.columns.collection')}</WorkspaceTableHead>
                      <WorkspaceTableHead>{t('logs.columns.time')}</WorkspaceTableHead>
                      <WorkspaceTableHead>{t('logs.columns.actionBy')}</WorkspaceTableHead>
                      <WorkspaceTableHead className="w-10"></WorkspaceTableHead>
                    </WorkspaceTableRow>
                  </WorkspaceTableHeader>
                  <WorkspaceTableBody>
                    {isActivityLoading ? (
                       Array.from({ length: Math.min(activityLimit, 10) }).map((_, i) => (
                        <WorkspaceTableRow key={\`sk-\${i}\`}>
                          <WorkspaceTableCell><div className="h-4 w-6 bg-hover-bg animate-pulse rounded" /></WorkspaceTableCell>
                          <WorkspaceTableCell><div className="h-4 w-24 bg-hover-bg animate-pulse rounded" /></WorkspaceTableCell>
                          <WorkspaceTableCell><div className="h-4 w-20 bg-hover-bg animate-pulse rounded" /></WorkspaceTableCell>
                          <WorkspaceTableCell><div className="h-4 w-32 bg-hover-bg animate-pulse rounded" /></WorkspaceTableCell>
                          <WorkspaceTableCell><div className="h-4 w-20 bg-hover-bg animate-pulse rounded" /></WorkspaceTableCell>
                          <WorkspaceTableCell></WorkspaceTableCell>
                        </WorkspaceTableRow>
                       ))
                    ) : activityLogsData?.histories?.length ? (
                      activityLogsData.histories.map((item: any, idx: number) => {
                        const isExpanded = expandedActivityId === item.id;
                        return (
                          <React.Fragment key={item.id}>
                            <WorkspaceTableRow 
                              className={cn("cursor-pointer hover:bg-hover-bg/50 group", isExpanded && "bg-hover-bg/30")}
                              onClick={() => setExpandedActivityId(isExpanded ? null : item.id)}
                            >
                              <WorkspaceTableCell className="text-text-muted">{(activityPage - 1) * activityLimit + idx + 1}</WorkspaceTableCell>
                              <WorkspaceTableCell>
                                <span className={cn(
                                  "bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                                  item.action_type?.includes('DELETE') && "bg-destructive/10 text-destructive",
                                  item.action_type?.includes('UPDATE') && "bg-yellow-500/10 text-yellow-500",
                                  item.action_type?.includes('CREATE') && "bg-green-500/10 text-green-500"
                                )}>
                                  {item.action_type}
                                </span>
                              </WorkspaceTableCell>
                              <WorkspaceTableCell className="font-mono">{item.table_slug || '-'}</WorkspaceTableCell>
                              <WorkspaceTableCell className="text-text-muted">{new Date(item.date).toLocaleString()}</WorkspaceTableCell>
                              <WorkspaceTableCell>
                                <div className="flex items-center gap-1.5 text-text-muted">
                                  <User size={13} />
                                  <span>{item.user_info || 'System'}</span>
                                </div>
                              </WorkspaceTableCell>
                              <WorkspaceTableCell className="text-right">
                                <div className={cn("p-1.5 rounded-md text-text-muted group-hover:bg-bg-sidebar group-hover:text-text-main transition-all ml-auto w-fit", isExpanded && "bg-bg-sidebar text-text-main")}>
                                  <ChevronDown size={16} className={cn("transition-transform duration-200", isExpanded && "rotate-180")} />
                                </div>
                              </WorkspaceTableCell>
                            </WorkspaceTableRow>
                            {isExpanded && (
                              <WorkspaceTableRow className="hover:bg-transparent">
                                <WorkspaceTableCell colSpan={6} className="p-0 border-b border-border-subtle bg-bg-main/10 shadow-inner">
                                  <LogDetailAccordion item={item} type="activity" />
                                </WorkspaceTableCell>
                              </WorkspaceTableRow>
                            )}
                          </React.Fragment>
                        )
                      })
                    ) : (
                      <WorkspaceTableRow>
                        <WorkspaceTableCell colSpan={6} className="h-32 text-center text-text-muted">No activity logs found.</WorkspaceTableCell>
                      </WorkspaceTableRow>
                    )}
                  </WorkspaceTableBody>
                </WorkspaceTable>
              </WorkspaceTableWrapper>
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
              <WorkspaceTableWrapper className="border-none shadow-none rounded-none h-full">
                <WorkspaceTable>
                  <WorkspaceTableHeader className="sticky top-0 z-10">
                    <WorkspaceTableRow>
                      <WorkspaceTableHead className="w-16">#</WorkspaceTableHead>
                      <WorkspaceTableHead>{t('logs.columns.function')}</WorkspaceTableHead>
                      <WorkspaceTableHead>{t('logs.columns.time')}</WorkspaceTableHead>
                      <WorkspaceTableHead>{t('logs.columns.status')}</WorkspaceTableHead>
                      <WorkspaceTableHead>{t('logs.columns.duration')}</WorkspaceTableHead>
                      <WorkspaceTableHead>{t('logs.columns.tableSlug')}</WorkspaceTableHead>
                      <WorkspaceTableHead className="w-10"></WorkspaceTableHead>
                    </WorkspaceTableRow>
                  </WorkspaceTableHeader>
                  <WorkspaceTableBody>
                    {isFunctionLoading ? (
                       Array.from({ length: Math.min(functionLimit, 10) }).map((_, i) => (
                        <WorkspaceTableRow key={\`sk-\${i}\`}>
                          <WorkspaceTableCell><div className="h-4 w-6 bg-hover-bg animate-pulse rounded" /></WorkspaceTableCell>
                          <WorkspaceTableCell><div className="h-4 w-24 bg-hover-bg animate-pulse rounded" /></WorkspaceTableCell>
                          <WorkspaceTableCell><div className="h-4 w-32 bg-hover-bg animate-pulse rounded" /></WorkspaceTableCell>
                          <WorkspaceTableCell><div className="h-4 w-20 bg-hover-bg animate-pulse rounded" /></WorkspaceTableCell>
                          <WorkspaceTableCell><div className="h-4 w-16 bg-hover-bg animate-pulse rounded" /></WorkspaceTableCell>
                          <WorkspaceTableCell><div className="h-4 w-20 bg-hover-bg animate-pulse rounded" /></WorkspaceTableCell>
                          <WorkspaceTableCell></WorkspaceTableCell>
                        </WorkspaceTableRow>
                       ))
                    ) : functionLogsData?.function_logs?.length ? (
                      functionLogsData.function_logs.map((item: any, idx: number) => {
                        const isExpanded = expandedFunctionId === item.id;
                        const isSuccess = item.status === 'success';
                        
                        return (
                          <React.Fragment key={item.id}>
                            <WorkspaceTableRow 
                              className={cn("cursor-pointer hover:bg-hover-bg/50 group", isExpanded && "bg-hover-bg/30")}
                              onClick={() => setExpandedFunctionId(isExpanded ? null : item.id)}
                            >
                              <WorkspaceTableCell className="text-text-muted">{(functionPage - 1) * functionLimit + idx + 1}</WorkspaceTableCell>
                              <WorkspaceTableCell className="font-bold">{item.function_name || item.name}</WorkspaceTableCell>
                              <WorkspaceTableCell className="text-text-muted">{new Date(item.started_at).toLocaleString()}</WorkspaceTableCell>
                              <WorkspaceTableCell>
                                <span className={cn(
                                  "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase",
                                  isSuccess ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
                                )}>
                                  {item.status}
                                </span>
                              </WorkspaceTableCell>
                              <WorkspaceTableCell className="font-mono text-text-muted">{item.duration}ms</WorkspaceTableCell>
                              <WorkspaceTableCell className="font-mono">{item.table_slug || '-'}</WorkspaceTableCell>
                              <WorkspaceTableCell className="text-right">
                                <div className={cn("p-1.5 rounded-md text-text-muted group-hover:bg-bg-sidebar group-hover:text-text-main transition-all ml-auto w-fit", isExpanded && "bg-bg-sidebar text-text-main")}>
                                  <ChevronDown size={16} className={cn("transition-transform duration-200", isExpanded && "rotate-180")} />
                                </div>
                              </WorkspaceTableCell>
                            </WorkspaceTableRow>
                            {isExpanded && (
                              <WorkspaceTableRow className="hover:bg-transparent">
                                <WorkspaceTableCell colSpan={7} className="p-0 border-b border-border-subtle bg-bg-main/10 shadow-inner">
                                  <LogDetailAccordion item={item} type="function" isSuccess={isSuccess} />
                                </WorkspaceTableCell>
                              </WorkspaceTableRow>
                            )}
                          </React.Fragment>
                        )
                      })
                    ) : (
                      <WorkspaceTableRow>
                        <WorkspaceTableCell colSpan={7} className="h-32 text-center text-text-muted">No function logs found.</WorkspaceTableCell>
                      </WorkspaceTableRow>
                    )}
                  </WorkspaceTableBody>
                </WorkspaceTable>
              </WorkspaceTableWrapper>
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
`

fs.writeFileSync('/Users/nurmuhammad/Documents/workspace/IT/udevs/ucode/ugen/src/widgets/database-studio/ui/logs-view.tsx', code, 'utf8')
