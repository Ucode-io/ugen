import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { GlobalPermissions } from './global-permissions'
import { ShieldAlert } from 'lucide-react'
import { TablePermissions } from './table-permissions'
import { useAuthStore } from '@/entities/session'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roleApi } from '@/entities/role/api/role-api'
import { clientTypeApi } from '@/entities/client-type'
import { cn } from '@/shared/lib/utils/cn'
import { useClientTypes } from '@/widgets/project-workspace/api/users'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, SubTabs } from '@/shared/ui'
import { Plus, List, Table, Loader2 } from 'lucide-react'

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

  const queryClient = useQueryClient()

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

      <div className="flex items-center gap-2 mb-5">
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

      <SubTabs
        options={[
          { id: 'global', label: 'Menu Permissions', icon: List },
          { id: 'table', label: 'Table Permissions', icon: Table }
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
              />
            )}
            {activeTab === 'global' && (
              <GlobalPermissions
                projectId={projectId}
                roleId={selectedRoleId}
                clientTypeId={selectedClientTypeId}
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

