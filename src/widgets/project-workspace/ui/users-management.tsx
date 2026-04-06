'use client'

import { useState, useEffect, useMemo } from "react"
import { UserPlus, Trash2 } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"

import { ReusableTabs, UsageIndicator, Input } from "@/shared/ui"
import { WorkspaceDataTable } from "./workspace-data-table"
import { Button } from "@/shared/ui"
import { Search } from "lucide-react"
import { useAuthStore } from "@/entities/session"
import { InviteUserModal } from "./invite-user-modal"
import { useClientTypes, useRoles, useUsers, useDeleteUser } from "../api/users"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui"

interface User {
  id: string
  name: string
  role: string
  login: string
  mail: string
  email?: string
  phone: string
  role_id: string
  client_id: string
  company_id: string
  client_type_id?: string
  status?: string
}

interface UsersManagementProps {
  projectId?: string
  projectInfo?: any
}

export const UsersManagement = ({ projectId: propProjectId, projectInfo: propProjectInfo }: UsersManagementProps) => {
  const [activeClientType, setActiveClientType] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const { data: clientTypeOptions = [] } = useClientTypes()
  const queryClient = useQueryClient()
  const deleteUser = useDeleteUser()

  // Auth store data
  const authProject = useAuthStore((state) => state.project)
  const authUser = useAuthStore((state) => state.user)

  const projectId = propProjectId || ''
  const authProjectId = authProject?.project_id || ''
  const projectName = propProjectInfo?.title || authProject?.title || ''
  const companyName = propProjectInfo?.company_name || 'My Company'
  const envId = authUser?.environment_id || ''

  // Set default client type when options are loaded
  useEffect(() => {
    if (clientTypeOptions.length > 0 && !activeClientType) {
      setActiveClientType(clientTypeOptions[0].value)
    }
  }, [clientTypeOptions, activeClientType])

  const { data: roles = [] } = useRoles({
    id: activeClientType,
    projectId
  })

  const { data, isLoading } = useUsers({
    clientTypeId: activeClientType,
    limit: pageSize,
    offset: currentPage,
    projectId,
    search: searchTerm,
  })

  console.log({
    data
  })

  const { mutate: deleteMutation, isPending: isDeleting } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setUserToDelete(null)
    },
    onError: (error) => {
      console.error("Failed to delete user:", error)
    }
  })

  const handleRowClick = (user: User) => {
    setSelectedUser(user)
    setIsInviteModalOpen(true)
  }

  const handleModalClose = (open: boolean) => {
    setIsInviteModalOpen(open)
    if (!open) {
      setSelectedUser(null)
    }
  }

  const columns = useMemo<ColumnDef<User>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'user_type', header: 'User Type' },
    {
      accessorKey: 'role_id',
      header: 'Role',
      cell: ({ row }) => {
        const role_id = row.original.role_id
        return <>{roles?.find(role => role.value === role_id)?.label || role_id}</>
      }
    },
    { accessorKey: 'login', header: 'Login' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'phone', header: 'Phone' },
    {
      id: 'actions',
      header: () => <div className="text-right">Action</div>,
      cell: ({ row }) => (
        <div className="text-right" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation()
              setUserToDelete(row.original)
            }}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ], [roles])

  const mappedTabsOptions = clientTypeOptions.map(opt => ({
    id: opt.value,
    label: opt.label
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-text-main mb-1">Users</h1>
          <p className="text-[13px] text-text-muted">Manage application users</p>
        </div>
        <div className="flex items-center gap-4">
          <UsageIndicator 
            label="Users" 
            value={data?.data?.count || 0} 
            total={10} 
            percentage={((data?.data?.count || 0) / 10) * 100}
          />
          <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 text-white rounded-lg h-9 px-4 text-[13px] font-semibold">
            Upgrade Plan
          </Button>
        </div>
      </div>

      {mappedTabsOptions.length > 0 && (
        <ReusableTabs
          options={mappedTabsOptions}
          activeId={activeClientType}
          onTabChange={(id) => {
            setActiveClientType(id)
            setCurrentPage(0)
          }}
          className="bg-bg-card w-fit"
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="relative group max-w-[320px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={16} />
          <Input 
            placeholder="Search users..." 
            className="pl-10 h-9 bg-bg-card border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button className="px-8 gap-2 h-9 bg-primary hover:bg-primary/90 text-white font-semibold" onClick={() => setIsInviteModalOpen(true)}>
          <UserPlus size={16} />
          Add User
        </Button>
      </div>

      <WorkspaceDataTable
        data={data?.data?.response || []}
        columns={columns}
        totalCount={data?.data?.count || 0}
        page={currentPage + 1}
        limit={pageSize}
        onPageChange={(p) => setCurrentPage(p - 1)}
        onLimitChange={setPageSize}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        containerClassName="max-h-[480px] overflow-y-auto"
      />

      <InviteUserModal
        open={isInviteModalOpen}
        onOpenChange={handleModalClose}
        projectId={projectId}
        projectName={projectName}
        companyName={companyName}
        envId={envId}
        initialData={selectedUser}
      />

      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user <span className="font-semibold text-text-main">{userToDelete?.login}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="ghost"
              onClick={() => setUserToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                if (userToDelete) {
                  deleteMutation({ id: userToDelete.id, clientTypeId: activeClientType })
                }
              }}
            >
              {isDeleting ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
