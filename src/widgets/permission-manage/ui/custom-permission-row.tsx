'use client'
import { useState } from 'react'
import { Plus, ChevronRight, Trash2, Loader2 } from 'lucide-react'
import {
  WorkspaceTableRow,
  WorkspaceTableCell
} from '@/widgets/project-workspace/ui/workspace-table'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/lib/utils/cn'
import { api } from '@/shared/api'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'

const CustomPermissionBadge = ({
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

interface CustomPermissionRowProps {
  item: any
  index: number
  name: string
  level: number
  control: any
  setValue: any
  watch: any
  activeRoleId: string
  activeClientTypeId: string
  onDeleteSuccess: (name: string) => void
  onAddClick: (item: any, name: string) => void
  onUpdate: (checked: boolean, field: string, item: any) => void
}

export const CustomPermissionRow = ({
  item,
  index,
  name,
  level,
  control,
  setValue,
  watch,
  activeRoleId,
  activeClientTypeId,
  onDeleteSuccess,
  onAddClick,
  onUpdate
}: CustomPermissionRowProps) => {
  const [expanded, setExpanded] = useState(false)
  const [isLoadingChildren, setIsLoadingChildren] = useState(false)

  const children = watch(`${name}.children`)

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/v1/custom-permission/${item.custom_permission_id}`)
    },
    onSuccess: () => {
      toast.success("Successfully deleted")
      onDeleteSuccess(name)
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete")
    }
  })

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false)
      return
    }

    setExpanded(true)

    if (!children) {
      setIsLoadingChildren(true)
      try {
        const { data } = await api.get('/v1/custom-permission/accesses', {
          params: {
            role_id: activeRoleId,
            client_type_id: activeClientTypeId,
            parent_id: item.custom_permission_id
          }
        })
        setValue(`${name}.children`, data.data?.permissions || data.permissions || [])
      } catch (error) {
        toast.error("Failed to load children")
      } finally {
        setIsLoadingChildren(false)
      }
    }
  }

  const handleToggle = (checked: boolean, field: string) => {
    setValue(`${name}.${field}`, checked ? "Yes" : "No")
    onUpdate(checked, field, item)
  }

  const getChecked = (field: string) => watch(`${name}.${field}`) === 'Yes'

  return (
    <>
      <WorkspaceTableRow className="group/row transition-none hover:bg-transparent">
        <WorkspaceTableCell className="sticky left-0 bg-bg-card border-r border-border-subtle z-30 px-6 py-2 transition-shadow duration-200 group-hover:bg-bg-card min-w-[300px]">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
            <button
              onClick={handleExpand}
              className="p-1 hover:bg-bg-sidebar rounded-md transition-colors"
            >
              <ChevronRight
                size={16}
                className={cn("text-text-muted transition-transform", expanded && "rotate-90")}
              />
            </button>
            <span className="font-medium text-[13px] text-text-main tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
              {item.title}
            </span>
            {isLoadingChildren && <Loader2 size={14} className="animate-spin text-text-muted ml-2" />}

            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md text-text-muted hover:text-primary hover:bg-primary/5"
                onClick={() => onAddClick(item, name)}
              >
                <Plus size={14} />
              </Button>
            </div>
          </div>
        </WorkspaceTableCell>

        <WorkspaceTableCell className="align-middle px-2 py-1">
          <CustomPermissionBadge
            label="READ"
            checked={getChecked('read')}
            onChange={(checked) => handleToggle(checked, 'read')}
          />
        </WorkspaceTableCell>
        <WorkspaceTableCell className="align-middle px-2 py-1">
          <CustomPermissionBadge
            label="WRITE"
            checked={getChecked('write')}
            onChange={(checked) => handleToggle(checked, 'write')}
          />
        </WorkspaceTableCell>
        <WorkspaceTableCell className="align-middle px-2 py-1">
          <CustomPermissionBadge
            label="UPDATE"
            checked={getChecked('update')}
            onChange={(checked) => handleToggle(checked, 'update')}
          />
        </WorkspaceTableCell>
        <WorkspaceTableCell className="align-middle px-2 py-1">
          <CustomPermissionBadge
            label="DELETE"
            checked={getChecked('delete')}
            onChange={(checked) => handleToggle(checked, 'delete')}
          />
        </WorkspaceTableCell>

        <WorkspaceTableCell className="text-center align-middle px-2 py-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md text-text-muted hover:text-destructive hover:bg-destructive/5"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={16} />}
          </Button>
        </WorkspaceTableCell>
      </WorkspaceTableRow>

      {expanded && children?.map((child: any, i: number) => (
        <CustomPermissionRow
          key={child.custom_permission_id || i}
          item={child}
          index={i}
          name={`${name}.children.${i}`}
          level={level + 1}
          control={control}
          setValue={setValue}
          watch={watch}
          activeRoleId={activeRoleId}
          activeClientTypeId={activeClientTypeId}
          onDeleteSuccess={onDeleteSuccess}
          onAddClick={onAddClick}
          onUpdate={onUpdate}
        />
      ))}
    </>
  )
}
