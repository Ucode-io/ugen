'use client'

import { useState, useMemo, useEffect } from "react"
import { Copy, Check } from "lucide-react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { PhoneInputReusable } from "@/shared/ui"
import { Button } from "@/shared/ui"
import { Input } from "@/shared/ui"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs"
import { useClientTypes, useRoles, useBuilderRoles, useCreateUser, useCreateBuilder, useUpdateUser } from "../api/users"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/entities/session"

const getInviteSchema = (isEdit: boolean, changePassword: boolean, isBuilder: boolean = false) => z.object({
  clientType: isBuilder ? z.string().optional() : z.string().min(1, "Required"),
  role: isBuilder ? z.string().optional() : z.string().min(1, "Required"),
  status: z.string().min(1, "Required").default('ACTIVE'),
  login: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  inviteMethod: z.enum(['login', 'phone', 'email', 'link']).default('login')
}).superRefine((data, ctx) => {
  if (data.inviteMethod === 'login') {
    if (!data.login || data.login.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ['login'] })
    }
    if ((!isEdit || changePassword) && (!data.password || data.password.length < 1)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ['password'] })
    }
  }
  if (data.inviteMethod === 'phone') {
    if (!data.phone || data.phone.length < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ['phone'] })
    }
  }
  if (data.inviteMethod === 'email') {
    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ['email'] })
    }
  }
})

type InviteFormValues = {
  clientType: string;
  role: string;
  status: string;
  login?: string;
  phone?: string;
  email?: string;
  password?: string;
  inviteMethod: 'login' | 'phone' | 'email' | 'link';
}

interface InviteUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  companyName: string
  envId: string
  initialData?: any
  password?: string
  isBuilder?: boolean
}

export const InviteUserModal = ({
  open,
  onOpenChange,
  projectId,
  projectName,
  companyName,
  envId,
  initialData,
  isBuilder = false,
}: InviteUserModalProps) => {
  const isEdit = !!initialData
  // The builder flow authenticates as the platform user, so it must use the
  // auth project_id from the session store (not the selected ucode project).
  const sessionProjectId = useAuthStore((s) => s.project?.project_id) || ''
  const builderProjectId = isBuilder ? sessionProjectId : projectId
  const { data: clientTypeOptions = [], isLoading: isLoadingTypes } = useClientTypes(projectId)
  const [isCopied, setIsCopied] = useState(false)
  const [changePassword, setChangePassword] = useState(!isEdit)
  const queryClient = useQueryClient()
  const createUser = useCreateUser()
  const createBuilder = useCreateBuilder()
  const updateUser = useUpdateUser()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors }
  } = useForm<InviteFormValues>({
    resolver: zodResolver(getInviteSchema(isEdit, changePassword, isBuilder)) as any,
    defaultValues: {
      clientType: '',
      role: '',
      login: '',
      phone: '',
      email: '',
      status: 'ACTIVE',
      password: '',
      inviteMethod: 'login'
    }
  })

  // const { mutate: inviteMutation, isPending: isInviting } = useMutation({
  //   mutationFn: createUser,
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['users-workspace'] })
  //     onOpenChange(false)
  //     reset()
  //   },
  //   onError: (error) => {
  //     console.error("Failed to invite user:", error)
  //   }
  // })

  const { mutate: inviteMutation, isPending: isInviting } = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-workspace'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['pricing-all'] })
      queryClient.invalidateQueries({ queryKey: ['company-stats'] })
      onOpenChange(false)
      reset()
    },
    onError: (error) => {
      console.error("Failed to invite user:", error)
    }
  })

  const { mutate: createBuilderMutation, isPending: isCreatingBuilder } = useMutation({
    mutationFn: createBuilder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-workspace'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['pricing-all'] })
      queryClient.invalidateQueries({ queryKey: ['company-stats'] })
      onOpenChange(false)
      reset()
    },
    onError: (error) => {
      console.error("Failed to add builder:", error)
    }
  })

  const { mutate: updateMutation, isPending: isUpdating } = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['pricing-all'] })
      onOpenChange(false)
      reset()
    },
    onError: (error) => {
      console.error("Failed to update user:", error)
    }
  })

  const currentClientType = watch('clientType')
  const activeTab = watch('inviteMethod')
  const currentRole = watch('role')

  const { data: roleOptions = [], isLoading: isLoadingRoles } = useRoles({
    id: currentClientType || '',
    projectId
  })

  // Builder flow: fetch roles with the user's Bearer token and resolve the
  // "DEFAULT ADMIN" role — its role_id / client_type_id are used on submit.
  const { data: builderRoles = [] } = useBuilderRoles(isBuilder && open ? builderProjectId : '')
  const defaultAdminRole = useMemo(
    () => (builderRoles as any[]).find((r) => r?.name === 'DEFAULT ADMIN'),
    [builderRoles]
  )

  // Auto-select first client type and role for create mode
  useEffect(() => {
    if (open && !initialData) {
      if (clientTypeOptions.length > 0 && !currentClientType) {
        setValue('clientType', clientTypeOptions[0].value, { shouldValidate: true })
      }
    }
  }, [open, initialData, clientTypeOptions, currentClientType, setValue])

  useEffect(() => {
    if (open && !initialData) {
      if (roleOptions.length > 0 && currentClientType) {
        if (!currentRole || !roleOptions.find(r => r.value === currentRole)) {
          setValue('role', roleOptions[0].value, { shouldValidate: true })
        }
      }
    }
  }, [open, initialData, roleOptions, currentRole, currentClientType, setValue])

  // Handle initial data and defaults
  useEffect(() => {
    if (open) {
      if (initialData) {
        let method: 'login' | 'phone' | 'email' = 'login'
        if (initialData.phone) method = 'phone'
        if (initialData.email || initialData.mail) method = 'email'
        if (initialData.login) method = 'login'

        reset({
          clientType: initialData.client_type_id || initialData.client_id || '',
          role: initialData.role_id || '',
          login: initialData.login || '',
          password: '',
          phone: initialData.phone || '',
          email: initialData.email || initialData.mail || '',
          status: initialData.status || 'ACTIVE',
          inviteMethod: method
        })
        setChangePassword(false)
      } else if (clientTypeOptions.length > 0) {
        reset({
          clientType: clientTypeOptions[0].value,
          role: '',
          login: '',
          phone: '',
          email: '',
          status: 'ACTIVE',
          password: '',
          inviteMethod: 'login'
        })
        setChangePassword(true)
      }
    }
  }, [open, initialData, clientTypeOptions, reset])

  const formValues = watch()



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
    if (isBuilder) {
      if (!defaultAdminRole) {
        console.error("DEFAULT ADMIN role not found")
        return
      }
      createBuilderMutation({
        data: {
          client_type_id: defaultAdminRole.client_type_id,
          role_id: defaultAdminRole.guid,
          project_id: builderProjectId,
          status: data.status,
          login: data.inviteMethod === 'login' ? data.login : undefined,
          phone: data.inviteMethod === 'phone' ? data.phone : undefined,
          email: data.inviteMethod === 'email' ? data.email : undefined,
          password: data.inviteMethod === 'login' ? data.password : undefined,
        }
      })
      return
    }

    if (data.inviteMethod === 'link' && !isEdit) {
      onOpenChange(false);
      return;
    }

    if (isEdit) {
      const payload: any = {
        id: initialData.id,
        client_type_id: data.clientType,
        project_id: projectId,
        role_id: data.role,
        status: data.status,
        company_id: initialData.company_id,
        login: data.inviteMethod === 'login' ? data.login : undefined,
        phone: data.inviteMethod === 'phone' ? data.phone : undefined,
        email: data.inviteMethod === 'email' ? data.email : undefined,
      }
      if (changePassword && data.password && data.inviteMethod === 'login') {
        payload.password = data.password
      }
      updateMutation({ data: payload })
      return
    }

    inviteMutation({
      data: {
        client_type_id: data.clientType,
        project_id: projectId,
        role_id: data.role,
        status: data.status,
        env_id: envId,
        login: data.inviteMethod === 'login' ? data.login : undefined,
        phone: data.inviteMethod === 'phone' ? data.phone : undefined,
        email: data.inviteMethod === 'email' ? data.email : undefined,
        password: data.inviteMethod === 'login' ? data.password : undefined
      }
    })
  }

  const isLoading = isInviting || isUpdating || isCreatingBuilder

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 flex flex-col max-h-[90vh] overflow-hidden max-w-lg">
        <DialogHeader className="p-4 pb-1">
          <DialogTitle className="font-size-[16px] ">{isEdit ? "Edit User" : isBuilder ? "Add Builder" : "Invite User"}</DialogTitle>
          {/* <DialogDescription>
            {isEdit ? "Update user details below." : "Enter the user details to generate an invite link."}
          </DialogDescription> */}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-1">
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setValue('inviteMethod', val as any);
              }}
              className="w-full"
            >
              <div className="flex items-center gap-3 mb-6">
                {!isBuilder && (
                <div className="w-[130px] flex-shrink-0">
                  <Controller
                    name="clientType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingTypes || isEdit}
                      >
                        <SelectTrigger className="h-8 text-[12px] bg-bg-sidebar">
                          <SelectValue placeholder={isLoadingTypes ? "Loading..." : "User type"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border-subtle shadow-lg max-w-[130px]">
                          {clientTypeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-[12px] px-1">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.clientType && <p className="text-[10px] text-destructive absolute mt-0.5">{errors.clientType.message}</p>}
                </div>
                )}

                {!isBuilder && (
                <div className="w-[130px] flex-shrink-0">
                  <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingRoles}
                      >
                        <SelectTrigger className="h-8 text-[12px] bg-bg-sidebar">
                          <SelectValue placeholder={isLoadingRoles ? "Loading..." : "Role"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border-subtle shadow-lg max-w-[130px]">
                          {roleOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-[12px] px-1">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.role && <p className="text-[10px] text-destructive absolute mt-0.5">{errors.role.message}</p>}
                </div>
                )}

                <TabsList className="flex flex-1 h-8 p-1 rounded-lg bg-bg-sidebar">
                  <TabsTrigger value="login" className="flex-1 h-6 text-[11px] px-1">Login</TabsTrigger>
                  <TabsTrigger value="phone" className="flex-1 h-6 text-[11px] px-1">Phone</TabsTrigger>
                  <TabsTrigger value="email" className="flex-1 h-6 text-[11px] px-1">Email</TabsTrigger>
                  {!isEdit && !isBuilder && <TabsTrigger value="link" className="flex-1 h-6 text-[11px] px-1">Link</TabsTrigger>}
                </TabsList>
              </div>

              <TabsContent value="login" className="space-y-4 outline-none pb-1">
                <div className="space-y-1.5">
                  <Input
                    {...register("login")}
                    type="text"
                    placeholder="Login"
                    className="bg-bg-sidebar"
                  />
                  {errors.login && <p className="text-xs text-destructive">{errors.login.message}</p>}
                </div>

                {!changePassword && isEdit && (
                  <div className="flex justify-end relative z-10 -mb-2">
                    <button
                      type="button"
                      onClick={() => setChangePassword(!changePassword)}
                      className="text-[12px] font-semibold text-primary hover:underline hover:text-primary-hover"
                    >
                      Change Password
                    </button>
                  </div>
                )}

                {(changePassword || !isEdit) && (
                  <div className="space-y-1.5">
                    <Input
                      {...register("password")}
                      type="password"
                      placeholder={isEdit ? "Enter new password" : "Password"}
                      className="bg-bg-sidebar"
                    />
                    {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="phone" className="space-y-4 outline-none pb-1">
                <div className="space-y-1.5">
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <PhoneInputReusable
                        placeholder="Phone"
                        value={field.value || ""}
                        onChange={field.onChange}
                        error={!!errors.phone}
                      />
                    )}
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-4 outline-none pb-1">
                <div className="space-y-1.5">
                  <Input
                    {...register("email")}
                    type="email"
                    placeholder="Email"
                    className="bg-bg-sidebar"
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
              </TabsContent>

              {!isEdit && !isBuilder && (
                <TabsContent value="link" className="space-y-4 outline-none pb-1">
                  <div className="p-3 rounded-lg bg-bg-sidebar border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-text-muted uppercase">Invite Link</span>
                      <button
                        type="button"
                        onClick={copyToClipboard}
                        className="flex items-center gap-1.5 text-primary hover:text-primary-hover transition-colors text-[13px] font-medium"
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
                </TabsContent>
              )}
            </Tabs>
          </div>

          <div className="p-4 pt-2 bg-bg-sidebar/40 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="w-[120px]">
              {activeTab === 'link' && !isEdit && !isBuilder
                ? "Done"
                : isEdit ? (isLoading ? "Saving..." : "Save Changes")
                : isBuilder ? (isLoading ? "Adding..." : "Add Builder")
                : (isLoading ? "Inviting..." : "Invite User")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
