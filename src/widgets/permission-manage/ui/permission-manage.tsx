'use client'
import { useState } from 'react'
import { ReusableTabs } from '@/shared/ui/tabs'
import { GlobalPermissions } from './global-permissions'
import { ShieldAlert } from 'lucide-react'
import { TablePermissions } from './table-permissions'

interface Props {
  clientTypeId: string
}

export const PermissionManage = ({ clientTypeId }: Props) => {
  const [activeTab, setActiveTab] = useState('table')

  const tabs = [
    { id: 'table', label: 'Table permission' },
    { id: 'global', label: 'Global permission' }
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
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

      <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden min-h-[500px] max-w-[960px]">
        {activeTab === 'table' && <TablePermissions />}
        {activeTab === 'global' && <GlobalPermissions />}
      </div>
    </div>
  )
}
