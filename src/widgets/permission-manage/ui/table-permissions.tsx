'use client'
import { useState, useEffect, useMemo } from 'react'
import { Controller, useForm, useFieldArray } from 'react-hook-form'
import {
  Filter,
  Table as TableIcon,
  Zap,
  Link as LinkIcon,
  Eye,
  Settings2,
  ShieldCheck,
  ChevronRight,
  Plus,
  Trash2,
  Save,
  Loader2,
  X
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/ui/table'
import { Button } from '@/shared/ui/ui/button'
import { cn } from '@/shared/lib/utils/cn'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi, api } from '@/shared/api'
import { DataLoadingState, DataErrorState } from '@/shared/ui/data-states'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/ui/select"
import { useAuthStore } from '@/entities/session'
import { toast } from "sonner";

// --- Interfaces ---

interface FieldPermission {
  field_id: string
  view_permission: boolean
  edit_permission: boolean
  label: string
  table_slug: string
}

interface ViewPermission {
  guid: string
  relation_id?: string
  view_permission: boolean
  edit_permission: boolean
  create_permission?: boolean
  delete_permission?: boolean
  table_slug: string
}

interface TableViewPermission {
  guid: string
  view: boolean
  edit: boolean
  delete: boolean
  view_id: string
  label?: string
}

interface ActionPermission {
  guid: string
  custom_event_id: string
  permission: boolean
  table_slug: string
  label?: string
}

interface TablePermissionRow {
  label: string
  slug: string
  id: string
  record_permissions: {
    read: string | boolean
    write: string | boolean
    update: string | boolean
    delete: string | boolean
    is_public: boolean
  }
  field_permissions: FieldPermission[]
  view_permissions?: ViewPermission[]
  automatic_filters: Record<string, any[]>
  action_permissions?: ActionPermission[]
  table_view_permissions?: TableViewPermission[]
  custom_permission: Record<string, string>
}

interface TablePermissionsProps {
  projectId: string
  roleId: string
  clientTypeId: string
}

// --- Components ---

const CustomPermissionBadge = ({
  label,
  checked,
  onChange,
  hasFilter,
  onFilterClick
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  hasFilter?: boolean;
  onFilterClick?: () => void;
}) => (
  <div className="flex items-center gap-1 justify-center group/badge">
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative min-w-[70px] px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-300 active:scale-95 flex items-center justify-center gap-1.5",
        checked
          ? "bg-primary text-white shadow-[0_2px_10px_-3px_rgba(var(--primary-rgb),0.5)] scale-100"
          : "bg-bg-sidebar/50 border border-border-subtle/60 text-text-muted hover:text-text-main hover:border-primary/40 hover:bg-bg-sidebar"
      )}
    >
      {checked && <ShieldCheck size={10} className="animate-in zoom-in duration-300" />}
      {label}
    </button>
    {hasFilter && (
      <button
        type="button"
        onClick={onFilterClick}
        className={cn(
          "p-1.5 rounded-lg transition-all duration-200",
          checked ? "text-primary hover:bg-primary/10" : "text-text-muted/40 hover:text-primary hover:bg-bg-sidebar"
        )}
      >
        <Filter size={13} className={cn(checked && "fill-primary/20")} />
      </button>
    )}
  </div>
)

const ActionButton = ({ icon: Icon, onClick, label }: { icon: any, onClick: () => void, label: string }) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onClick}
    title={label}
    className="h-9 w-9 rounded-xl border border-transparent bg-transparent text-text-muted hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all duration-300"
  >
    <Icon size={18} strokeWidth={2} />
  </Button>
)

export const TablePermissions = ({ projectId, roleId, clientTypeId }: TablePermissionsProps) => {
  const queryClient = useQueryClient()
  const [modalState, setModalState] = useState<{ type: string | null, tableIndex: number | null }>({ type: null, tableIndex: null })
  const [filterType, setFilterType] = useState('read')
  const [isScrolled, setIsScrolled] = useState(false)

  const ucodeProjectId = useAuthStore(state => state.ucodeProjectId)

  const { data: permissionDetail, isLoading, isError, refetch } = useQuery({
    queryKey: ['permissions-detail', projectId, roleId],
    queryFn: async () => {
      const { data } = await authApi.get(`/v2/role-permission/detailed/${ucodeProjectId}/${roleId}`, {
        params: { 'project-id': ucodeProjectId }
      })
      return data.data.data
    },
    enabled: !!projectId && !!roleId
  })

  const { control, setValue, handleSubmit, watch, reset } = useForm({
    defaultValues: {
      tables: [] as TablePermissionRow[],
      global_permission: {} as any,
      name: '',
      guid: '',
      project_id: '',
      client_type_id: ''
    }
  })

  useEffect(() => {
    if (permissionDetail) {
      reset({
        ...permissionDetail,
        tables: permissionDetail.tables.map((t: any) => ({
          ...t,
          record_permissions: {
            ...t.record_permissions,
            read: t.record_permissions.read === 'Yes',
            write: t.record_permissions.write === 'Yes',
            update: t.record_permissions.update === 'Yes',
            delete: t.record_permissions.delete === 'Yes',
          }
        }))
      })
    }
  }, [permissionDetail, reset])

  const tables = watch('tables')

  const { mutate: savePermissions, isPending: isSaving } = useMutation({
    mutationFn: async (formData: any) => {
      const payload = {
        data: {
          ...formData,
          tables: formData.tables.map((t: any) => ({
            ...t,
            record_permissions: {
              ...t.record_permissions,
              read: t.record_permissions.read ? 'Yes' : 'No',
              write: t.record_permissions.write ? 'Yes' : 'No',
              update: t.record_permissions.update ? 'Yes' : 'No',
              delete: t.record_permissions.delete ? 'Yes' : 'No',
            }
          }))
        },
        project_id: ucodeProjectId,
        role_id: roleId
      }
      return authApi.put('/v2/role-permission/detailed', payload, {
        params: { 'project-id': ucodeProjectId }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions-detail'] })
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollLeft > 0)
  }

  const handleSelectAll = (field: string, checked: boolean) => {
    tables.forEach((_, index) => {
      setValue(`tables.${index}.record_permissions.${field}` as any, checked)
    })
  }

  const isAllSelected = (field: string) => {
    return tables?.length > 0 && tables.every((t: any) => t?.record_permissions?.[field])
  }

  const openModal = (type: string, index: number) => {
    setModalState({ type, tableIndex: index })
  }

  const closeModal = () => {
    setModalState({ type: null, tableIndex: null })
  }

  // --- Modal Specific Data Fetching ---
  const currentTableSlug = modalState.tableIndex !== null ? tables[modalState.tableIndex]?.slug : null

  const { data: relationsData } = useQuery({
    queryKey: ['relations', currentTableSlug, projectId],
    queryFn: async () => {
      const { data } = await api.post(`/v2/relations/${currentTableSlug}`, {}, {
        params: { 'project-id': projectId, table_slug: currentTableSlug }
      })
      return (data.relations || [])
        .filter((r: any) => (r.type === 'Many2Many' || r.type === 'Many2One') && r.table_from.slug === currentTableSlug)
        .map((r: any) => ({
          label: r.title || r.table_to.label,
          value: `${r.table_to.slug}#${r.id}`
        }))
    },
    enabled: modalState.type === 'filter' && !!currentTableSlug
  })

  const { data: connectionsData } = useQuery({
    queryKey: ['connections', clientTypeId, projectId],
    queryFn: async () => {
      const { data } = await api.post('/v1/object/get-list/connections', {
        data: { client_type_id: clientTypeId }
      }, {
        params: { 'project-id': projectId }
      })
      const results = (data.data.response || []).map((c: any) => ({
        value: `${c.table_slug}_id`,
        label: c.table_slug
      }))
      return [{ value: 'user_id', label: 'user' }, ...results]
    },
    enabled: modalState.type === 'filter'
  })

  if (isLoading) return <DataLoadingState message="Fetching granular permissions..." />
  if (isError) return <DataErrorState onRetry={() => refetch()} />

  return (
    <div className="w-full relative animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between px-6 pt-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold text-text-main uppercase tracking-tight">Granular Table Controls</span>
        </div>
        <Button
          disabled={isSaving}
          onClick={handleSubmit((d) => savePermissions(d))}
          className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="px-6 py-4">
        <div className="rounded-2xl border border-border-subtle/60 bg-bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04),0_4px_20px_rgb(0,0,0,0.02)] overflow-hidden max-w-[1000px]">
          <div onScroll={handleScroll} className="overflow-auto max-h-[calc(100vh-320px)] custom-scrollbar">
            <Table className="border-collapse w-full min-w-[1100px]">
              <TableHeader>
                <TableRow className="border-b-border-subtle/60 bg-bg-sidebar hover:bg-bg-sidebar transition-none">
                  <TableHead rowSpan={2} className={cn(
                    "w-[280px] min-w-[280px] max-w-[280px] bg-bg-sidebar sticky left-0 z-40 border-r border-border-subtle/40 text-text-main font-bold align-middle px-6 transition-shadow duration-200 rounded-tl-2xl",
                    isScrolled && "shadow-[10px_0_15px_-3px_rgba(0,0,0,0.1),4px_0_6px_-2px_rgba(0,0,0,0.05)]"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                        <TableIcon size={16} className="text-primary" />
                      </div>
                      <span className="text-[14px] tracking-tight">Data Objects</span>
                    </div>
                  </TableHead>
                  <TableHead colSpan={5} className="text-center py-4 border-b border-border-subtle/40 bg-bg-sidebar">
                    <div className="flex items-center justify-center gap-2">
                      <ShieldCheck size={14} className="text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted/60">Record Level Permissions</span>
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-center w-[90px] bg-bg-sidebar align-middle py-6 font-bold text-[10px] uppercase tracking-widest text-text-muted/70">Field</TableHead>
                  <TableHead rowSpan={2} className="text-center w-[90px] bg-bg-sidebar align-middle py-6 font-bold text-[10px] uppercase tracking-widest text-text-muted/70">Action</TableHead>
                  <TableHead rowSpan={2} className="text-center w-[90px] bg-bg-sidebar align-middle py-6 font-bold text-[10px] uppercase tracking-widest text-text-muted/70">Relation</TableHead>
                  <TableHead rowSpan={2} className="text-center w-[90px] bg-bg-sidebar align-middle py-6 font-bold text-[10px] uppercase tracking-widest text-text-muted/70">View</TableHead>
                  <TableHead rowSpan={2} className="text-center w-[90px] bg-bg-sidebar align-middle py-6 font-bold text-[10px] uppercase tracking-widest text-text-muted/70 rounded-tr-2xl">Custom</TableHead>
                </TableRow>
                <TableRow className="border-b-border-subtle/60 bg-bg-sidebar hover:bg-bg-sidebar transition-none">
                  {[
                    { label: 'Read', field: 'read' },
                    { label: 'Write', field: 'write' },
                    { label: 'Update', field: 'update' },
                    { label: 'Delete', field: 'delete' },
                    { label: 'Public', field: 'is_public' }
                  ].map(({ label, field }) => (
                    <TableHead key={label} className="w-[130px] text-center py-3">
                      <label className="flex items-center justify-center gap-2 group/header cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isAllSelected(field)}
                          onChange={(e) => handleSelectAll(field, e.target.checked)}
                          className="w-4 h-4 rounded border-border-subtle bg-bg-sidebar cursor-pointer accent-primary transition-all hover:ring-2 hover:ring-primary/20 shadow-sm"
                        />
                        <span className="text-[12px] font-bold text-text-muted group-hover/header:text-text-main transition-colors uppercase tracking-tight">{label}</span>
                      </label>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables?.map((row, index) => (
                  <TableRow key={row.id} className="group/row transition-colors hover:bg-primary/[0.01]">
                    <TableCell className={cn(
                      "w-[280px] min-w-[280px] max-w-[280px] sticky left-0 bg-bg-card border-r border-border-subtle/40 z-30 px-6 py-5 transition-shadow duration-200",
                      isScrolled && "shadow-[10px_0_15px_-3px_rgba(0,0,0,0.1),4px_0_6px_-2px_rgba(0,0,0,0.05)]"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[14px] text-text-main tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                              {row.label}
                            </span>
                            <ChevronRight size={12} className="text-text-muted opacity-0 group-hover/row:opacity-100 -translate-x-2 group-hover/row:translate-x-0 transition-all" />
                          </div>
                          <span className="text-[9px] text-primary/80 font-mono bg-primary/5 w-fit px-1.5 py-0.5 rounded-md uppercase tracking-widest mt-1 border border-primary/10 shadow-sm">
                            {row.slug}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="align-middle px-2">
                      <Controller name={`tables.${index}.record_permissions.read`} control={control} render={({ field }) => (
                        <CustomPermissionBadge
                          label="READ"
                          checked={field.value as boolean}
                          onChange={field.onChange}
                          hasFilter
                          onFilterClick={() => openModal('filter', index)}
                        />
                      )} />
                    </TableCell>
                    <TableCell className="align-middle px-2">
                      <Controller name={`tables.${index}.record_permissions.write`} control={control} render={({ field }) => (
                        <CustomPermissionBadge label="WRITE" checked={field.value as boolean} onChange={field.onChange} />
                      )} />
                    </TableCell>
                    <TableCell className="align-middle px-2">
                      <Controller name={`tables.${index}.record_permissions.update`} control={control} render={({ field }) => (
                        <CustomPermissionBadge label="UPDATE" checked={field.value as boolean} onChange={field.onChange} />
                      )} />
                    </TableCell>
                    <TableCell className="align-middle px-2">
                      <Controller name={`tables.${index}.record_permissions.delete`} control={control} render={({ field }) => (
                        <CustomPermissionBadge label="DELETE" checked={field.value as boolean} onChange={field.onChange} />
                      )} />
                    </TableCell>
                    <TableCell className="align-middle px-2">
                      <Controller name={`tables.${index}.record_permissions.is_public`} control={control} render={({ field }) => (
                        <CustomPermissionBadge label="PUBLIC" checked={field.value as boolean} onChange={field.onChange} />
                      )} />
                    </TableCell>

                    <TableCell className="text-center align-middle">
                      <ActionButton icon={TableIcon} label="Fields" onClick={() => openModal('field', index)} />
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      <ActionButton icon={Zap} label="Actions" onClick={() => openModal('action', index)} />
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      <ActionButton icon={LinkIcon} label="Relations" onClick={() => openModal('relation', index)} />
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      <ActionButton icon={Eye} label="Views" onClick={() => openModal('view', index)} />
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      <ActionButton icon={Settings2} label="Custom" onClick={() => openModal('custom', index)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {modalState.type && (
        <Dialog open={!!modalState.type} onOpenChange={closeModal}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 bg-bg-card border-border-subtle rounded-[24px]">
            <DialogHeader className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Settings2 className="text-primary" size={20} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-text-main">
                    Configure {modalState.type.charAt(0).toUpperCase() + modalState.type.slice(1)} Settings
                  </DialogTitle>
                  <DialogDescription className="text-xs text-text-muted mt-0.5">
                    Modifying granular controls for <span className="text-primary font-bold">{tables[modalState.tableIndex!]?.label}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
              <ModalContent
                type={modalState.type}
                tableIndex={modalState.tableIndex!}
                control={control}
                setValue={setValue}
                watch={watch}
                filterType={filterType}
                setFilterType={setFilterType}
                relationsData={relationsData}
                connectionsData={connectionsData}
              />
            </div>

            <div className="mt-6 pt-4 border-t border-border-subtle flex justify-end items-center gap-3">
              <Button variant="ghost" onClick={closeModal} className="px-6 font-semibold">
                Close
              </Button>
              <Button onClick={closeModal} className="px-8 rounded-xl font-bold bg-primary hover:bg-primary/90">
                Confirm
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

const ModalContent = ({
  type,
  tableIndex,
  control,
  setValue,
  watch,
  filterType,
  setFilterType,
  relationsData,
  connectionsData
}: any) => {
  const table = watch(`tables.${tableIndex}`)

  if (type === 'field') {
    const fields = table.field_permissions || []

    const handleToggleAll = (prop: 'view_permission' | 'edit_permission', checked: boolean) => {
      fields.forEach((_: any, idx: number) => {
        setValue(`tables.${tableIndex}.field_permissions.${idx}.${prop}`, checked)
      })
    }

    const isAllFieldSelected = (prop: 'view_permission' | 'edit_permission') =>
      fields.length > 0 && fields.every((f: any) => f[prop])

    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-bg-sidebar/30">
            <TableHead className="w-10 text-[10px] uppercase font-bold text-text-muted">No</TableHead>
            <TableHead className="text-[10px] uppercase font-bold text-text-muted">Field Name</TableHead>
            <TableHead className="w-[120px] text-center">
              <label className="flex flex-col items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllFieldSelected('view_permission')}
                  onChange={(e) => handleToggleAll('view_permission', e.target.checked)}
                  className="w-4 h-4 rounded border-border-subtle accent-primary"
                />
                <span className="text-[9px] uppercase font-bold text-text-muted">View</span>
              </label>
            </TableHead>
            <TableHead className="w-[120px] text-center">
              <label className="flex flex-col items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllFieldSelected('edit_permission')}
                  onChange={(e) => handleToggleAll('edit_permission', e.target.checked)}
                  className="w-4 h-4 rounded border-border-subtle accent-primary"
                />
                <span className="text-[9px] uppercase font-bold text-text-muted">Edit</span>
              </label>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field: any, idx: number) => (
            <TableRow key={field.field_id}>
              <TableCell className="text-[11px] text-text-muted">{idx + 1}</TableCell>
              <TableCell className="text-[13px] font-medium text-text-main">{field.label}</TableCell>
              <TableCell className="text-center">
                <Controller
                  name={`tables.${tableIndex}.field_permissions.${idx}.view_permission`}
                  control={control}
                  render={({ field: f }) => (
                    <input
                      type="checkbox"
                      checked={f.value}
                      onChange={f.onChange}
                      className="w-4 h-4 rounded border-border-subtle bg-bg-card checked:bg-primary checked:border-primary cursor-pointer accent-primary transition-all"
                    />
                  )}
                />
              </TableCell>
              <TableCell className="text-center">
                <Controller
                  name={`tables.${tableIndex}.field_permissions.${idx}.edit_permission`}
                  control={control}
                  render={({ field: f }) => (
                    <input
                      type="checkbox"
                      checked={f.value}
                      onChange={f.onChange}
                      className="w-4 h-4 rounded border-border-subtle bg-bg-card checked:bg-primary checked:border-primary cursor-pointer accent-primary transition-all"
                    />
                  )}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (type === 'action') {
    const actions = table.action_permissions || []
    if (actions.length === 0) return <p className="text-center text-text-muted text-sm py-8">No actions available.</p>

    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-bg-sidebar/30">
            <TableHead className="w-10 text-[10px] uppercase font-bold text-text-muted">No</TableHead>
            <TableHead className="text-[10px] uppercase font-bold text-text-muted">Action Name</TableHead>
            <TableHead className="w-[120px] text-center text-[10px] uppercase font-bold text-text-muted">Permission</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((action: any, idx: number) => (
            <TableRow key={action.guid}>
              <TableCell className="text-[11px] text-text-muted">{idx + 1}</TableCell>
              <TableCell className="text-[13px] font-medium text-text-main">{action.label || action.guid.slice(0, 8)}</TableCell>
              <TableCell className="text-center">
                <Controller
                  name={`tables.${tableIndex}.action_permissions.${idx}.permission`}
                  control={control}
                  render={({ field: f }) => (
                    <input
                      type="checkbox"
                      checked={f.value}
                      onChange={f.onChange}
                      className="w-4 h-4 rounded border-border-subtle bg-bg-card checked:bg-primary checked:border-primary cursor-pointer accent-primary transition-all"
                    />
                  )}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (type === 'relation') {
    const rels = table.view_permissions || []
    if (rels.length === 0) return <p className="text-center text-text-muted text-sm py-8">No relations defined.</p>

    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-bg-sidebar/30">
            <TableHead className="w-10 text-[10px] uppercase font-bold text-text-muted">No</TableHead>
            <TableHead className="text-[10px] uppercase font-bold text-text-muted">Relation Source</TableHead>
            <TableHead className="w-[120px] text-center text-[10px] uppercase font-bold text-text-muted">View Permission</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rels.map((rel: any, idx: number) => (
            <TableRow key={rel.guid}>
              <TableCell className="text-[11px] text-text-muted">{idx + 1}</TableCell>
              <TableCell className="text-[13px] font-medium text-text-main">{rel.table_slug}</TableCell>
              <TableCell className="text-center">
                <Controller
                  name={`tables.${tableIndex}.view_permissions.${idx}.view_permission`}
                  control={control}
                  render={({ field: f }) => (
                    <input
                      type="checkbox"
                      checked={f.value}
                      onChange={f.onChange}
                      className="w-4 h-4 rounded border-border-subtle bg-bg-card checked:bg-primary checked:border-primary cursor-pointer accent-primary transition-all"
                    />
                  )}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (type === 'view') {
    const views = table.table_view_permissions || []
    if (views.length === 0) return <p className="text-center text-text-muted text-sm py-8">No specific views configured.</p>

    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-bg-sidebar/30">
            <TableHead className="w-10 text-[10px] uppercase font-bold text-text-muted">No</TableHead>
            <TableHead className="text-[10px] uppercase font-bold text-text-muted">View Label</TableHead>
            <TableHead className="w-[80px] text-center text-[10px] uppercase font-bold text-text-muted">View</TableHead>
            <TableHead className="w-[80px] text-center text-[10px] uppercase font-bold text-text-muted">Edit</TableHead>
            <TableHead className="w-[80px] text-center text-[10px] uppercase font-bold text-text-muted">Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {views.map((v: any, idx: number) => (
            <TableRow key={v.guid}>
              <TableCell className="text-[11px] text-text-muted">{idx + 1}</TableCell>
              <TableCell className="text-[13px] font-medium text-text-main">{v.label || v.view_id.slice(0, 8)}</TableCell>
              <TableCell className="text-center">
                <Controller name={`tables.${tableIndex}.table_view_permissions.${idx}.view`} control={control} render={({ field: f }) => (
                  <input type="checkbox" checked={f.value} onChange={f.onChange} className="w-4 h-4 rounded border-border-subtle accent-primary" />
                )} />
              </TableCell>
              <TableCell className="text-center">
                <Controller name={`tables.${tableIndex}.table_view_permissions.${idx}.edit`} control={control} render={({ field: f }) => (
                  <input type="checkbox" checked={f.value} onChange={f.onChange} className="w-4 h-4 rounded border-border-subtle accent-primary" />
                )} />
              </TableCell>
              <TableCell className="text-center">
                <Controller name={`tables.${tableIndex}.table_view_permissions.${idx}.delete`} control={control} render={({ field: f }) => (
                  <input type="checkbox" checked={f.value} onChange={f.onChange} className="w-4 h-4 rounded border-border-subtle accent-primary" />
                )} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (type === 'custom') {
    const custom = table.custom_permission || {}
    const keys = Object.keys(custom)

    const formatKey = (k: string) => k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-bg-sidebar/30">
            <TableHead className="w-10 text-[10px] uppercase font-bold text-text-muted">No</TableHead>
            <TableHead className="text-[10px] uppercase font-bold text-text-muted">Setting</TableHead>
            <TableHead className="w-[120px] text-center text-[10px] uppercase font-bold text-text-muted">Permission</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((k, idx) => (
            <TableRow key={k}>
              <TableCell className="text-[11px] text-text-muted">{idx + 1}</TableCell>
              <TableCell className="text-[13px] font-medium text-text-main">{formatKey(k)}</TableCell>
              <TableCell className="text-center">
                <Controller
                  name={`tables.${tableIndex}.custom_permission.${k}`}
                  control={control}
                  render={({ field: f }) => (
                    <input
                      type="checkbox"
                      checked={f.value === 'Yes'}
                      onChange={(e) => f.onChange(e.target.checked ? 'Yes' : 'No')}
                      className="w-4 h-4 rounded border-border-subtle accent-primary"
                    />
                  )}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (type === 'filter') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-1 bg-bg-sidebar/50 p-1 rounded-xl w-fit border border-border-subtle/40">
          {['read', 'write'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-tight",
                filterType === t ? "bg-primary text-white shadow-sm" : "hover:bg-hover-bg text-text-muted"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <FilterRows
          tableIndex={tableIndex}
          filterType={filterType}
          control={control}
          relationsData={relationsData}
          connectionsData={connectionsData}
        />
      </div>
    )
  }

  return null
}

const FilterRows = ({ tableIndex, filterType, control, relationsData, connectionsData }: any) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `tables.${tableIndex}.automatic_filters.${filterType}`
  })

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {fields.length === 0 ? (
          <div className="text-center py-10 bg-bg-sidebar/20 rounded-2xl border border-dashed border-border-subtle">
            <p className="text-text-muted text-xs">No active filters. Records will be fully accessible.</p>
          </div>
        ) : (
          fields.map((item, idx) => (
            <div key={item.id} className="group relative flex items-center gap-4 bg-bg-card p-4 rounded-2xl border border-border-subtle/60 hover:border-primary/30 transition-all shadow-sm">
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Connect To</p>
                    <Controller
                      name={`tables.${tableIndex}.automatic_filters.${filterType}.${idx}.object_field`}
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-10 bg-bg-sidebar border-border-subtle text-text-main text-xs">
                            <SelectValue placeholder="Select connection" />
                          </SelectTrigger>
                          <SelectContent className="bg-bg-card border-border-subtle">
                            {connectionsData?.map((c: any) => (
                              <SelectItem key={c.value} value={c.value} className="text-xs">
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Table Relation</p>
                    <Controller
                      name={`tables.${tableIndex}.automatic_filters.${filterType}.${idx}.custom_field`}
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-10 bg-bg-sidebar border-border-subtle text-text-main text-xs">
                            <SelectValue placeholder="Select relation" />
                          </SelectTrigger>
                          <SelectContent className="bg-bg-card border-border-subtle">
                            {relationsData?.map((r: any) => (
                              <SelectItem key={r.value} value={r.value} className="text-xs">
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(idx)}
                className="h-9 w-9 text-text-muted hover:text-destructive hover:bg-destructive/10 rounded-xl"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          )
          ))}
      </div>

      <Button
        onClick={() => append({ object_field: '', custom_field: '', guid: crypto.randomUUID() })}
        variant="ghost"
        className="w-full h-11 border border-dashed border-border-subtle text-text-muted hover:text-primary hover:border-primary/30 rounded-2xl gap-2 font-semibold text-xs transition-all"
      >
        <Plus size={16} />
        Add New Filter Condition
      </Button>
    </div>
  )
}


