'use client'
import { useState } from 'react'
import {
  Plus,
  Loader2,
  Settings2
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
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input
} from '@/shared/ui'
import { CustomPermissionRow } from './custom-permission-row'
import { cn } from '@/shared/lib/utils/cn'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { DataLoadingState } from '@/shared/ui'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'

interface CustomPermissionsTableProps {
  projectId: string
  roleId: string
  clientTypeId: string
  control: any
  setValue: any
  watch: any
  isLoading: boolean
}

export const CustomPermissionsTable = ({
  projectId,
  roleId,
  clientTypeId,
  control,
  setValue,
  watch,
  isLoading
}: CustomPermissionsTableProps) => {
  const t = useTranslations('widgets.permissionManage.tablePermissions')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<any>(null)
  const [navPath, setNavPath] = useState<string>('')
  const [isScrolled, setIsScrolled] = useState(false)
  const queryClient = useQueryClient()

  const custom = watch('custom') || []

  const { register, handleSubmit: handleModalSubmit, reset: resetModal, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      description: ''
    }
  })

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollLeft > 0)
  }

  const handleUpdate = async (checked: boolean, field: string, item: any = {}) => {
    const value = checked ? "Yes" : "No"

    // Bulk update if no item passed (from header)
    if (!Object.keys(item).length) {
      const recursiveUpdate = (items: any[]): any[] => {
        return items?.map((el: any) => ({
          ...el,
          [field]: value,
          children: el.children ? recursiveUpdate(el.children) : el.children,
        }))
      }
      setValue("custom", recursiveUpdate(custom))
    }

    // Clean up the item payload
    const { children, _formPath, ...cleanItem } = item

    const payload: any = {
      ...cleanItem,
      role_id: roleId,
      client_type_id: clientTypeId,
      [field]: value,
    }

    // Fix: If parent_id is an empty string, remove it to avoid UUID syntax error
    if (payload.parent_id === "") {
      delete payload.parent_id
    }

    // Ensure custom_permission_id is present if updating a specific item
    if (Object.keys(item).length && !payload.custom_permission_id) {
      console.warn("Updating item without custom_permission_id", item)
    }

    try {
      await api.put('/v1/custom-permission/accesses', payload, {
        params: {
          client_type_id: clientTypeId,
          role_id: roleId,
        }
      })
    } catch (error) {
      toast.error("Failed to update permission")
      console.error("Update error:", error)
    }
  }

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        title: data.title,
        role_id: roleId,
        client_type_id: clientTypeId,
        attributes: {
          description: data.description,
          // nav_path links this custom permission to a sidebar item in the AI-generated
          // admin panel (the item's route path, e.g. "/users"). ugen pushes the role's
          // read flag into the generated app, which hides that nav item when read=No.
          ...(navPath.trim() ? { nav_path: navPath.trim() } : {}),
        },
        ...(selectedRow ? { parent_id: selectedRow.custom_permission_id } : {}),
      }
      return api.post('/v1/custom-permission', payload)
    },
    onSuccess: async () => {
      toast.success("Successfully added")
      setIsAddModalOpen(false)
      resetModal()
      setNavPath('')

      if (selectedRow) {
        // Fetch fresh children for the parent row
        try {
          const { data } = await api.get('/v1/custom-permission/accesses', {
            params: {
              role_id: roleId,
              client_type_id: clientTypeId,
              parent_id: selectedRow.custom_permission_id
            }
          })
          setValue(`${selectedRow._formPath}.children`, data.data?.permissions || data.permissions || [])
        } catch (error) {
          queryClient.invalidateQueries({ queryKey: ['custom-permissions'] })
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ['custom-permissions'] })
      }
    }
  })

  const onDeleteSuccess = (path: string) => {
    const pathParts = path.split(".")
    const indexToDelete = parseInt(pathParts.pop()!, 10)
    const parentPath = pathParts.join(".")

    const parentList = watch(parentPath)
    if (Array.isArray(parentList)) {
      const updatedList = parentList.filter((_, idx) => idx !== indexToDelete)
      setValue(parentPath, updatedList)
    }
  }

  if (isLoading) return <DataLoadingState message={t('fetching')} />

  return (
    <div className="w-full relative flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
      <WorkspaceTableWrapper className="border border-border-subtle/50 shadow-sm overflow-hidden rounded-[10px] max-w-[1100px]">
        <div onScroll={handleScroll} className="overflow-auto max-h-[calc(100vh-320px)] custom-scrollbar">
          <WorkspaceTable className="border-collapse w-full min-w-[1100px]">
            <WorkspaceTableHeader className="sticky top-0 z-50 bg-bg-card">
              <WorkspaceTableRow className="transition-none hover:bg-transparent">
                <WorkspaceTableHead rowSpan={2} className={cn(
                  "w-[300px] min-w-[300px] max-w-[300px] sticky left-0 z-50 border border-border-subtle border-t-0 border-l-0 bg-bg-card text-text-main font-bold align-middle px-6 transition-shadow duration-200",
                  isScrolled && "border-r-2"
                )}>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] tracking-tight font-medium uppercase text-text-muted">Permission Name</span>
                  </div>
                </WorkspaceTableHead>
                <WorkspaceTableHead colSpan={4} className="text-center border border-border-subtle border-t-0 bg-bg-card">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted/60">Rights Control</span>
                </WorkspaceTableHead>
                <WorkspaceTableHead rowSpan={2} className="text-center w-[90px] align-middle py-2 font-bold text-[10px] uppercase tracking-widest text-text-muted/70 border border-border-subtle border-t-0 bg-bg-card border-r-0">Action</WorkspaceTableHead>
              </WorkspaceTableRow>
              <WorkspaceTableRow className="transition-none hover:bg-transparent">
                {[
                  { label: 'READ', field: 'read' },
                  { label: 'WRITE', field: 'write' },
                  { label: 'UPDATE', field: 'update' },
                  { label: 'DELETE', field: 'delete' }
                ].map(({ label, field }) => (
                  <WorkspaceTableHead key={label} className={cn("w-[130px] text-center p-2 border border-border-subtle border-t-0 border-l-0 bg-bg-card")}>
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-bold text-text-muted/60 uppercase">{label}</span>
                    </div>
                  </WorkspaceTableHead>
                ))}
              </WorkspaceTableRow>
            </WorkspaceTableHeader>
            <WorkspaceTableBody>
              {custom?.map((item: any, index: number) => (
                <CustomPermissionRow
                  key={item.custom_permission_id || index}
                  item={item}
                  index={index}
                  name={`custom.${index}`}
                  level={0}
                  control={control}
                  setValue={setValue}
                  watch={watch}
                  activeRoleId={roleId}
                  activeClientTypeId={clientTypeId}
                  onDeleteSuccess={onDeleteSuccess}
                  onAddClick={(item, name) => {
                    setSelectedRow({ ...item, _formPath: name })
                    setNavPath('')
                    setIsAddModalOpen(true)
                  }}
                  onUpdate={handleUpdate}
                />
              ))}
              {(!custom || custom.length === 0) && (
                <WorkspaceTableRow>
                  <WorkspaceTableCell colSpan={6} className="py-10 text-center text-text-muted text-[13px]">
                    No custom permissions found.
                  </WorkspaceTableCell>
                </WorkspaceTableRow>
              )}
            </WorkspaceTableBody>
          </WorkspaceTable>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedRow(null)
            setNavPath('')
            setIsAddModalOpen(true)
          }}
          className="w-full flex items-center gap-2 px-6 py-2.5 border-t border-border-subtle/50 bg-bg-card hover:bg-primary/5 text-text-muted hover:text-primary transition-colors group/add"
        >
          <Plus size={14} />
          <span className="text-[12px] font-medium">Add Permission</span>
        </button>
      </WorkspaceTableWrapper>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-[400px] p-6 bg-bg-card border-border-subtle rounded-[24px]">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Settings2 className="text-primary" size={20} />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-text-main">
                {selectedRow ? "Add Child Permission" : "Add Custom Permission"}
              </DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={handleModalSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            {selectedRow && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest pl-1">Parent Permission</label>
                <Input disabled value={selectedRow.title} className="bg-bg-sidebar/50" />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest pl-1">Function Name</label>
              <Input
                placeholder="e.g. Export Reports"
                {...register('title', { required: true })}
                className={cn("bg-bg-sidebar border-border-subtle", errors.title && "border-destructive")}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest pl-1">Sidebar path (optional)</label>
              <Input
                placeholder="e.g. /users"
                value={navPath}
                onChange={(e) => setNavPath(e.target.value)}
                className="bg-bg-sidebar border-border-subtle"
              />
              <p className="text-[10px] text-text-muted/70 pl-1">
                The route path of a sidebar item in the AI-generated admin panel. Toggling READ
                hides/shows that item for this role.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest pl-1">Description</label>
              <Input
                placeholder="Briefly describe what this permission controls"
                {...register('description')}
                className="bg-bg-sidebar border-border-subtle"
              />
            </div>

            <div className="mt-6 pt-4 border-t border-border-subtle flex justify-end items-center gap-3">
              <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white px-8 rounded-xl font-bold"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 size={16} className="animate-spin mr-2" />}
                Add
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
