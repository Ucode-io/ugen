'use client'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Filter, Table as TableIcon, Zap, Link as LinkIcon, Eye, Settings2, ShieldCheck, ChevronRight } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/ui/table'
import { Button } from '@/shared/ui/ui/button'
import { cn } from '@/shared/lib/utils/cn'

const MOCK_DATA = [
  {
    label: "Роли",
    slug: "role",
    id: "1ab7fadc-1f2b-4934-879d-4e99772526ad",
    record_permissions: {
      read: "Yes",
      write: "Yes",
      update: "Yes",
      delete: "Yes",
      is_public: true
    },
    field_permissions: [
      { field_id: "c12adfef-2991-4c6a-9dff-b4ab8810f0df", view_permission: true, edit_permission: true, label: "Название роли", table_slug: "role" },
      { field_id: "3bb6863b-5024-4bfb-9fa0-6ed5bf8d2406", view_permission: true, edit_permission: true, label: "ID", table_slug: "role" },
      { field_id: "123cd75b-2da5-458f-8020-8176a18b54ce", view_permission: true, edit_permission: true, label: "IT'S RELATION", table_slug: "role" },
      { field_id: "cb677e25-ddb3-4a64-a0cd-5aa6653417ed", view_permission: true, edit_permission: true, label: "IT'S RELATION", table_slug: "role" },
      { field_id: "110055ac-75ab-4c1f-ae35-67098d1816a5", view_permission: true, edit_permission: true, label: "IT'S RELATION", table_slug: "role" },
      { field_id: "dd1cce54-2333-4556-97ab-3663c577a28c", view_permission: true, edit_permission: true, label: "Статус", table_slug: "role" }
    ],
    automatic_filters: {},
    custom_permission: {
      view_create: "Yes", share_modal: "Yes", settings: "Yes", automation: "Yes", language_btn: "Yes",
      pdf_action: "Yes", add_field: "Yes", add_filter: "Yes", field_filter: "Yes", fix_column: "Yes",
      tab_group: "Yes", columns: "Yes", group: "Yes", excel_menu: "Yes", search_button: "Yes"
    }
  }
]

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
      {checked && <div className="absolute inset-0 rounded-lg bg-white/10 animate-pulse pointer-events-none" />}
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
  <div className="flex flex-col items-center gap-1 group/action">
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="h-9 w-9 rounded-xl border border-transparent bg-transparent text-text-muted hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all duration-300"
    >
      <Icon size={18} strokeWidth={2} />
    </Button>
  </div>
)

export const TablePermissions = () => {
  const { control, setValue, getValues, watch } = useForm({
    defaultValues: {
      permissions: MOCK_DATA.map(p => ({
        ...p,
        record_permissions: {
          read: p.record_permissions.read === 'Yes',
          write: p.record_permissions.write === 'Yes',
          update: p.record_permissions.update === 'Yes',
          delete: p.record_permissions.delete === 'Yes',
          is_public: p.record_permissions.is_public
        }
      }))
    }
  })

  const [modalType, setModalType] = useState<string | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const permissions = watch('permissions')

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollLeft > 0)
  }

  const handleSelectAll = (field: string, checked: boolean) => {
    permissions.forEach((_, index) => {
      setValue(`permissions.${index}.record_permissions.${field}` as any, checked)
    })
  }

  const isAllSelected = (field: string) => {
    return permissions.every((p: any) => p.record_permissions[field])
  }

  return (
    <div className="w-full relative animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="px-6 py-4">
        <div className="rounded-2xl border border-border-subtle/60 bg-bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04),0_4px_20px_rgb(0,0,0,0.02)] overflow-hidden">
          <div onScroll={handleScroll} className="overflow-x-auto custom-scrollbar">
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
                {MOCK_DATA.map((row, index) => (
                  <TableRow key={row.id} className="group/row transition-colors hover:bg-primary/[0.01]">
                    {/* Fixed column */}
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
                      <Controller name={`permissions.${index}.record_permissions.read`} control={control} render={({ field }) => (
                        <CustomPermissionBadge label="READ" checked={field.value} onChange={field.onChange} hasFilter onFilterClick={() => setModalType('filter')} />
                      )} />
                    </TableCell>
                    <TableCell className="align-middle px-2">
                      <Controller name={`permissions.${index}.record_permissions.write`} control={control} render={({ field }) => (
                        <CustomPermissionBadge label="WRITE" checked={field.value} onChange={field.onChange} />
                      )} />
                    </TableCell>
                    <TableCell className="align-middle px-2">
                      <Controller name={`permissions.${index}.record_permissions.update`} control={control} render={({ field }) => (
                        <CustomPermissionBadge label="UPDATE" checked={field.value} onChange={field.onChange} />
                      )} />
                    </TableCell>
                    <TableCell className="align-middle px-2">
                      <Controller name={`permissions.${index}.record_permissions.delete`} control={control} render={({ field }) => (
                        <CustomPermissionBadge label="DELETE" checked={field.value} onChange={field.onChange} />
                      )} />
                    </TableCell>
                    <TableCell className="align-middle px-2">
                      <Controller name={`permissions.${index}.record_permissions.is_public`} control={control} render={({ field }) => (
                        <CustomPermissionBadge label="PUBLIC" checked={field.value} onChange={field.onChange} />
                      )} />
                    </TableCell>

                    <TableCell className="text-center align-middle">
                      <ActionButton icon={TableIcon} label="Fields" onClick={() => setModalType('field')} />
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      <ActionButton icon={Zap} label="Actions" onClick={() => setModalType('action')} />
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      <ActionButton icon={LinkIcon} label="Relations" onClick={() => setModalType('relation')} />
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      <ActionButton icon={Eye} label="Views" onClick={() => setModalType('view')} />
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      <ActionButton icon={Settings2} label="Custom" onClick={() => setModalType('custom')} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {modalType && (
        <div
          className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setModalType(null)}
        >
          <div
            className="bg-bg-card rounded-[24px] w-full max-w-lg overflow-hidden border border-white/5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 pb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-6 shadow-inner">
                <Settings2 className="text-primary" size={24} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-text-main mb-2">
                Configure {modalType.charAt(0).toUpperCase() + modalType.slice(1)} Settings
              </h2>
              <p className="text-text-muted text-[14px]">
                Customize how this permission behaves. Define granular visibility and interaction rules.
              </p>
            </div>

            <div className="p-8 pt-4 flex flex-col gap-6">
              <div className="h-[160px] rounded-2xl bg-bg-sidebar/30 border border-dashed border-border-subtle flex items-center justify-center shadow-inner">
                <span className="text-text-muted font-mono text-[10px] uppercase tracking-widest opacity-50">Settings Workspace Coming Soon</span>
              </div>

              <div className="flex justify-end items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setModalType(null)}
                  className="px-6 font-semibold"
                >
                  Discard
                </Button>
                <Button
                  onClick={() => setModalType(null)}
                  className="px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-[0_4px_12px_rgba(var(--primary-rgb),0.25)]"
                >
                  Save Configuration
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


