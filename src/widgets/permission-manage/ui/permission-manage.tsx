import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ShieldAlert,
  Plus,
  Loader2,
  Pencil
} from 'lucide-react'
import { MenuPermissionsTable } from './menu-permissions-table'
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
  Input
} from '@/shared/ui'
import { ClientTypeModal } from '@/features/client-type-form/ui/client-type-modal'
import { api } from '@/shared/api'
import { toast } from 'sonner'

interface Props {
  projectId: string
}

export const PermissionManage = ({ projectId }: Props) => {
  const t = useTranslations('widgets.permissionManage')
  const [selectedClientTypeId, setSelectedClientTypeId] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<any | null>(null)
  const [newRoleName, setNewRoleName] = useState('')
  const [roleStatus, setRoleStatus] = useState(true)

  const [isClientTypeModalOpen, setIsClientTypeModalOpen] = useState(false)
  const [newClientTypeName, setNewClientTypeName] = useState('')
  const [editingClientType, setEditingClientType] = useState<any | null>(null)
  const [isEditClientTypeModalOpen, setIsEditClientTypeModalOpen] = useState(false)

  const queryClient = useQueryClient()
  const ucodeProjectId = useAuthStore(state => state.ucodeProjectId)

  // Fetch client types
  const { data: rawClientTypes } = useQuery({
    queryKey: ['client-types-full', projectId],
    queryFn: () => clientTypeApi.getClientTypes(projectId)
  })

  const clientTypesData = useMemo(() => rawClientTypes?.map((item: any) => ({
    label: item.name || item.label || 'Unknown',
    value: item.guid || item.value || item.id,
    raw: item
  })) || [], [rawClientTypes])

  const selectedClientType = clientTypesData.find((ct: any) => ct.value === selectedClientTypeId)

  // Auto-select first client type
  useEffect(() => {
    if (clientTypesData.length > 0 && !selectedClientTypeId) {
      setSelectedClientTypeId(clientTypesData[0].value)
    }
  }, [clientTypesData, selectedClientTypeId])

  // Fetch roles for this client type
  const { data: rolesData } = useQuery({
    queryKey: ['roles', selectedClientTypeId, projectId],
    queryFn: () => roleApi.getRoles(projectId, selectedClientTypeId),
    enabled: !!selectedClientTypeId && !!projectId
  })

  // Roles that belong to the selected user type. A role belongs to a user type
  // when its client_type_id matches the user type's guid (selectedClientTypeId).
  const filteredRoles = useMemo(
    () => (rolesData || []).filter(
      (role: any) => !selectedClientTypeId || role.client_type_id === selectedClientTypeId
    ),
    [rolesData, selectedClientTypeId]
  )

  const selectedRole = filteredRoles.find((role: any) => role.guid === selectedRoleId)

  // Reset role selection and auto-select first role when the filtered set changes
  useEffect(() => {
    setSelectedRoleId((currentRoleId) => {
      if (filteredRoles.length === 0) return ''
      const currentRoleStillExists = filteredRoles.some((role: any) => role.guid === currentRoleId)
      return currentRoleStillExists ? currentRoleId : filteredRoles[0].guid
    })
  }, [filteredRoles])

  // Fetch custom (menu) permissions for the selected role
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
        <h1 className="text-[22px] font-bold text-text-main mb-1">{t('permissions')}</h1>
        <p className="text-text-muted text-[13px]">{t('permissionsSubtitle')}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div className="w-[190px] space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            {t('userType')}
          </label>
          <Select value={selectedClientTypeId} onValueChange={setSelectedClientTypeId}>
            <SelectTrigger className="bg-bg-sidebar border-border-subtle h-8 text-[12px]">
              <SelectValue placeholder={t('selectUserType')} />
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
                      className="h-6 w-6 ml-auto mr-4 hover:bg-hover-bg rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
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
                  {t('addType')}
                </button>
              </div>
            </SelectContent>
          </Select>
        </div>

        <div className="w-[190px] space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            {t('roleLabel')}
          </label>
          <Select value={selectedRoleId} onValueChange={setSelectedRoleId} disabled={!selectedClientTypeId}>
            <SelectTrigger className="bg-bg-sidebar border-border-subtle h-8 text-[12px]">
              <SelectValue placeholder={t('selectRoleType')} />
            </SelectTrigger>
            <SelectContent>
              {filteredRoles?.map((role: any) => (
                <SelectItem
                  key={role.guid}
                  value={role.guid}
                  actions={
                    !role.is_system ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-auto mr-4 hover:bg-hover-bg rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
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
              {filteredRoles.length === 0 && (
                <div className="px-2 py-1.5 text-[12px] text-text-muted italic">{t('noRoles')}</div>
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
                  {t('createRoleBtn')}
                </button>
              </div>
            </SelectContent>
          </Select>
        </div>

        {(selectedClientType || selectedRole) && (
          <div className="min-h-8 rounded-lg border border-border-subtle/60 bg-bg-sidebar/40 px-3 py-1.5 text-[11px] text-text-muted">
            Permissions apply to{' '}
            <span className="font-semibold text-text-main">{selectedClientType?.label || 'selected type'}</span>
            {' / '}
            <span className="font-semibold text-text-main">{selectedRole?.name || 'selected role'}</span>
          </div>
        )}
      </div>

      <div className="min-h-125">
        {selectedRoleId ? (
          <MenuPermissionsTable
            projectId={projectId}
            roleId={selectedRoleId}
            clientTypeId={selectedClientTypeId}
            existingPermissions={customPermissions}
            isLoading={isCustomLoading}
          />
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
              <label className="text-sm font-medium text-text-main block ml-1">{t('roleNameLabel')}</label>
              <Input
                placeholder="e.g. Editor"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="bg-bg-sidebar border-border-subtle"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-bg-sidebar/50 border border-border-subtle">
              <span className="text-sm font-medium text-text-main">{t('statusLabel')}</span>
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
            <Button variant="ghost" onClick={() => setIsRoleModalOpen(false)}>{t('cancelBtn')}</Button>
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
            <DialogTitle>{t('createUserType')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-text-main mb-1.5 block">{t('typeName')}</label>
            <Input
              placeholder="e.g. Admin, Customer"
              value={newClientTypeName}
              onChange={(e) => setNewClientTypeName(e.target.value)}
              className="bg-bg-sidebar border-border-subtle"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsClientTypeModalOpen(false)}>{t('cancelBtn')}</Button>
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
