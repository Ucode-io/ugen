'use client'

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"

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
import { Switch } from "@/shared/ui/ui/switch"
import { clientTypeSchema, ClientTypeFormValues } from "../model/schema"
import { ClientType, useCreateClientType, useUpdateClientType } from "@/entities/client-type"
import { useLoginTables } from "@/entities/collection"

interface ClientTypeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  initialData?: ClientType | null
}

export const ClientTypeModal = ({
  open,
  onOpenChange,
  projectId,
  initialData,
}: ClientTypeModalProps) => {
  const isEdit = !!initialData
  const createMutation = useCreateClientType(projectId)
  const updateMutation = useUpdateClientType(projectId)
  const { data: tableOptions = [], isLoading: isLoadingTables } = useLoginTables()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors }
  } = useForm<ClientTypeFormValues>({
    resolver: zodResolver(clientTypeSchema),
    defaultValues: {
      name: '',
      table_slug: '',
      default_page: '',
      session_limit: 50,
      self_recover: false,
      self_register: false,
    }
  })

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          name: initialData.name,
          table_slug: initialData.table_slug,
          default_page: initialData.default_page || '',
          session_limit: initialData.session_limit,
          self_recover: initialData.self_recover,
          self_register: initialData.self_register,
        })
      } else {
        reset({
          name: '',
          table_slug: 'users',
          default_page: '',
          session_limit: 50,
          self_recover: false,
          self_register: false,
        })
      }
    }
  }, [open, initialData, reset])

  const onSubmit = (clientTypeData: ClientTypeFormValues) => {
    if (isEdit) {
      updateMutation.mutate({
        data: {
          ...clientTypeData,
          id: initialData.guid,
          guid: initialData.guid,
          project_id: projectId,
          "project-id": projectId,
          columns: initialData.columns || [],
        }
      }, {
        onSuccess: () => onOpenChange(false)
      })
    } else {
      createMutation.mutate({
        data: {
          ...clientTypeData,
          project_id: projectId,
          "project-id": projectId,
          columns: [],
        }
      }, {
        onSuccess: () => onOpenChange(false)
      })
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending || isLoadingTables

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 flex flex-col max-h-[90vh] overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="uppercase">
            {isEdit ? "Edit Client Type" : "New Client Type"}
          </DialogTitle>
          <DialogDescription>
            Configure platform settings and user registration behavior.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main">Display Name</label>
                <Input
                  {...register("name")}
                  placeholder="e.g. Admin, Customer"
                  disabled={isLoading}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main">Table</label>
                <Controller
                  name="table_slug"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={tableOptions.find((opt: any) => opt.value === field.value)?.value}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="bg-bg-sidebar">
                        <SelectValue placeholder={isLoadingTables ? "Loading..." : "Select table"} />
                      </SelectTrigger>
                      <SelectContent>
                        {tableOptions.map((opt: any) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.table_slug && <p className="text-xs text-destructive">{errors.table_slug.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main">Default Page URL</label>
                <Input
                  {...register("default_page")}
                  placeholder="https://app.social.com/dashboard"
                  disabled={isLoading}
                />
                {errors.default_page && <p className="text-xs text-destructive">{errors.default_page.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main">Session Limit</label>
                <Input
                  {...register("session_limit", { valueAsNumber: true })}
                  type="number"
                  disabled={isLoading}
                />
                {errors.session_limit && <p className="text-xs text-destructive">{errors.session_limit.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-bg-sidebar">
                  <span className="text-sm font-medium text-text-main">Self Recover</span>
                  <Controller
                    name="self_recover"
                    control={control}
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-bg-sidebar">
                  <span className="text-sm font-medium text-text-main">Self Register</span>
                  <Controller
                    name="self_register"
                    control={control}
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 pt-2 border-t border-border-subtle flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Type"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
