'use client'
import { useState } from 'react'
import { Controller, useFieldArray, Control, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import {
  Filter,
  Table as TableIcon,
  Zap,
  Link as LinkIcon,
  Eye,
  Settings2,
  ShieldCheck,
  Loader2,
  Trash2,
  Plus
} from 'lucide-react'
import {
  WorkspaceTableWrapper,
  WorkspaceTable,
  WorkspaceTableHeader,
  WorkspaceTableBody,
  WorkspaceTableRow,
  WorkspaceTableHead,
  WorkspaceTableCell
} from '@/widgets/project-workspace/ui/workspace-table'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'
import { Switch } from '@/shared/ui/switch'
import { PermissionCheckbox } from './permission-checkbox'
import { cn } from '@/shared/lib/utils/cn'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { DataLoadingState } from '@/shared/ui'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui'

// --- Interfaces ---

interface TablePermissionsProps {
  projectId: string
  roleId: string
  clientTypeId: string
  control: Control<any>
  setValue: UseFormSetValue<any>
  watch: UseFormWatch<any>
  isLoading: boolean
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
  <div className="flex items-center gap-1 justify-center">
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative min-w-[75px] px-2 py-1 text-[10px] font-medium rounded-md transition-all duration-200",
        checked
          ? "bg-primary text-white"
          : "bg-bg-sidebar/40 border border-border-subtle/50 text-text-muted hover:text-text-main hover:border-border-subtle hover:bg-bg-sidebar shadow-sm"
      )}
    >
      {label}
    </button>
    {hasFilter && (
      <button
        type="button"
        onClick={onFilterClick}
        className={cn(
          "p-1.5 rounded-md transition-all duration-200",
          checked ? "text-primary hover:bg-primary/5" : "text-text-muted/40 hover:text-primary hover:bg-transparent"
        )}
      >
        <Filter size={13} />
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
    className="h-8 w-8 rounded-md text-text-muted hover:text-primary hover:bg-primary/5 transition-colors"
  >
    <Icon size={16} />
  </Button>
)

export const TablePermissions = ({ projectId, roleId, clientTypeId, control, setValue, watch, isLoading }: TablePermissionsProps) => {
  const t = useTranslations('widgets.permissionManage.tablePermissions')
  const [modalState, setModalState] = useState<{ type: string | null, tableIndex: number | null }>({ type: null, tableIndex: null })
  const [filterType, setFilterType] = useState('read')
  const [isScrolled, setIsScrolled] = useState(false)

  const tables = watch('tables') || []

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollLeft > 0)
  }

  const handleSelectAll = (field: string, checked: boolean) => {
    tables.forEach((_: any, index: number) => {
      setValue(`tables.${index}.record_permissions.${field}`, checked)
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
  const currentTableSlug = modalState.tableIndex !== null ? tables[modalState.tableIndex!]?.slug : null

  const { data: relationsData } = useQuery({
    queryKey: ['relations', currentTableSlug, projectId],
    queryFn: async () => {
      const { data } = await api.get(`/v2/relations/${currentTableSlug}`, {
        params: { 'project-id': projectId, table_slug: currentTableSlug }
      })

      return (data?.data?.relations || [])
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

  if (isLoading) return <DataLoadingState message={t('fetching')} />

  return (
    <div className="w-full relative flex flex-col p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <span className="text-sm font-bold text-text-main uppercase tracking-tight">{t('title')}</span>
      </div>

      <WorkspaceTableWrapper className="border border-border-subtle/50 shadow-sm overflow-hidden rounded-[16px] max-w-[1100px]">
        <div onScroll={handleScroll} className="overflow-auto max-h-[calc(100vh-320px)] custom-scrollbar">
          <WorkspaceTable className="border-collapse w-full min-w-[1100px]">
            <WorkspaceTableHeader className="sticky top-0 z-50 bg-bg-card">
              <WorkspaceTableRow className="transition-none hover:bg-transparent">
                <WorkspaceTableHead rowSpan={2} className={cn(
                  "w-[230px] min-w-[230px] max-w-[230px] sticky left-0 z-50 border border-border-subtle border-t-0 border-l-0 bg-bg-card text-text-main font-bold align-middle px-6 transition-shadow duration-200",
                  isScrolled && "border-r-2"
                )}>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] tracking-tight font-medium uppercase text-text-muted">{t('objectsHeader')}</span>
                  </div>
                </WorkspaceTableHead>
                <WorkspaceTableHead colSpan={5} className="text-center border border-border-subtle border-t-0 bg-bg-card">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted/60">{t('recordLevelHeader')}</span>
                </WorkspaceTableHead>
                <WorkspaceTableHead rowSpan={2} className="text-center w-[90px] align-middle py-2 font-bold text-[10px] uppercase tracking-widest text-text-muted/70 border border-border-subtle border-t-0 bg-bg-card">{t('fieldHeader')}</WorkspaceTableHead>
                {/* <WorkspaceTableHead rowSpan={2} className="text-center w-[90px] align-middle py-2 font-bold text-[10px] uppercase tracking-widest text-text-muted/70 border border-border-subtle border-t-0 bg-bg-card">{t('actionHeader')}</WorkspaceTableHead>
                <WorkspaceTableHead rowSpan={2} className="text-center w-[90px] align-middle py-2 font-bold text-[10px] uppercase tracking-widest text-text-muted/70 border border-border-subtle border-t-0 bg-bg-card">{t('relationHeader')}</WorkspaceTableHead>
                <WorkspaceTableHead rowSpan={2} className="text-center w-[90px] align-middle py-2 font-bold text-[10px] uppercase tracking-widest text-text-muted/70 border border-border-subtle border-t-0 bg-bg-card">{t('viewHeader')}</WorkspaceTableHead>
                <WorkspaceTableHead rowSpan={2} className="text-center w-[90px] align-middle py-2 font-bold text-[10px] uppercase tracking-widest text-text-muted/70 border border-border-subtle border-t-0 bg-bg-card border-r-0">{t('customHeader')}</WorkspaceTableHead> */}
              </WorkspaceTableRow>
              <WorkspaceTableRow className="transition-none hover:bg-transparent">
                {[
                  { label: t('read'), field: 'read' },
                  { label: t('write'), field: 'write' },
                  { label: t('update'), field: 'update' },
                  { label: t('delete'), field: 'delete' },
                  { label: t('public'), field: 'is_public' }
                ].map(({ label, field }) => (
                  <WorkspaceTableHead key={label} className={cn("w-[130px] text-center p-2 border border-border-subtle border-t-0 border-l-0 bg-bg-card")}>
                    <div className="flex flex-col items-center gap-1.5">
                      <PermissionCheckbox
                        checked={isAllSelected(field)}
                        onCheckedChange={(checked) => handleSelectAll(field, checked)}
                      />
                    </div>
                  </WorkspaceTableHead>
                ))}
              </WorkspaceTableRow>
            </WorkspaceTableHeader>
            <WorkspaceTableBody>
              {tables?.map((row: any, index: number) => (
                <WorkspaceTableRow key={row.id} className="group/row transition-none hover:bg-transparent">
                  <WorkspaceTableCell className={cn(
                    "w-[230px] min-w-[230px] max-w-[230px] sticky left-0 bg-bg-card border-r border-border-subtle z-30 px-6 py-2 transition-shadow duration-200 group-hover:bg-bg-card",
                    isScrolled && "border-r-2"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col min-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[13px] text-text-main tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                            {row.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </WorkspaceTableCell>

                  <WorkspaceTableCell className="align-middle px-2 py-1">
                    <Controller name={`tables.${index}.record_permissions.read`} control={control}
                      render={({ field }) => (
                        <CustomPermissionBadge
                          label="READ"
                          checked={field.value as boolean}
                          onChange={field.onChange}
                          hasFilter
                          onFilterClick={() => openModal('filter', index)}
                        />
                      )}
                    />
                  </WorkspaceTableCell>
                  <WorkspaceTableCell className="align-middle px-2 py-1">
                    <Controller name={`tables.${index}.record_permissions.write`} control={control} render={({ field }) => (
                      <CustomPermissionBadge label="WRITE" checked={field.value as boolean} onChange={field.onChange} />
                    )} />
                  </WorkspaceTableCell>
                  <WorkspaceTableCell className="align-middle px-2 py-1">
                    <Controller name={`tables.${index}.record_permissions.update`} control={control} render={({ field }) => (
                      <CustomPermissionBadge label="UPDATE" checked={field.value as boolean} onChange={field.onChange} />
                    )} />
                  </WorkspaceTableCell>
                  <WorkspaceTableCell className="align-middle px-2 py-1">
                    <Controller name={`tables.${index}.record_permissions.delete`} control={control} render={({ field }) => (
                      <CustomPermissionBadge label="DELETE" checked={field.value as boolean} onChange={field.onChange} />
                    )} />
                  </WorkspaceTableCell>
                  <WorkspaceTableCell className="align-middle px-2 py-1">
                    <Controller name={`tables.${index}.record_permissions.is_public`} control={control} render={({ field }) => (
                      <CustomPermissionBadge label="PUBLIC" checked={field.value as boolean} onChange={field.onChange} />
                    )} />
                  </WorkspaceTableCell>

                  <WorkspaceTableCell className="text-center align-middle px-2 py-1">
                    <ActionButton icon={TableIcon} label={t('fieldHeader')} onClick={() => openModal('field', index)} />
                  </WorkspaceTableCell>
                  {/* <WorkspaceTableCell className="text-center align-middle px-2 py-1">
                    <ActionButton icon={Zap} label={t('actionHeader')} onClick={() => openModal('action', index)} />
                  </WorkspaceTableCell>
                  <WorkspaceTableCell className="text-center align-middle px-2 py-1">
                    <ActionButton icon={LinkIcon} label={t('relationHeader')} onClick={() => openModal('relation', index)} />
                  </WorkspaceTableCell>
                  <WorkspaceTableCell className="text-center align-middle px-2 py-1">
                    <ActionButton icon={Eye} label={t('viewHeader')} onClick={() => openModal('view', index)} />
                  </WorkspaceTableCell>
                  <WorkspaceTableCell className="text-center align-middle px-2 py-1">
                    <ActionButton icon={Settings2} label={t('customHeader')} onClick={() => openModal('custom', index)} />
                  </WorkspaceTableCell> */}
                </WorkspaceTableRow>
              ))}
            </WorkspaceTableBody>
          </WorkspaceTable>
        </div>
      </WorkspaceTableWrapper>

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
                    {t('configTitle', { type: modalState.type.charAt(0).toUpperCase() + modalState.type.slice(1) })}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-text-muted mt-0.5">
                    {t('modifyingFor', { label: tables[modalState.tableIndex!]?.label })}
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
                {t('close')}
              </Button>
              <Button onClick={closeModal} className="px-8 rounded-xl font-bold bg-primary hover:bg-primary/90">
                {t('confirm')}
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
  const t = useTranslations('widgets.permissionManage.tablePermissions')
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
      <WorkspaceTableWrapper>
        <WorkspaceTable>
          <WorkspaceTableHeader className="bg-bg-card">
            <WorkspaceTableRow className="transition-none hover:bg-transparent">
              <WorkspaceTableHead className="w-10 text-[10px] uppercase font-bold text-text-muted border border-border-subtle bg-bg-card">No</WorkspaceTableHead>
              <WorkspaceTableHead className="text-[10px] uppercase font-bold text-text-muted border border-border-subtle bg-bg-card">{t('fieldHeader')} Name</WorkspaceTableHead>
              <WorkspaceTableHead className="w-[120px] text-center border border-border-subtle bg-bg-card">
                <div className="flex flex-col items-center gap-1">
                  <PermissionCheckbox
                    checked={isAllFieldSelected('view_permission')}
                    onCheckedChange={(checked) => handleToggleAll('view_permission', checked)}
                  />
                  <span className="text-[9px] uppercase font-bold text-text-muted">{t('view')}</span>
                </div>
              </WorkspaceTableHead>
              <WorkspaceTableHead className="w-[120px] text-center border border-border-subtle bg-bg-card">
                <div className="flex flex-col items-center gap-1">
                  <PermissionCheckbox
                    checked={isAllFieldSelected('edit_permission')}
                    onCheckedChange={(checked) => handleToggleAll('edit_permission', checked)}
                  />
                  <span className="text-[9px] uppercase font-bold text-text-muted">{t('update')}</span>
                </div>
              </WorkspaceTableHead>
            </WorkspaceTableRow>
          </WorkspaceTableHeader>
          <WorkspaceTableBody>
            {fields.map((field: any, idx: number) => (
              <WorkspaceTableRow key={field.field_id} className="transition-none hover:bg-transparent group/row">
                <WorkspaceTableCell className="px-4 py-1 text-[11px] text-text-muted border border-border-subtle group-hover:bg-bg-card">{idx + 1}</WorkspaceTableCell>
                <WorkspaceTableCell className="px-4 py-1 text-[13px] font-medium text-text-main border border-border-subtle group-hover:bg-bg-card">{field.label}</WorkspaceTableCell>
                <WorkspaceTableCell className="px-4 py-1 text-center border border-border-subtle group-hover:bg-bg-card">
                  <Controller
                    name={`tables.${tableIndex}.field_permissions.${idx}.view_permission`}
                    control={control}
                    render={({ field: f }) => (
                      <PermissionCheckbox checked={f.value} onCheckedChange={f.onChange} />
                    )}
                  />
                </WorkspaceTableCell>
                <WorkspaceTableCell className="px-4 py-1 text-center group-hover:bg-bg-card">
                  <Controller
                    name={`tables.${tableIndex}.field_permissions.${idx}.edit_permission`}
                    control={control}
                    render={({ field: f }) => (
                      <PermissionCheckbox checked={f.value} onCheckedChange={f.onChange} />
                    )}
                  />
                </WorkspaceTableCell>
              </WorkspaceTableRow>
            ))}
          </WorkspaceTableBody>
        </WorkspaceTable>
      </WorkspaceTableWrapper>
    )
  }

  if (type === 'action') {
    const actions = table.action_permissions || []
    if (actions.length === 0) return <p className="text-center text-text-muted text-sm py-8">{t('noActions')}</p>

    return (
      <WorkspaceTableWrapper>
        <WorkspaceTable>
          <WorkspaceTableHeader className="bg-bg-card">
            <WorkspaceTableRow className="transition-none hover:bg-transparent">
              <WorkspaceTableHead className="w-10 text-[10px] uppercase font-bold text-text-muted border border-border-subtle bg-bg-card">No</WorkspaceTableHead>
              <WorkspaceTableHead className="text-[10px] uppercase font-bold text-text-muted border border-border-subtle bg-bg-card">{t('actionHeader')} Name</WorkspaceTableHead>
              <WorkspaceTableHead className="w-[120px] text-center text-[10px] uppercase font-bold text-text-muted border border-border-subtle bg-bg-card">Permission</WorkspaceTableHead>
            </WorkspaceTableRow>
          </WorkspaceTableHeader>
          <WorkspaceTableBody>
            {actions.map((action: any, idx: number) => (
              <WorkspaceTableRow key={action.guid} className="transition-none hover:bg-transparent group/row">
                <WorkspaceTableCell className="px-4 py-1 text-[11px] text-text-muted border border-border-subtle group-hover:bg-bg-card">{idx + 1}</WorkspaceTableCell>
                <WorkspaceTableCell className="px-4 py-1 text-[13px] font-medium text-text-main border border-border-subtle group-hover:bg-bg-card">{action.label || action.guid.slice(0, 8)}</WorkspaceTableCell>
                <WorkspaceTableCell className="px-4 py-1 text-center border border-border-subtle group-hover:bg-bg-card">
                  <Controller
                    name={`tables.${tableIndex}.action_permissions.${idx}.permission`}
                    control={control}
                    render={({ field: f }) => (
                      <PermissionCheckbox checked={f.value} onCheckedChange={f.onChange} />
                    )}
                  />
                </WorkspaceTableCell>
              </WorkspaceTableRow>
            ))}
          </WorkspaceTableBody>
        </WorkspaceTable>
      </WorkspaceTableWrapper>
    )
  }

  if (type === 'relation') {
    const rels = table.view_permissions || []
    if (rels.length === 0) return <p className="text-center text-text-muted text-sm py-8">{t('noRelations')}</p>

    return (
      <WorkspaceTableWrapper>
        <WorkspaceTable>
          <WorkspaceTableHeader className="bg-bg-card">
            <WorkspaceTableRow className="transition-none hover:bg-transparent">
              <WorkspaceTableHead className="w-10 text-[10px] uppercase font-bold text-text-muted border border-border-subtle bg-bg-card">No</WorkspaceTableHead>
              <WorkspaceTableHead className="text-[10px] uppercase font-bold text-text-muted border border-border-subtle bg-bg-card">{t('relationHeader')} Source</WorkspaceTableHead>
              <WorkspaceTableHead className="w-[120px] text-center text-[10px] uppercase font-bold text-text-muted border border-border-subtle bg-bg-card">View Permission</WorkspaceTableHead>
            </WorkspaceTableRow>
          </WorkspaceTableHeader>
          <WorkspaceTableBody>
            {rels.map((rel: any, idx: number) => (
              <WorkspaceTableRow key={rel.guid} className="transition-none hover:bg-transparent group/row">
                <WorkspaceTableCell className="px-4 py-1 text-[11px] text-text-muted border border-border-subtle group-hover:bg-bg-card">{idx + 1}</WorkspaceTableCell>
                <WorkspaceTableCell className="px-4 py-1 text-[13px] font-medium text-text-main border border-border-subtle group-hover:bg-bg-card">{rel.table_slug}</WorkspaceTableCell>
                <WorkspaceTableCell className="px-4 py-1 text-center border border-border-subtle group-hover:bg-bg-card">
                  <Controller
                    name={`tables.${tableIndex}.view_permissions.${idx}.view_permission`}
                    control={control}
                    render={({ field: f }) => (
                      <PermissionCheckbox checked={f.value} onCheckedChange={f.onChange} />
                    )}
                  />
                </WorkspaceTableCell>
              </WorkspaceTableRow>
            ))}
          </WorkspaceTableBody>
        </WorkspaceTable>
      </WorkspaceTableWrapper>
    )
  }

  if (type === 'view') {
    const views = table.table_view_permissions || []
    if (views.length === 0) return <p className="text-center text-text-muted text-sm py-8">{t('noViews')}</p>

    return (
      <WorkspaceTableWrapper>
        <WorkspaceTable>
          <WorkspaceTableHeader className="bg-bg-card">
            <WorkspaceTableRow className="transition-none hover:bg-transparent">
              <WorkspaceTableHead className="w-10 text-[10px] uppercase font-bold text-text-muted border border-border-subtle bg-bg-card">No</WorkspaceTableHead>
              <WorkspaceTableHead className="text-[10px] uppercase font-bold text-text-muted border border-border-subtle bg-bg-card">View Label</WorkspaceTableHead>
              <WorkspaceTableHead className="w-[80px] text-center text-[10px] uppercase font-bold text-text-muted border border-border-subtle bg-bg-card">{t('view')}</WorkspaceTableHead>
              <WorkspaceTableHead className="w-[80px] text-center text-[10px] uppercase font-bold text-text-muted border border-border-subtle bg-bg-card">{t('update')}</WorkspaceTableHead>
              <WorkspaceTableHead className="w-[80px] text-center text-[10px] uppercase font-bold text-text-muted border border-border-subtle bg-bg-card">{t('delete')}</WorkspaceTableHead>
            </WorkspaceTableRow>
          </WorkspaceTableHeader>
          <WorkspaceTableBody>
            {views.map((v: any, idx: number) => (
              <WorkspaceTableRow key={v.guid} className="transition-none hover:bg-transparent group/row">
                <WorkspaceTableCell className="px-4 py-1 text-[11px] text-text-muted border border-border-subtle group-hover:bg-bg-card">{idx + 1}</WorkspaceTableCell>
                <WorkspaceTableCell className="px-4 py-1 text-[13px] font-medium text-text-main border border-border-subtle group-hover:bg-bg-card">{v.label || v.view_id.slice(0, 8)}</WorkspaceTableCell>
                <WorkspaceTableCell className="px-4 py-1 text-center border border-border-subtle group-hover:bg-bg-card">
                  <Controller name={`tables.${tableIndex}.table_view_permissions.${idx}.view`} control={control} render={({ field: f }) => (
                    <PermissionCheckbox checked={f.value} onCheckedChange={f.onChange} />
                  )} />
                </WorkspaceTableCell>
                <WorkspaceTableCell className="px-4 py-1 text-center border border-border-subtle group-hover:bg-bg-card">
                  <Controller name={`tables.${tableIndex}.table_view_permissions.${idx}.edit`} control={control} render={({ field: f }) => (
                    <PermissionCheckbox checked={f.value} onCheckedChange={f.onChange} />
                  )} />
                </WorkspaceTableCell>
                <WorkspaceTableCell className="px-4 py-1 text-center border border-border-subtle group-hover:bg-bg-card">
                  <Controller name={`tables.${tableIndex}.table_view_permissions.${idx}.delete`} control={control} render={({ field: f }) => (
                    <PermissionCheckbox checked={f.value} onCheckedChange={f.onChange} />
                  )} />
                </WorkspaceTableCell>
              </WorkspaceTableRow>
            ))}
          </WorkspaceTableBody>
        </WorkspaceTable>
      </WorkspaceTableWrapper>
    )
  }

  if (type === 'custom') {
    const custom = table.custom_permission || {}
    const keys = Object.keys(custom)

    const formatKey = (k: string) => k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

    return (
      <WorkspaceTableWrapper>
        <WorkspaceTable>
          <WorkspaceTableHeader className="bg-bg-card">
            <WorkspaceTableRow className="transition-none hover:bg-transparent">
              <WorkspaceTableHead className="w-10 text-[10px] uppercase font-bold text-text-muted border border-border-subtle bg-bg-card">No</WorkspaceTableHead>
              <WorkspaceTableHead className="text-[10px] uppercase font-bold text-text-muted border border-border-subtle bg-bg-card">Setting</WorkspaceTableHead>
              <WorkspaceTableHead className="w-[120px] text-center text-[10px] uppercase font-bold text-text-muted border border-border-subtle bg-bg-card">Permission</WorkspaceTableHead>
            </WorkspaceTableRow>
          </WorkspaceTableHeader>
          <WorkspaceTableBody>
            {keys.map((k, idx) => (
              <WorkspaceTableRow key={k} className="transition-none hover:bg-transparent group/row">
                <WorkspaceTableCell className="px-4 py-1 text-[11px] text-text-muted border border-border-subtle group-hover:bg-bg-card">{idx + 1}</WorkspaceTableCell>
                <WorkspaceTableCell className="px-4 py-1 text-[13px] font-medium text-text-main border border-border-subtle group-hover:bg-card">{formatKey(k)}</WorkspaceTableCell>
                <WorkspaceTableCell className="px-4 py-1 text-center border border-border-subtle group-hover:bg-bg-card">
                  <Controller
                    name={`tables.${tableIndex}.custom_permission.${k}`}
                    control={control}
                    render={({ field: f }) => (
                      <PermissionCheckbox
                        checked={f.value === 'Yes'}
                        onCheckedChange={(checked) => f.onChange(checked ? 'Yes' : 'No')}
                      />
                    )}
                  />
                </WorkspaceTableCell>
              </WorkspaceTableRow>
            ))}
          </WorkspaceTableBody>
        </WorkspaceTable>
      </WorkspaceTableWrapper>
    )
  }

  if (type === 'filter') {
    return (
      <div className="space-y-6">
        <FilterRows
          tableIndex={tableIndex}
          filterType={filterType}
          control={control}
          relationsData={relationsData}
          connectionsData={connectionsData}
          watch={watch}
        />
      </div>
    )
  }

  return null
}

const FilterRows = ({ tableIndex, filterType, control, relationsData, connectionsData, watch }: any) => {
  const t = useTranslations('widgets.permissionManage.tablePermissions')
  const tableSlug = watch(`tables.${tableIndex}.slug`)
  const { fields, append, remove } = useFieldArray({
    control,
    name: `tables.${tableIndex}.automatic_filters.${filterType}`
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-text-main uppercase tracking-tight">{t('automaticFilters')}</h4>
        <Button
          size="sm"
          onClick={() => append({
            custom_field: 'user_id',
            object_field: '',
            table_slug: tableSlug,
            not_use_in_tab: false
          })}
          className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg h-8 px-3"
        >
          <Plus size={14} className="mr-1.5" />
          {t('addFilter')}
        </Button>
      </div>

      <div className="space-y-3">
        {fields.map((field, idx) => (
          <div key={field.id} className="flex items-center gap-3 bg-bg-sidebar/30 p-4 rounded-2xl border border-border-subtle/40 group hover:border-primary/20 transition-all">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Target Object</label>
              <Controller
                control={control}
                name={`tables.${tableIndex}.automatic_filters.${filterType}.${idx}.custom_field`}
                render={({ field: f }) => (
                  <Select value={f.value} onValueChange={f.onChange}>
                    <SelectTrigger className="bg-bg-card border-border-subtle h-9 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {connectionsData?.map((c: any) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Source Relation</label>
              <Controller
                control={control}
                name={`tables.${tableIndex}.automatic_filters.${filterType}.${idx}.object_field`}
                render={({ field: f }) => (
                  <Select value={f.value} onValueChange={f.onChange}>
                    <SelectTrigger className="bg-bg-card border-border-subtle h-9 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {relationsData?.map((r: any) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="w-[100px] space-y-1.5 flex flex-col items-center justify-center">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest text-center">Not in tab</label>
              <Controller
                control={control}
                name={`tables.${tableIndex}.automatic_filters.${filterType}.${idx}.not_use_in_tab`}
                render={({ field: f }) => (
                  <Switch
                    checked={f.value}
                    onCheckedChange={f.onChange}
                    size="sm"
                  />
                )}
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => remove(idx)}
              className="mt-6 border-border-subtle hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 h-9 w-9 rounded-xl transition-all"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ))}

        {fields.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-border-subtle/40 rounded-3xl opacity-40">
            <Filter size={32} className="text-text-muted mb-2" />
            <p className="text-xs font-medium">{t('noFilters')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
