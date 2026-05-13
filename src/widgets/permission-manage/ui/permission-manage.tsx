import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { GlobalPermissions } from './global-permissions'
import { MenuPermissions } from './menu-permissions'
import {
  ShieldAlert,
  List,
  Plus,
  Table,
  Loader2,
  Save,
  Pencil
} from 'lucide-react'
import { TablePermissions } from './table-permissions'
import { CustomPermissionsTable } from './custom-permissions-table'
import { useAuthStore } from '@/entities/session'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roleApi } from '@/entities/role/api/role-api'
import { clientTypeApi } from '@/entities/client-type'
import { cn } from '@/shared/lib/utils/cn'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  ReusableTabs
} from '@/shared/ui'
import { ClientTypeModal } from '@/features/client-type-form/ui/client-type-modal'
import { useForm } from 'react-hook-form'
import { authApi, api } from '@/shared/api'
import { toast } from 'sonner'

interface PermissionForm {
  tables: any[]
  menus: any[]
  custom: any[]
  global_permission: any
  [key: string]: any
}

interface Props {
  projectId: string
}

export const PermissionManage = ({ projectId }: Props) => {
  const t = useTranslations('widgets.permissionManage')
  const [activeTab, setActiveTab] = useState('table')
  const [selectedClientTypeId, setSelectedClientTypeId] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<any | null>(null)
  const [newRoleName, setNewRoleName] = useState('')
  const [roleStatus, setRoleStatus] = useState(true)

  const [isClientTypeModalOpen, setIsClientTypeModalOpen] = useState(false)
  const [newClientTypeName, setNewClientTypeName] = useState('')
  const [changedMenus, setChangedMenus] = useState<any[]>([])
  const [editingClientType, setEditingClientType] = useState<any | null>(null)
  const [isEditClientTypeModalOpen, setIsEditClientTypeModalOpen] = useState(false)

  const queryClient = useQueryClient()
  const ucodeProjectId = useAuthStore(state => state.ucodeProjectId)

  const formMethods = useForm<PermissionForm>({
    defaultValues: {
      tables: [],
      menus: [],
      custom: [],
      global_permission: {}
    }
  })
  const { control, handleSubmit, reset, watch, setValue } = formMethods

  // Fetch client types
  const { data: rawClientTypes } = useQuery({
    queryKey: ['client-types-full', projectId],
    queryFn: () => clientTypeApi.getClientTypes(projectId)
  })

  const clientTypesData = rawClientTypes?.map((item: any) => ({
    label: item.name || item.label || 'Unknown',
    value: item.guid || item.value || item.id,
    raw: item
  }))

  // Auto-select first client type
  useEffect(() => {
    if (clientTypesData && clientTypesData.length > 0 && !selectedClientTypeId) {
      setSelectedClientTypeId(clientTypesData[0].value)
    }
  }, [clientTypesData, selectedClientTypeId])

  // Fetch roles for this client type
  const { data: rolesData } = useQuery({
    queryKey: ['roles', selectedClientTypeId, projectId],
    queryFn: () => roleApi.getRoles(projectId, selectedClientTypeId),
    enabled: !!selectedClientTypeId && !!projectId
  })

  // Reset role selection and auto-select first role on client type change
  useEffect(() => {
    if (rolesData && rolesData.length > 0) {
      setSelectedRoleId(rolesData[0].guid)
    } else {
      setSelectedRoleId('')
    }
  }, [rolesData])

  // Fetch detailed permissions (tables + global)
  const { data: permissionDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['permissions-detail', ucodeProjectId, selectedRoleId],
    queryFn: async () => {
      const { data } = await authApi.get(`/v2/role-permission/detailed/${ucodeProjectId}/${selectedRoleId}`, {
        params: { 'project-id': ucodeProjectId }
      })
      return data.data.data
    },
    enabled: !!ucodeProjectId && !!selectedRoleId
  })

  // Fetch custom permissions
  const { data: customPermissions, isLoading: isCustomLoading } = useQuery({
    queryKey: ['custom-permissions', selectedRoleId, selectedClientTypeId],
    queryFn: async () => {
      const { data } = await api.get('/v1/custom-permission/accesses', {
        params: {
          role_id: selectedRoleId,
          client_type_id: selectedClientTypeId,
          'project-id': ucodeProjectId
        }
      })
      return data.data?.permissions || data.permissions || []
    },
    enabled: !!ucodeProjectId && !!selectedRoleId && !!selectedClientTypeId
  })

  // Fetch menus
  const { data: rootMenus, isLoading: isMenusLoading } = useQuery({
    queryKey: ['menus-root', ucodeProjectId, selectedRoleId],
    queryFn: async () => {
      const { data } = await api.get('/v3/menus', {
        params: {
          parent_id: "c57eedc3-a954-4262-a0af-376c65b5a284",
          role_id: selectedRoleId,
          'project-id': ucodeProjectId
        }
      })
      return (data.data.menus || []).map((m: any) => ({
        ...m,
        permission: m.permission || m.data?.permission || {
          read: false,
          write: false,
          update: false,
          delete: false,
          menu_settings: false
        }
      }))
    },
    enabled: !!ucodeProjectId && !!selectedRoleId,
    staleTime: 0
  })

  useEffect(() => {
      reset({
        ...permissionDetail,
        tables: permissionDetail?.tables?.map((t: any) => ({
          ...(t || {}),
          automatic_filters: {
            read: t?.automatic_filters?.read || [],
            write: t?.automatic_filters?.write || [],
          },
          record_permissions: {
            ...t?.record_permissions,
            read: t?.record_permissions?.read === 'Yes',
            write: t?.record_permissions?.write === 'Yes',
            update: t?.record_permissions?.update === 'Yes',
            delete: t?.record_permissions?.delete === 'Yes',
          }
        })),
        menus: rootMenus || [],
        custom: customPermissions || []
      })
  }, [permissionDetail, rootMenus, customPermissions, reset])

  const saveAllMutation = useMutation({
    mutationFn: async (formData: PermissionForm) => {
      // 1. Update Table/Global permissions
      const detailedPayload = {
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
        role_id: selectedRoleId
      }

      // 2. Update Menu permissions
      const menuPayload = {
        menus: changedMenus,
        project_id: ucodeProjectId,
        role_id: selectedRoleId
      }

      await Promise.all([
        authApi.put('/v2/role-permission/detailed', detailedPayload, {
          params: { 'project-id': ucodeProjectId }
        }),
        authApi.put('/v2/menu-permission/detailed', menuPayload, {
          params: { 'project-id': ucodeProjectId }
        })
      ])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions-detail'] })
      queryClient.invalidateQueries({ queryKey: ['menus-root'] })
      queryClient.invalidateQueries({ queryKey: ['custom-permissions'] })
      toast.success("All permissions saved successfully")
      setChangedMenus([])
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save permissions")
    }
  })

  const saveRoleMutation = useMutation({
    mutationFn: (data: { name: string, status: boolean, guid?: string }) => {
      if (editingRole) {
        return roleApi.updateRole(projectId, {
          data: {
            ...editingRole,
            name: data.name,
            status: data.status,
            'project-id': projectId
          }
        })
      }
      return roleApi.createRole(projectId, {
        project_id: projectId,
        client_type_id: selectedClientTypeId,
        name: data.name,
        status: data.status
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', selectedClientTypeId, projectId] })
      setIsRoleModalOpen(false)
      setNewRoleName('')
      setEditingRole(null)
      toast.success(editingRole ? "Role updated" : "Role created")
    }
  })

  useEffect(() => {
    if (isRoleModalOpen) {
      if (editingRole) {
        setNewRoleName(editingRole.name)
        setRoleStatus(editingRole.status)
      } else {
        setNewRoleName('')
        setRoleStatus(true)
      }
    }
  }, [isRoleModalOpen, editingRole])

  const createClientTypeMutation = useMutation({
    mutationFn: (name: string) => clientTypeApi.createClientType(projectId, {
      data: {
        name,
        project_id: projectId,
        "project-id": projectId,
        default_page: '',
        self_recover: false,
        self_register: false,
        table_slug: name.toLowerCase().replace(/\s+/g, '_'),
        columns: [],
        session_limit: 1,
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-types-workspace', projectId] })
      setIsClientTypeModalOpen(false)
      setNewClientTypeName('')
    }
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-text-main mb-1">Permissions</h1>
        <p className="text-text-muted text-[13px]">Configure user type permissions by menu pages and tables</p>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <div className="w-[150px]">
          <Select value={selectedClientTypeId} onValueChange={setSelectedClientTypeId}>
            <SelectTrigger className="bg-bg-sidebar border-border-subtle h-8 text-[12px]">
              <SelectValue placeholder="Select user type" />
            </SelectTrigger>
            <SelectContent>
              {clientTypesData?.map((ct: any) => (
                <SelectItem
                  key={ct.value}
                  value={ct.value}
                  actions={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto mr-4 hover:bg-hover-bg rounded-md opacity-40 group-hover:opacity-100 transition-opacity"
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setEditingClientType(ct.raw)
                        setIsEditClientTypeModalOpen(true)
                      }}
                    >
                      <Pencil size={12} className="text-text-muted" />
                    </Button>
                  }
                >
                  <span className="truncate">{ct.label}</span>
                </SelectItem>
              ))}
              <div className="border-t border-border-subtle/50 mt-1 pt-1 px-1">
                <button
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-[13px] text-text-muted hover:text-text-main hover:bg-bg-sidebar rounded-md transition-colors"
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setIsClientTypeModalOpen(true)
                  }}
                >
                  <Plus size={13} />
                  Add Type
                </button>
              </div>
            </SelectContent>
          </Select>
        </div>

        <div className="w-[150px]">
          <Select value={selectedRoleId} onValueChange={setSelectedRoleId} disabled={!selectedClientTypeId}>
            <SelectTrigger className="bg-bg-sidebar border-border-subtle h-8 text-[12px]">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {rolesData?.map((role: any) => (
                <SelectItem
                  key={role.guid}
                  value={role.guid}
                  actions={
                    !role.is_system ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-auto mr-4 hover:bg-hover-bg rounded-md opacity-40 group-hover:opacity-100 transition-opacity"
                        onPointerDown={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          setEditingRole(role)
                          setIsRoleModalOpen(true)
                        }}
                      >
                        <Pencil size={12} className="text-text-muted" />
                      </Button>
                    ) : undefined
                  }
                >
                  <span className="truncate">{role.name}</span>
                </SelectItem>
              ))}
              {(!rolesData || rolesData.length === 0) && (
                <div className="px-2 py-1.5 text-[12px] text-text-muted italic">No roles yet</div>
              )}
              <div className="border-t border-border-subtle/50 mt-1 pt-1 px-1">
                <button
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-[13px] text-text-muted hover:text-text-main hover:bg-bg-sidebar rounded-md transition-colors"
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setEditingRole(null)
                    setIsRoleModalOpen(true)
                  }}
                >
                  <Plus size={13} />
                  Create Role
                </button>
              </div>
            </SelectContent>
          </Select>
        </div>

      </div>

      <div className="flex items-center justify-between">
        <ReusableTabs
          options={[
            { id: 'table', label: 'Table Permissions', icon: <Table size={16} /> },
            { id: 'custom', label: 'Custom Permissions', icon: <List size={16} /> },
          ]}
          activeId={activeTab}
          onTabChange={setActiveTab}
          className="w-fit"
        />
        {selectedRoleId && (
          <Button
            disabled={saveAllMutation.isPending || isDetailLoading || isMenusLoading || isCustomLoading}
            onClick={handleSubmit((d) => saveAllMutation.mutate(d))}
            className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 h-8 text-[13px]"
          >
            {saveAllMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Save size={14} className="mr-1.5" />}
            Save Changes
          </Button>
        )}
      </div>

      <div className="min-h-125">
        {selectedRoleId ? (
          <>
            {activeTab === 'table' && (
              <TablePermissions
                projectId={projectId}
                roleId={selectedRoleId}
                clientTypeId={selectedClientTypeId}
                control={control}
                setValue={setValue}
                watch={watch}
                isLoading={isDetailLoading}
              />
            )}
            {activeTab === 'custom' && (
              <CustomPermissionsTable
                projectId={projectId}
                roleId={selectedRoleId}
                clientTypeId={selectedClientTypeId}
                control={control}
                setValue={setValue}
                watch={watch}
                isLoading={isCustomLoading}
              />
            )}
            {activeTab === 'menu' && (
              <MenuPermissions
                projectId={projectId}
                roleId={selectedRoleId}
                clientTypeId={selectedClientTypeId}
                control={control}
                setValue={setValue}
                watch={watch}
                isLoading={isMenusLoading}
                changedMenus={changedMenus}
                setChangedMenus={setChangedMenus}
              />
            )}
            {activeTab === 'global' && (
              <GlobalPermissions
                projectId={projectId}
                roleId={selectedRoleId}
                clientTypeId={selectedClientTypeId}
                control={control}
                isLoading={isDetailLoading}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-20 text-text-muted">
            <ShieldAlert className="w-12 h-12 mb-4 opacity-20" />
            <p>{t('selectRolePlaceholder')}</p>
          </div>
        )}
      </div>

      <Dialog open={isRoleModalOpen} onOpenChange={(open) => {
        setIsRoleModalOpen(open)
        if (!open) setEditingRole(null)
      }}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create New Role"}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-main block ml-1">Role Name</label>
              <Input
                placeholder="e.g. Editor"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="bg-bg-sidebar border-border-subtle"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-bg-sidebar/50 border border-border-subtle">
              <span className="text-sm font-medium text-text-main">Status</span>
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-bold uppercase", roleStatus ? "text-green-500" : "text-text-muted")}>
                  {roleStatus ? "Active" : "Inactive"}
                </span>
                <button
                  type="button"
                  onClick={() => setRoleStatus(!roleStatus)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none",
                    roleStatus ? "bg-primary" : "bg-border-subtle"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
                      roleStatus ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRoleModalOpen(false)}>Cancel</Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={!newRoleName.trim() || saveRoleMutation.isPending}
              onClick={() => saveRoleMutation.mutate({ name: newRoleName.trim(), status: roleStatus })}
            >
              {saveRoleMutation.isPending && <Loader2 size={16} className="animate-spin mr-2" />}
              {editingRole ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isClientTypeModalOpen} onOpenChange={setIsClientTypeModalOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create User Type</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-text-main mb-1.5 block">Type Name</label>
            <Input
              placeholder="e.g. Admin, Customer"
              value={newClientTypeName}
              onChange={(e) => setNewClientTypeName(e.target.value)}
              className="bg-bg-sidebar border-border-subtle"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsClientTypeModalOpen(false)}>Cancel</Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={!newClientTypeName.trim() || createClientTypeMutation.isPending}
              onClick={() => createClientTypeMutation.mutate(newClientTypeName.trim())}
            >
              {createClientTypeMutation.isPending && <Loader2 size={16} className="animate-spin mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ClientTypeModal
        open={isEditClientTypeModalOpen}
        onOpenChange={setIsEditClientTypeModalOpen}
        projectId={projectId}
        initialData={editingClientType}
      />
    </div>
  )
}
