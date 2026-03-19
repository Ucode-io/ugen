'use client'

import { useState, useEffect, useMemo } from "react"
import {
  Plus,
  Edit2,
  Shield,
  User,
  Key,
  RefreshCw,
  Info
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"

import { Button } from "@/shared/ui/ui/button"
import { DataLoadingState, DataErrorState } from "@/shared/ui/data-states"
import { roleApi, Role } from "@/entities/role/api/role-api"
import { useAuthStore } from "@/entities/session"
import { useClientTypes } from "@/entities/client-type"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/ui/dialog"
import { Input } from "@/shared/ui/ui/input"
import { Switch } from "@/shared/ui/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/ui/select"
import { cn } from "@/shared/lib/utils/cn"

interface RoleFormValues {
  name: string;
  status: boolean;
  client_type_id: string;
}

export const RoleList = ({ projectId }: { projectId: string }) => {

  const queryClient = useQueryClient()

  const [selectedClientTypeId, setSelectedClientTypeId] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Role | null>(null)

  const isEdit = !!selectedItem

  const { data: clientTypesResponse } = useClientTypes(projectId)
  const clientTypes = useMemo(() => clientTypesResponse || [], [clientTypesResponse])

  // Auto-select first client type
  useEffect(() => {
    if (clientTypes.length > 0 && !selectedClientTypeId) {
      setSelectedClientTypeId(clientTypes[0].guid)
    }
  }, [clientTypes, selectedClientTypeId])

  const {
    data: rolesData,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['roles', projectId],
    queryFn: () => roleApi.getRoles(projectId),
    enabled: !!projectId
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: any) => {
      if (isEdit) {
        return roleApi.updateRole(projectId, payload)
      }
      return roleApi.createRole(projectId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setIsModalOpen(false)
      reset()
    }
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<RoleFormValues>({
    defaultValues: {
      name: '',
      status: true,
      client_type_id: ''
    }
  })

  useEffect(() => {
    if (isModalOpen) {
      if (selectedItem) {
        reset({
          name: selectedItem.name,
          status: selectedItem.status,
          client_type_id: selectedItem.client_type_id
        })
      } else {
        reset({
          name: '',
          status: true,
          client_type_id: ''
        })
      }
    }
  }, [isModalOpen, selectedItem, reset])

  const watchedStatus = watch('status')
  const watchedClientType = watch('client_type_id')

  const onSubmit = (data: RoleFormValues) => {
    const payload: any = {
      'project-id': projectId,
      name: data.name,
      status: data.status,
      client_type_id: data.client_type_id,
    }

    if (isEdit && selectedItem) {
      payload.guid = selectedItem.guid
    }

    mutate({
      data: payload
    })
  }

  const handleEdit = (item: Role) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setSelectedItem(null)
    setIsModalOpen(true)
  }

  if (isLoading && !rolesData) {
    return <DataLoadingState message="Loading roles..." />
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-text-main to-text-muted bg-clip-text text-transparent">
            Roles Management
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Manage your project's roles and permissions.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="rounded-lg px-8 bg-primary hover:bg-primary/90 text-white"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Role
        </Button>
      </div>

      {isError ? (
        <DataErrorState
          title="Failed to load Roles"
          onRetry={() => refetch()}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {rolesData?.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-12 text-center text-text-muted bg-bg-card border border-border-subtle rounded-2xl border-dashed"
              >
                No roles found.
              </motion.div>
            ) : (
              rolesData?.map((item: Role, index: number) => (
                <motion.div
                  layout
                  key={item.guid}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative h-full bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative z-10 flex flex-col h-full gap-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-bg-sidebar border border-border-subtle flex items-center justify-center group-hover:border-primary/20 transition-all duration-300">
                          {item.is_system ? (
                            <Shield className="w-6 h-6 text-primary" />
                          ) : (
                            <User className="w-6 h-6 text-text-muted group-hover:text-primary transition-colors" />
                          )}
                        </div>
                        <div className="max-w-[150px]">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-text-main text-lg leading-tight truncate">
                              {item.name}
                            </h3>
                          </div>
                          <div className="text-[10px] font-medium text-primary mt-0.5 uppercase tracking-wider bg-primary/5 px-1.5 py-0.5 rounded w-fit">
                            {clientTypes.find(ct => ct.guid === item.client_type_id)?.name || 'Unknown Type'}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <Key size={10} className="text-text-muted shrink-0" />
                              <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider truncate">
                                {item.guid.split('-')[0]}
                              </span>
                            </div>
                            {item.is_system && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-tighter">
                                System
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                        className="w-8 h-8 shrink-0 rounded-lg border border-border-subtle bg-bg-sidebar hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
                      >
                        <Edit2 size={14} />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mt-auto">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-bg-sidebar border border-border-subtle/50 group-hover:border-border-subtle transition-colors">
                        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-tight">
                          <RefreshCw size={13} strokeWidth={2.5} />
                          Status
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                          item.status
                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                            : 'bg-destructive/10 text-destructive border-destructive/20'
                        )}>
                          {item.status ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-bg-card border-border-subtle">
          <DialogHeader>
            <DialogTitle className="uppercase text-text-main flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {isEdit ? 'Edit Role' : 'Create Role'}
            </DialogTitle>
            <DialogDescription className="text-text-muted">
              {isEdit ? 'Update role details and its operational status.' : 'Fill in the details below to define a new application role.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide ml-1">Role Name</p>
              <Input
                {...register('name', { required: true, minLength: 2 })}
                placeholder="Manager, Moderator, etc."
                className="bg-bg-sidebar border-border-subtle focus:border-primary/50"
              />
              {errors.name && (
                <p className="text-[10px] text-destructive font-medium ml-1">Name is required (min 2 characters)</p>
              )}
            </div>

            {!isEdit ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide ml-1">Client Type</p>
                <Select
                  value={watchedClientType}
                  onValueChange={(v) => setValue('client_type_id', v)}
                >
                  <SelectTrigger className="bg-bg-sidebar border-border-subtle text-text-main">
                    <SelectValue placeholder="Select client type" />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-card border-border-subtle">
                    {clientTypes.map(ct => (
                      <SelectItem key={ct.guid} value={ct.guid} className="text-text-main hover:bg-hover-bg">
                        {ct.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.client_type_id && (
                  <p className="text-[10px] text-destructive font-medium ml-1">Please select a client type</p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide ml-1">Client Type</p>
                <div className="p-2.5 rounded-lg bg-bg-sidebar/50 border border-border-subtle text-sm text-text-muted font-medium">
                  {clientTypes.find(c => c.guid === selectedItem?.client_type_id)?.name || 'Unknown'}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-bg-sidebar/30 border border-border-subtle">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center border",
                  watchedStatus ? "bg-green-500/5 border-green-500/10 text-green-500" : "bg-destructive/5 border-destructive/10 text-destructive"
                )}>
                  {watchedStatus ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-text-main">Status</p>
                  <p className="text-[11px] text-text-muted leading-tight">
                    {watchedStatus ? 'Role is active and usable' : 'Role is inactive'}
                  </p>
                </div>
              </div>
              <Switch
                checked={watchedStatus}
                onCheckedChange={(val) => setValue('status', val)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
                className="text-text-muted hover:text-text-main"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary hover:bg-primary/90 text-white min-w-[120px]"
              >
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </div>
                ) : isEdit ? 'Save Changes' : 'Create Role'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Additional icons needed for the status switch UI
const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const XCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
