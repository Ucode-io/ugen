import { useEffect, useState } from 'react'
import { ReusableTabs } from '@/shared/ui/tabs'
import { GlobalPermissions } from './global-permissions'
import { ShieldAlert, Shield } from 'lucide-react'
import { TablePermissions } from './table-permissions'
import { useAuthStore } from '@/entities/session'
import { useQuery } from '@tanstack/react-query'
import { roleApi } from '@/entities/role/api/role-api'
import { cn } from '@/shared/lib/utils/cn'

interface Props {
  clientTypeId: string
  projectId: string
}

export const PermissionManage = ({ clientTypeId, projectId }: Props) => {

  const [activeTab, setActiveTab] = useState('table')
  const [selectedRoleId, setSelectedRoleId] = useState('')

  // Fetch roles for this client type
  const { data: rolesData } = useQuery({
    queryKey: ['roles', clientTypeId, projectId],
    queryFn: () => roleApi.getRoles(projectId, clientTypeId),
    enabled: !!clientTypeId && !!projectId
  })

  // Reset role selection and auto-select first role on client type change
  useEffect(() => {
    if (rolesData?.length > 0) {
      setSelectedRoleId(rolesData[0].guid)
    } else {
      setSelectedRoleId('')
    }
  }, [rolesData])

  const tabs = [
    { id: 'table', label: 'Table permission' },
    { id: 'global', label: 'Global permission' }
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-text-main to-text-muted bg-clip-text text-transparent flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            Permission Management
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Manage table records and global accessibility for this client type.
          </p>
        </div>
        <ReusableTabs options={tabs} activeId={activeTab} onTabChange={setActiveTab} size="md" />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Select Role</p>
        <div className="flex items-center gap-2 flex-wrap pb-1">
          {rolesData?.map((role: any) => (
            <button
              key={role.guid}
              onClick={() => setSelectedRoleId(role.guid)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border flex items-center gap-2",
                selectedRoleId === role.guid
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-bg-sidebar text-text-muted border-border-subtle hover:bg-hover-bg hover:text-text-main'
              )}
            >
              <Shield size={12} className={cn(selectedRoleId === role.guid ? "text-white" : "text-text-muted")} />
              {role.name}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden min-h-[500px]">
        {selectedRoleId ? (
          <>
            {activeTab === 'table' && (
              <TablePermissions
                projectId={projectId}
                roleId={selectedRoleId}
                clientTypeId={clientTypeId}
              />
            )}
            {activeTab === 'global' && (
              <GlobalPermissions
                projectId={projectId}
                roleId={selectedRoleId}
                clientTypeId={clientTypeId}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-20 text-text-muted">
            <Shield className="w-12 h-12 mb-4 opacity-20" />
            <p>Please select a role to manage permissions.</p>
          </div>
        )}
      </div>
    </div>
  )
}
