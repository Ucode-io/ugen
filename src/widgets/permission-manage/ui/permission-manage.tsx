import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { GlobalPermissions } from './global-permissions'
import { MenuPermissions } from './menu-permissions'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { TablePermissions } from './table-permissions'
import { useAuthStore } from '@/entities/session'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roleApi } from '@/entities/role/api/role-api'
import { clientTypeApi } from '@/entities/client-type'
import { cn } from '@/shared/lib/utils/cn'
import { useClientTypes } from '@/widgets/project-workspace/api/users'
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
  SubTabs
} from '@/shared/ui'
import { Plus, List, Table, Loader2, Save, ShieldCheck as ShieldCheckIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { authApi, api } from '@/shared/api'
import { toast } from 'sonner'

interface PermissionForm {
  tables: any[]
  menus: any[]
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
  const [newRoleName, setNewRoleName] = useState('')
  const [isClientTypeModalOpen, setIsClientTypeModalOpen] = useState(false)
  const [newClientTypeName, setNewClientTypeName] = useState('')
  const [changedMenus, setChangedMenus] = useState<any[]>([])

  const queryClient = useQueryClient()
  const ucodeProjectId = useAuthStore(state => state.ucodeProjectId)

  const formMethods = useForm<PermissionForm>({
    defaultValues: {
      tables: [],
      menus: [],
      global_permission: {}
    }
  })
  const { control, handleSubmit, reset, watch, setValue } = formMethods

  // Fetch client types
  const { data: clientTypesData } = useClientTypes(projectId)

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
    enabled: !!ucodeProjectId && !!selectedRoleId
  })

  useEffect(() => {
    if (permissionDetail && rootMenus) {
      reset({
        ...permissionDetail,
        tables: permissionDetail.tables.map((t: any) => ({
          ...t,
          automatic_filters: {
            read: t.automatic_filters?.read || [],
            write: t.automatic_filters?.write || [],
          },
          record_permissions: {
            ...t.record_permissions,
            read: t.record_permissions.read === 'Yes',
            write: t.record_permissions.write === 'Yes',
            update: t.record_permissions.update === 'Yes',
            delete: t.record_permissions.delete === 'Yes',
          }
        })),
        menus: rootMenus
      })
    }
  }, [permissionDetail, rootMenus, reset])

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
      toast.success("All permissions saved successfully")
      setChangedMenus([])
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save permissions")
    }
  })

  const createRoleMutation = useMutation({
    mutationFn: (name: string) => roleApi.createRole(projectId, {
      project_id: projectId,
      client_type_id: selectedClientTypeId,
      name,
      status: true
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', selectedClientTypeId, projectId] })
      setIsRoleModalOpen(false)
      setNewRoleName('')
    }
  })

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

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 max-w-[240px] space-y-1.5">
          <label className="text-[12px] font-medium text-text-muted block">User Type</label>
          <Select value={selectedClientTypeId} onValueChange={setSelectedClientTypeId}>
            <SelectTrigger className="bg-bg-sidebar border-border-subtle h-9">
              <SelectValue placeholder="Select user type" />
            </SelectTrigger>
            <SelectContent>
              {clientTypesData?.map((ct: any) => (
                <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="pt-5">
          <Button
            onClick={() => setIsClientTypeModalOpen(true)}
            variant="outline"
            className="h-9 px-3 rounded-lg text-[13px] border-border-subtle"
          >
            <Plus size={14} className="mr-1.5" />
            Add Type
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          <div className="flex border border-border-subtle rounded-lg overflow-hidden bg-bg-card h-8">
            {rolesData?.map((role: any) => (
              <button
                key={role.guid}
                onClick={() => setSelectedRoleId(role.guid)}
                className={cn(
                  "px-4 py-1 text-[12px] font-medium transition-all border-r border-border-subtle last:border-r-0 outline-none cursor-pointer flex items-center justify-center",
                  selectedRoleId === role.guid
                    ? "bg-primary/10 text-primary font-semibold"
                    : "bg-transparent text-text-muted hover:bg-bg-sidebar hover:text-text-main"
                )}
              >
                {role.name}
              </button>
            ))}
            {(!rolesData || rolesData.length === 0) && (
              <div className="px-4 py-2 text-[12px] text-text-muted italic flex items-center">No roles</div>
            )}
          </div>
          <Button
            onClick={() => setIsRoleModalOpen(true)}
            disabled={!selectedClientTypeId}
            className="bg-primary hover:bg-primary/90 text-white h-8 px-3 rounded-lg text-[13px] font-medium ml-1"
          >
            <Plus size={14} className="mr-1.5" />
            Create Role
          </Button>
        </div>

        {selectedRoleId && (
          <Button
            disabled={saveAllMutation.isPending || isDetailLoading || isMenusLoading}
            onClick={handleSubmit((d) => saveAllMutation.mutate(d))}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 h-9"
          >
            {saveAllMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
            Save Changes
          </Button>
        )}
      </div>

      <SubTabs
        options={[
          { id: 'table', label: 'Table Permissions', icon: Table },
          { id: 'menu', label: 'Menu Permissions', icon: List },
          // { id: 'global', label: 'Global Permissions', icon: ShieldCheckIcon },
        ]}
        activeId={activeTab}
        onTabChange={setActiveTab}
        containerClassName="px-0"
      />

      <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden min-h-[500px]">
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

      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-text-main mb-1.5 block">Role Name</label>
            <Input
              placeholder="e.g. Editor"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="bg-bg-sidebar border-border-subtle"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRoleModalOpen(false)}>Cancel</Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={!newRoleName.trim() || createRoleMutation.isPending}
              onClick={() => createRoleMutation.mutate(newRoleName.trim())}
            >
              {createRoleMutation.isPending && <Loader2 size={16} className="animate-spin mr-2" />}
              Create
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
    </div>
  )
}
