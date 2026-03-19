'use client'

import { useState, useMemo, useEffect } from "react"
import { Copy, Check } from "lucide-react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { PhoneInputReusable } from "@/shared/ui/phone-input"
import { Button } from "@/shared/ui/ui/button"
import { Input } from "@/shared/ui/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/ui/select"
import { useClientTypes, useRoles, useCreateUser, useUpdateUser } from "../api/users"
import { useMutation, useQueryClient } from "@tanstack/react-query"

const inviteSchema = z.object({
  clientType: z.string().min(1, "Required"),
  role: z.string().min(1, "Required"),
  login: z.string().min(2, "Login must be at least 2 characters"),
  phone: z.string().min(5, "Invalid phone number"),
  email: z.string().email("Invalid email address"),
  status: z.string().min(1, "Required")
})

type InviteFormValues = z.infer<typeof inviteSchema>

interface InviteUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  companyName: string
  envId: string
  initialData?: any
}

export const InviteUserModal = ({
  open,
  onOpenChange,
  projectId,
  projectName,
  companyName,
  envId,
  initialData,
}: InviteUserModalProps) => {
  const isEdit = !!initialData
  const { data: clientTypeOptions = [], isLoading: isLoadingTypes } = useClientTypes(projectId)
  const [isCopied, setIsCopied] = useState(false)
  const queryClient = useQueryClient()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors }
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      clientType: '',
      role: '',
      login: '',
      phone: '',
      email: '',
      status: 'ACTIVE'
    }
  })

  const { mutate: inviteMutation, isPending: isInviting } = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
      reset()
    },
    onError: (error) => {
      console.error("Failed to invite user:", error)
    }
  })

  const { mutate: updateMutation, isPending: isUpdating } = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
      reset()
    },
    onError: (error) => {
      console.error("Failed to update user:", error)
    }
  })

  const currentClientType = watch('clientType')
  const { data: roleOptions = [], isLoading: isLoadingRoles } = useRoles({
    id: currentClientType || '',
    projectId
  })

  // Handle initial data and defaults
  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          clientType: initialData.client_type_id || initialData.client_id || '',
          role: initialData.role_id || '',
          login: initialData.login || '',
          phone: initialData.phone || '',
          email: initialData.email || initialData.mail || '',
          status: initialData.status || 'ACTIVE'
        })
      } else if (clientTypeOptions.length > 0) {
        reset({
          clientType: clientTypeOptions[0].value,
          role: '',
          login: '',
          phone: '',
          email: '',
          status: 'ACTIVE'
        })
      }
    }
  }, [open, initialData, clientTypeOptions, reset])

  const formValues = watch()

  const statusOptions = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Blocked', value: 'BLOCKED' },
  ]

  const inviteLink = useMemo(() => {
    const domain = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_DOMAIN || 'localhost:3000')
    const params = new URLSearchParams({
      'project-id': projectId,
      'env_id': envId,
      'role_id': formValues.role,
      'client_type_id': formValues.clientType,
      'name': projectName,
      'companyName': companyName
    })
    return `${domain}/invite-user?${params.toString()}`
  }, [projectId, envId, formValues.role, formValues.clientType, projectName, companyName])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const onSubmit = (data: InviteFormValues) => {
    if (isEdit) {
      updateMutation({
        data: {
          id: initialData.id,
          client_type_id: data.clientType,
          login: data.login,
          phone: data.phone,
          email: data.email,
          project_id: projectId,
          role_id: data.role,
          status: data.status,
          env_id: envId,
          company_id: initialData.company_id
        }
      })
      return
    }

    inviteMutation({
      data: {
        client_type_id: data.clientType,
        login: data.login,
        phone: data.phone,
        email: data.email,
        project_id: projectId,
        role_id: data.role,
        status: data.status,
        env_id: envId
      }
    })
  }

  const isLoading = isInviting || isUpdating

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 flex flex-col max-h-[90vh] overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="uppercase">{isEdit ? "Edit User" : "Invite User"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update user details below." : "Enter the user details to generate an invite link."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-main">Client Type</label>
                  <Controller
                    name="clientType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingTypes || isEdit}
                      >
                        <SelectTrigger className="bg-bg-sidebar">
                          <SelectValue placeholder={isLoadingTypes ? "Loading..." : "Select type"} />
                        </SelectTrigger>
                        <SelectContent>
                          {clientTypeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.clientType && <p className="text-xs text-destructive">{errors.clientType.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-main">Role</label>
                  <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingRoles}
                      >
                        <SelectTrigger className="bg-bg-sidebar">
                          <SelectValue placeholder={isLoadingRoles ? "Loading..." : "Select role"} />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main">Login</label>
                <Input
                  {...register("login")}
                  type="text"
                  placeholder="Enter login"
                  readOnly={isEdit}
                />
                {errors.login && <p className="text-xs text-destructive">{errors.login.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main">Phone</label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInputReusable
                      placeholder="Enter phone number"
                      value={field.value}
                      onChange={field.onChange}
                      error={!!errors.phone}
                    />
                  )}
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main">Email</label>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="Enter email"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main">Status</label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="bg-bg-sidebar">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
              </div>

              {!isEdit && (
                <div className="mt-2 p-3 rounded-lg bg-bg-sidebar border border-border-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-text-muted uppercase">Invite Link</span>
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="flex items-center gap-1.5 text-primary hover:text-primary-hover transition-colors text-xs font-medium"
                    >
                      {isCopied ? (
                        <>
                          <Check size={14} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Copy link
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-[11px] text-text-muted break-all font-mono bg-bg-card p-2 rounded border border-border-subtle/50">
                    {inviteLink}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 pt-2 border-t border-border-subtle flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isEdit ? (isLoading ? "Saving..." : "Save Changes") : (isLoading ? "Inviting..." : "Invite User")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
