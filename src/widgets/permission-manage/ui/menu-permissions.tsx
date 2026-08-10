'use client'

import { useState } from 'react'
import { Control, Controller, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import {
  ShieldCheck,
  Loader2,
  ChevronRight,
  ChevronDown,
  Folder,
  Globe,
  Monitor
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
import { cn } from '@/shared/lib/utils/cn'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { DataLoadingState } from '@/shared/ui'
import { PermissionCheckbox } from './permission-checkbox'
import { useTranslations } from 'next-intl'

// --- Interfaces ---

interface MenuPermission {
  read: boolean
  write: boolean
  update: boolean
  delete: boolean
  menu_settings: boolean
  guid?: string
  menu_id?: string
  role_id?: string
  [key: string]: any
}

interface MenuItem {
  id: string
  label: string
  type: string
  parent_id: string
  permission: MenuPermission
  attributes: Record<string, any>
  children?: MenuItem[]
  icon?: string
  data?: {
    microfrontend?: { id: string }
    permission?: MenuPermission
    [key: string]: any
  }
}

interface FormSchema {
  menus: MenuItem[]
  [key: string]: any
}

interface MenuPermissionsProps {
  projectId: string
  roleId: string
  clientTypeId: string
  control: Control<any>
  setValue: UseFormSetValue<any>
  watch: UseFormWatch<any>
  isLoading: boolean
  changedMenus: any[]
  setChangedMenus: React.Dispatch<React.SetStateAction<any[]>>
}

// --- Components ---

const detectDuplicate = (
  app: MenuItem,
  checked: boolean,
  type: string,
  setChangedData: React.Dispatch<React.SetStateAction<any[]>>
) => {
  setChangedData((prev) => {
    const existingIdx = prev.findIndex((obj) => obj?.id === app?.id)
    // IMPORTANT: If we already have this menu in changedData, we should update THAT version
    // instead of the original 'app' from props, because it might have other unsaved changes.
    const baseItem = existingIdx > -1 ? prev[existingIdx] : app

    const updatedPermission = {
      ...(baseItem.permission || {}),
      [type]: checked,
    }

    const newItem = {
      ...baseItem,
      data: {
        ...(baseItem.data || {}),
        permission: updatedPermission,
      },
      permission: updatedPermission,
    }

    if (existingIdx > -1) {
      const next = [...prev]
      next[existingIdx] = newItem
      return next
    } else {
      return [...prev, newItem]
    }
  })
}

const PermissionBadge = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
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
  </div>
)

const MenuRow = ({
  menu,
  level = 0,
  control,
  setValue,
  roleId,
  projectId,
  path,
  isScrolled,
  changedMenus,
  setChangedMenus,
}: {
  menu: MenuItem;
  level?: number;
  control: Control<FormSchema>;
  setValue: UseFormSetValue<FormSchema>;
  roleId: string;
  projectId: string;
  path: string;
  isScrolled: boolean;
  changedMenus: any[];
  setChangedMenus: React.Dispatch<React.SetStateAction<any[]>>;
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const isFolder = menu.type === 'FOLDER'

  const { data: children, isLoading: isChildrenLoading } = useQuery({
    queryKey: ['menu-children', menu.id, roleId, projectId],
    queryFn: async () => {
      const { data } = await api.get('/v3/menus', {
        params: {
          parent_id: menu.id,
          role_id: roleId,
          "project-id": projectId
        }
      })
      const menus = (data.data.menus || []).map((child: any) => ({
        ...child,
        permission: child.permission || child.data?.permission || {
          read: false,
          write: false,
          update: false,
          delete: false,
          menu_settings: false
        }
      }))
      setValue(`${path}.children` as any, menus)
      return menus
    },
    enabled: isOpen && isFolder && (!menu.children || menu.children.length === 0),
    staleTime: 0,
    gcTime: 0,
  })

  const currentChildren = menu.children || children || []

  const getMenuIcon = () => {
    if (menu.type === 'FOLDER') return <Folder size={16} className="text-amber-500 fill-amber-500/20" />
    const hasMF = !!(menu.data?.microfrontend);
    if (hasMF) return <Monitor size={16} className="text-indigo-500" />
    return <Globe size={16} className="text-emerald-500" />
  }

  const handleChange = (checked: boolean, type: string, fieldOnChange: (val: boolean) => void) => {
    fieldOnChange(checked)
    detectDuplicate(menu, checked, type, setChangedMenus)
  }

  return (
    <>
      <WorkspaceTableRow className="group/row transition-none hover:bg-transparent">
        <WorkspaceTableCell className={cn(
          "w-[230px] min-w-[230px] max-w-[230px] sticky left-0 bg-bg-card border-r border-border-subtle z-30 px-6 py-2 transition-shadow duration-200 group-hover:bg-bg-card",
          isScrolled && "border-r-2 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"
        )}>
          <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
            <div className="flex items-center gap-1.5 min-w-[30px]">
              {isFolder ? (
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  className="p-1 rounded hover:bg-bg-sidebar text-text-muted transition-colors outline-none border-none bg-transparent"
                >
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : <div className="w-6" />}
              {getMenuIcon()}
            </div>
            <span className="font-medium text-[13px] text-text-main group-hover:text-primary transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
              {menu.label}
            </span>
            {isChildrenLoading && <Loader2 size={12} className="animate-spin text-primary/40 ml-auto" />}
          </div>
        </WorkspaceTableCell>

        {['read', 'write', 'update', 'delete', 'menu_settings'].map((perm) => (
          <WorkspaceTableCell key={perm} className="text-center align-middle px-2 py-1 min-w-[130px]">
            <Controller
              name={`${path}.permission.${perm}` as any}
              control={control}
              render={({ field }) => (
                <PermissionBadge
                  label={perm === 'menu_settings' ? 'SETTINGS' : perm.toUpperCase()}
                  checked={field.value}
                  onChange={(checked) => handleChange(checked, perm, field.onChange)}
                />
              )}
            />
          </WorkspaceTableCell>
        ))}
      </WorkspaceTableRow>

      {isOpen && currentChildren.map((child: MenuItem, index: number) => (
        <MenuRow
          key={child.id}
          menu={child}
          level={level + 1}
          control={control}
          setValue={setValue}
          roleId={roleId}
          projectId={projectId}
          path={`${path}.children.${index}`}
          isScrolled={isScrolled}
          changedMenus={changedMenus}
          setChangedMenus={setChangedMenus}
        />
      ))}
    </>
  )
}

export const MenuPermissions = ({
  projectId,
  roleId,
  control,
  setValue,
  watch,
  isLoading,
  changedMenus,
  setChangedMenus
}: MenuPermissionsProps) => {
  const t = useTranslations('widgets.permissionManage')
  const [isScrolled, setIsScrolled] = useState(false)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollLeft > 0)
  }

  const handleSelectAll = (type: keyof MenuPermission, checked: boolean) => {
    const currentMenus = watch('menus') || []

    // We need to build the full list of changes in one go because setChangedMenus
    // is asynchronous and depends on the previous state.
    setChangedMenus((prev) => {
      const next = [...prev]

      const updateRecursive = (items: MenuItem[]) => {
        items.forEach((item) => {
          const existingIdx = next.findIndex(m => m.id === item.id)
          const currentItem = existingIdx > -1 ? next[existingIdx] : item

          const updatedPermission = {
            ...(currentItem.permission || {}),
            [type]: checked,
          }

          const newItem = {
            ...currentItem,
            data: {
              ...(currentItem.data || {}),
              permission: updatedPermission,
            },
            permission: updatedPermission,
          }

          if (existingIdx > -1) {
            next[existingIdx] = newItem
          } else {
            next.push(newItem)
          }

          if (item.children && item.children.length > 0) {
            updateRecursive(item.children)
          }
        })
      }

      updateRecursive(currentMenus)
      return next
    })

    // Still update the form values for UI reactivity
    const updateFormRecursive = (items: MenuItem[], pathDir: string) => {
      items.forEach((item, index) => {
        setValue(`${pathDir}.${index}.permission.${type}` as any, checked)
        if (item.children && item.children.length > 0) {
          updateFormRecursive(item.children, `${pathDir}.${index}.children`)
        }
      })
    }
    updateFormRecursive(currentMenus, 'menus')
  }

  const isAllSelected = (field: keyof MenuPermission) => {
    const menus = watch('menus') || []
    if (menus.length === 0) return false

    let allChecked = true
    const checkAll = (items: MenuItem[]) => {
      for (const item of items) {
        if (!item.permission?.[field]) {
          allChecked = false
          return
        }
        if (item.children) checkAll(item.children)
      }
    }
    checkAll(menus)
    return allChecked
  }

  if (isLoading) return <DataLoadingState message="Fetching menu permissions..." />

  const menus = watch('menus') || []

  return (
    <div className="w-full relative flex flex-col p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <span className="text-sm font-bold text-text-main uppercase tracking-tight">{t('menuPermissions')}</span>
      </div>

      <WorkspaceTableWrapper className="border border-border-subtle/50 shadow-sm overflow-hidden rounded-[16px] max-w-[1100px]">
        <div onScroll={handleScroll} className="overflow-auto max-h-[calc(100vh-320px)] custom-scrollbar">
          <WorkspaceTable className="border-collapse w-full min-w-[1000px]">
            <WorkspaceTableHeader className="sticky top-0 z-50 bg-bg-card">
              <WorkspaceTableRow className="transition-none hover:bg-transparent">
                <WorkspaceTableHead rowSpan={2} className={cn(
                  "w-[230px] min-w-[230px] max-w-[230px] sticky left-0 z-50 border border-border-subtle border-t-0 border-l-0 bg-bg-card text-text-main font-bold align-middle px-6 transition-shadow duration-200",
                  isScrolled && "border-r-2 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"
                )}>
                  <span className="text-[12px] tracking-tight font-medium uppercase text-text-muted">{t('menuObjects')}</span>
                </WorkspaceTableHead>
                <WorkspaceTableHead colSpan={5} className="text-center border border-border-subtle border-t-0 bg-bg-card">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted/60">{t('accessPermissions')}</span>
                </WorkspaceTableHead>
              </WorkspaceTableRow>
              <WorkspaceTableRow className="transition-none hover:bg-transparent">
                {['read', 'write', 'update', 'delete', 'menu_settings'].map((type) => (
                  <WorkspaceTableHead key={type} className="w-[130px] text-center p-2 border border-border-subtle border-t-0 border-l-0 bg-bg-card">
                    <div className="flex flex-col items-center gap-1.5">
                      <PermissionCheckbox 
                        checked={isAllSelected(type as keyof MenuPermission)}
                        onCheckedChange={(checked) => handleSelectAll(type as keyof MenuPermission, checked)}
                      />
                    </div>
                  </WorkspaceTableHead>
                ))}
              </WorkspaceTableRow>
            </WorkspaceTableHeader>
            <WorkspaceTableBody>
              {menus.map((menu: MenuItem, index: number) => (
                <MenuRow
                  key={menu.id}
                  menu={menu}
                  control={control}
                  setValue={setValue}
                  roleId={roleId}
                  projectId={projectId}
                  path={`menus.${index}`}
                  isScrolled={isScrolled}
                  changedMenus={changedMenus}
                  setChangedMenus={setChangedMenus}
                />
              ))}
            </WorkspaceTableBody>
          </WorkspaceTable>
        </div>
      </WorkspaceTableWrapper>
    </div>
  )
}
