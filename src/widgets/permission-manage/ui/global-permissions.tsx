'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/ui/table'
import { Switch } from '@/shared/ui/ui/switch'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/shared/api'
import { DataLoadingState, DataErrorState } from '@/shared/ui/data-states'
import { Button } from '@/shared/ui/ui/button'
import { Save, Loader2, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/entities/session'

interface GlobalPermission {
  id: string
  menu_button: boolean
  chat: boolean
  settings_button: boolean
  project_settings_button: boolean
  profile_settings_button: boolean
  menu_setting_button: boolean
  redirects_button: boolean
  api_keys_button: boolean
  environments_button?: boolean
  projects_button: boolean
  version_button: boolean
  project_button: boolean
  sms_button: boolean
  gitbook_button: boolean
  chatwoot_button: boolean
  gpt_button: boolean
  billing?: boolean
}

interface GlobalPermissionsProps {
  projectId: string
  roleId: string
  clientTypeId: string
}

export const GlobalPermissions = ({ projectId, roleId, clientTypeId }: GlobalPermissionsProps) => {
  const queryClient = useQueryClient()

  const ucodeProjectId = useAuthStore(state => state.ucodeProjectId)

  const { data: permissionDetail, isLoading, isError, refetch } = useQuery({
    queryKey: ['permissions-detail', ucodeProjectId, roleId],
    queryFn: async () => {
      const { data } = await authApi.get(`/v2/role-permission/detailed/${ucodeProjectId}/${roleId}`, {
        params: { 'project-id': ucodeProjectId }
      })
      return data.data.data
    },
    enabled: !!ucodeProjectId && !!roleId
  })

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      permissions: {} as GlobalPermission
    }
  })

  useEffect(() => {
    if (permissionDetail?.global_permission) {
      reset({ permissions: permissionDetail.global_permission })
    }
  }, [permissionDetail, reset])

  const { mutate: savePermissions, isPending: isSaving } = useMutation({
    mutationFn: async (formData: any) => {
      // To save, we need the FULL payload. We take tables from the current cache
      // and update the global_permission part.
      const payload = {
        data: {
          ...permissionDetail,
          global_permission: formData.permissions
        },
        project_id: projectId,
        role_id: roleId
      }
      return authApi.put('/v2/role-permission/detailed', payload, {
        params: { 'project-id': projectId }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions-detail'] })
    }
  })

  // Format key to a human readable label
  const formatLabel = (key: string) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (isLoading) return <DataLoadingState message="Fetching global permissions..." />
  if (isError) return <DataErrorState onRetry={() => refetch()} />

  const booleanKeys = Object.keys(permissionDetail?.global_permission || {}).filter(k => k !== 'id')

  return (
    <div className="w-full relative flex flex-col p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold text-text-main uppercase tracking-tight">System Access Controls</span>
        </div>
        <Button
          disabled={isSaving}
          onClick={handleSubmit((d) => savePermissions(d))}
          className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="rounded-2xl border border-border-subtle/60 bg-bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04),0_4px_20px_rgb(0,0,0,0.02)] isolation-isolate overflow-hidden">
        <Table wrapperClassName="max-h-[600px] custom-scrollbar rounded-2xl" className="border-collapse w-full">
          <TableHeader>
            <TableRow className="border-b-border-subtle/60 bg-bg-sidebar hover:bg-bg-sidebar transition-none">
              <TableHead className="sticky top-0 z-10 bg-bg-sidebar font-bold text-text-main py-4 px-6 text-[14px] tracking-tight border-b border-border-subtle/60">Global Permission Name</TableHead>
              <TableHead className="sticky top-0 z-10 bg-bg-sidebar text-center font-bold text-text-main py-4 px-6 w-[120px] text-[11px] uppercase tracking-widest text-text-muted/70 border-b border-border-subtle/60">Access Check</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {booleanKeys.map((key) => (
              <TableRow key={key} className="group/row transition-colors hover:bg-primary/[0.01] border-b-border-subtle/40 last:border-0 hover:border-primary/20">
                <TableCell className="font-medium text-text-main text-[13px] py-4 px-6">
                  <span className="group-hover:text-primary transition-colors duration-200">
                    {formatLabel(key)}
                  </span>
                </TableCell>
                <TableCell className="py-4 px-6">
                  <Controller
                    control={control}
                    name={`permissions.${key}` as any}
                    render={({ field }) => (
                      <div className="flex justify-center">
                        <Switch
                          checked={field.value as boolean}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    )}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

