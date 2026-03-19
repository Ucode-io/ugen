'use client'

import React, { useState, useMemo } from 'react'
import {
  Activity,
  FileText,
  Search,
  Calendar,
  User,
  Clock,
  Box,
  CheckCircle2,
  AlertCircle,
  Zap,
  Info,
  Calendar as CalendarIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { useAuthStore } from '@/entities/session'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { ReusableTabs } from '@/shared/ui/tabs'
import { DataTable } from '@/shared/ui/data-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/ui/dialog'
import { cn } from '@/shared/lib/utils/cn'
import { DatePickerWithRange } from '@/shared/ui/date-range-picker'

const ACTION_OPTIONS = [
  { label: "All", value: "all" },
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
  { label: "All", value: "all" },
  { label: "Success", value: "success" },
  { label: "Error", value: "error" },
]

const getFirstDayOfMonthDate = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

const getLastDayOfMonthDate = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0)
}

export const LogsView = () => {
  const [activeTab, setActiveTab] = useState('activity')
  const environmentId = useAuthStore((state) => state.user?.environment_id)
  const projectId = useAuthStore((state) => state.project?.project_id)

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
  const [selectedActivity, setSelectedActivity] = useState<any>(null)

  const debouncedCollection = useDebounce(collection, 500)
  const debouncedUserInfo = useDebounce(userInfo, 500)

  // Function Logs States
  const [functionPage, setFunctionPage] = useState(1)
  const [functionLimit, setFunctionLimit] = useState(10)
  const [functionId, setFunctionId] = useState("")
  const [status, setStatus] = useState("")
  const [selectedFunctionLog, setSelectedFunctionLog] = useState<any>(null)

  const formattedFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
  const formattedTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''

  console.log(useAuthStore((state) => state))

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

  const activityColumns = useMemo(() => [
    {
      id: 'index',
      header: '№',
      cell: ({ row }: any) => (activityPage - 1) * activityLimit + row.index + 1
    },
    {
      accessorKey: 'action_type',
      header: 'Action',
      cell: ({ getValue }: any) => (
        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase">
          {getValue()}
        </span>
      )
    },
    {
      accessorKey: 'table_slug',
      header: 'Collection',
      cell: ({ getValue }: any) => (
        <span className="font-mono text-xs text-text-muted">
          {getValue() || '-'}
        </span>
      )
    },
    {
      accessorKey: 'action_source',
      header: 'Action On',
      cell: ({ getValue }: any) => (
        <span className="text-sm text-text-main">
          {getValue() || '-'}
        </span>
      )
    },
    {
      accessorKey: 'user_info',
      header: 'Action By',
      cell: ({ getValue }: any) => (
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <User size={12} />
          <span>{getValue() || 'System'}</span>
        </div>
      )
    },
  ], [activityPage, activityLimit])

  const functionColumns = useMemo(() => [
    {
      id: 'index',
      header: '№',
      cell: ({ row }: any) => (functionPage - 1) * functionLimit + row.index + 1
    },
    {
      accessorKey: 'name',
      header: 'Function',
      cell: ({ getValue }: any) => (
        <span className="text-sm text-text-main font-bold">
          {getValue()}
        </span>
      )
    },
    {
      accessorKey: 'started_at',
      header: 'Time',
      cell: ({ getValue }: any) => (
        <span className="text-xs text-text-muted">
          {new Date(getValue()).toLocaleString()}
        </span>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }: any) => {
        const val = getValue()
        const isSuccess = val === 'success'
        return (
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-bold uppercase border",
            isSuccess
              ? "bg-green-500/10 text-green-500 border-green-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          )}>
            {val}
          </span>
        )
      }
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ getValue }: any) => (
        <span className="text-xs font-mono text-text-muted">
          {getValue()}ms
        </span>
      )
    },
    {
      accessorKey: 'table_slug',
      header: 'Table Slug',
      cell: ({ getValue }: any) => (
        <span className="font-mono text-xs text-text-muted">
          {getValue() || '-'}
        </span>
      )
    },
  ], [functionPage, functionLimit])

  const parseJson = (str: string) => {
    try {
      return JSON.parse(str)
    } catch (e) {
      return str
    }
  }

  const renderActivityDetail = (item: any) => {
    if (!item) return null
    const req = parseJson(item.request)
    const res = parseJson(item.response)

    return (
      <div className="space-y-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">User</p>
            <p className="text-sm text-text-main">{item.user_info || 'System'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Action</p>
            <p className="text-sm text-text-main">{item.action_type}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Date</p>
            <p className="text-sm text-text-main">{new Date(item.date).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Collection</p>
            <p className="text-sm text-text-main">{item.table_slug || '-'}</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Request</p>
          <pre className="bg-bg-sidebar rounded-lg p-3 text-xs font-mono text-text-main overflow-auto max-h-[200px] border border-border-subtle whitespace-pre-wrap">
            {typeof req === 'object' ? JSON.stringify(req, null, 2) : req}
          </pre>
        </div>
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Response</p>
          <pre className="bg-bg-sidebar rounded-lg p-3 text-xs font-mono text-text-main overflow-auto max-h-[200px] border border-border-subtle whitespace-pre-wrap">
            {typeof res === 'object' ? JSON.stringify(res, null, 2) : res}
          </pre>
        </div>
      </div>
    )
  }

  const renderFunctionDetail = (item: any) => {
    if (!item) return null
    const isSuccess = item.status === 'success'

    return (
      <div className="space-y-6 py-2">
        <section>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">General Info</p>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            <div>
              <p className="text-xs text-text-muted mb-1">Name</p>
              <p className="text-sm font-semibold text-text-main">{item.name}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Status</p>
              <span className={cn(
                "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                isSuccess
                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              )}>
                {item.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Request Method</p>
              <p className="text-sm font-semibold text-text-main uppercase">{item.request_method || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Action Type</p>
              <p className="text-sm font-semibold text-text-main">{item.action_type || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Started At</p>
              <p className="text-sm font-semibold text-text-main">{new Date(item.started_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Completed At</p>
              <p className="text-sm font-semibold text-text-main">{new Date(item.completed_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Duration</p>
              <p className="text-sm font-semibold text-text-main">{item.duration}ms</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Table Slug</p>
              <p className="text-sm font-semibold text-text-main">{item.table_slug || '-'}</p>
            </div>
          </div>
        </section>

        <section>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Resource Usage</p>
          <div className="bg-bg-sidebar rounded-lg p-4 border border-border-subtle grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-text-muted mb-1">Return Size</p>
              <p className="text-sm font-semibold text-text-main">{item.return_size || 0} B</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Compute</p>
              <p className="text-sm font-semibold text-text-main">{item.compute || 0} ms</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">DB Bandwidth</p>
              <p className="text-sm font-semibold text-text-main">{item.db_bandwidth || 0} B</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">File Bandwidth</p>
              <p className="text-sm font-semibold text-text-main">{item.file_bandwidth || 0} B</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Vector Bandwidth</p>
              <p className="text-sm font-semibold text-text-main">{item.vector_bandwidth || 0} B</p>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <ReusableTabs
          activeId={activeTab}
          onTabChange={(id) => setActiveTab(id)}
          options={[
            { id: 'activity', label: 'Activity Logs', icon: <Activity size={14} /> },
            { id: 'function', label: 'Function Logs', icon: <FileText size={14} /> },
          ]}
        />
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-ai shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {activeTab === 'activity' ? (
          <>
            <div className="flex flex-wrap gap-4 p-4 border-b border-border-subtle bg-bg-main/10 items-center">
              <DatePickerWithRange
                date={dateRange}
                setDate={(range) => {
                  setDateRange(range)
                  setActivityPage(1)
                }}
              />

              <div className="w-[180px]">
                <Select
                  value={actionType}
                  onValueChange={(val) => {
                    setActionType(val)
                    setActivityPage(1)
                  }}
                >
                  <SelectTrigger className="bg-bg-sidebar border-border-subtle h-9 text-sm">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
                <input
                  placeholder="Search collection..."
                  value={collection}
                  onChange={(e) => {
                    setCollection(e.target.value)
                    setActivityPage(1)
                  }}
                  className="bg-bg-sidebar border border-border-subtle rounded-lg pl-9 pr-3 py-1.5 text-sm text-text-main outline-none focus:border-primary/50 w-[200px]"
                />
              </div>

              <div className="relative group">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
                <input
                  placeholder="Search by user..."
                  value={userInfo}
                  onChange={(e) => {
                    setUserInfo(e.target.value)
                    setActivityPage(1)
                  }}
                  className="bg-bg-sidebar border border-border-subtle rounded-lg pl-9 pr-3 py-1.5 text-sm text-text-main outline-none focus:border-primary/50 w-[200px]"
                />
              </div>
            </div>

            <DataTable
              columns={activityColumns}
              data={activityLogsData?.histories || []}
              totalCount={activityLogsData?.histories?.length ? (activityLogsData.total || activityLogsData.histories.length * 2) : 0} // Fallback if no total
              page={activityPage}
              limit={activityLimit}
              onPageChange={setActivityPage}
              onLimitChange={setActivityLimit}
              isLoading={isActivityLoading}
              onRowClick={(row) => setSelectedActivity(row)}
              className="border-none shadow-none rounded-none flex-1"
            />
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 p-4 border-b border-border-subtle bg-bg-main/10">
              <div className="w-[220px]">
                <Select
                  value={functionId}
                  onValueChange={(val) => {
                    setFunctionId(val)
                    setFunctionPage(1)
                  }}
                >
                  <SelectTrigger className="bg-bg-sidebar border-border-subtle h-9 text-sm">
                    <SelectValue placeholder="All functions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All functions</SelectItem>
                    {functionsListData?.map((f: any) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[150px]">
                <Select
                  value={status}
                  onValueChange={(val) => {
                    setStatus(val)
                    setFunctionPage(1)
                  }}
                >
                  <SelectTrigger className="bg-bg-sidebar border-border-subtle h-9 text-sm">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DataTable
              columns={functionColumns}
              data={functionLogsData?.logs || []}
              totalCount={functionLogsData?.logs?.length ? (functionLogsData.total || functionLogsData.logs.length * 2) : 0}
              page={functionPage}
              limit={functionLimit}
              onPageChange={setFunctionPage}
              onLimitChange={setFunctionLimit}
              isLoading={isFunctionLoading}
              onRowClick={(row) => setSelectedFunctionLog(row)}
              className="border-none shadow-none rounded-none flex-1"
            />
          </>
        )}
      </div>

      {/* Activity Detail Modal */}
      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DialogContent className="max-w-2xl bg-bg-card p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-border-subtle bg-bg-main/5">
            <DialogTitle className="flex items-center gap-2 text-text-main">
              <Info size={18} className="text-primary" />
              Activity Log Details
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            {renderActivityDetail(selectedActivity)}
          </div>
        </DialogContent>
      </Dialog>

      {/* Function Log Detail Modal */}
      <Dialog open={!!selectedFunctionLog} onOpenChange={(open) => !open && setSelectedFunctionLog(null)}>
        <DialogContent className="max-w-lg bg-bg-card p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-border-subtle bg-bg-main/5">
            <DialogTitle className="flex items-center gap-2 text-text-main">
              <Zap size={18} className="text-primary" />
              Function Log Details
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            {renderFunctionDetail(selectedFunctionLog)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
