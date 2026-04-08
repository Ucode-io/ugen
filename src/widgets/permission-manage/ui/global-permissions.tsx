'use client'

import { Controller, Control } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui'
import { Switch } from '@/shared/ui'
import { DataLoadingState } from '@/shared/ui'
import { ShieldCheck } from 'lucide-react'

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
  control: Control<any>
  isLoading: boolean
}

export const GlobalPermissions = ({ control, isLoading }: GlobalPermissionsProps) => {
  const t = useTranslations('widgets.permissionManage.globalPermissions')

  // Format key to a human readable label
  const formatLabel = (key: string) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (isLoading) return <DataLoadingState message={t('fetching')} />

  // We need to get the keys from somewhere. Since we don't have permissionDetail here,
  // we'll use a standard set of keys or get them from the form state if possible.
  // Actually, we can just look at the 'global_permission' object in the form.
  const permissions = control._defaultValues.global_permission || {}
  const booleanKeys = Object.keys(permissions).filter(k => k !== 'id' && typeof permissions[k] === 'boolean')

  if (booleanKeys.length === 0) {
     const fallbackKeys = [
      'menu_button', 'chat', 'settings_button', 'project_settings_button', 
      'profile_settings_button', 'menu_setting_button', 'redirects_button', 
      'api_keys_button', 'projects_button', 'version_button', 'project_button', 
      'sms_button', 'gitbook_button', 'chatwoot_button', 'gpt_button'
    ]
    return renderTable(fallbackKeys)
  }

  function renderTable(keys: string[]) {
    return (
      <div className="w-full relative flex flex-col p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold text-text-main uppercase tracking-tight">{t('title')}</span>
        </div>

        <div className="rounded-2xl border border-border-subtle/60 bg-bg-card isolation-isolate overflow-hidden">
          <Table wrapperClassName="max-h-[600px] custom-scrollbar rounded-2xl" className="border-collapse w-full">
            <TableHeader>
              <TableRow className="border-b-border-subtle/60 bg-bg-sidebar hover:bg-bg-sidebar transition-none">
                <TableHead className="sticky top-0 z-10 bg-bg-sidebar font-bold text-text-main py-4 px-6 text-[14px] tracking-tight border-b border-border-subtle/60">{t('nameHeader')}</TableHead>
                <TableHead className="sticky top-0 z-10 bg-bg-sidebar text-center font-bold text-text-main py-4 px-6 w-[120px] text-[11px] uppercase tracking-widest text-text-muted/70 border-b border-border-subtle/60">{t('checkHeader')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key} className="group/row transition-colors hover:bg-primary/[0.01] border-b-border-subtle/40 last:border-0 hover:border-primary/20">
                  <TableCell className="font-medium text-text-main text-[13px] py-4 px-6">
                    <span className="group-hover:text-primary transition-colors duration-200">
                      {formatLabel(key)}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <Controller
                      control={control}
                      name={`global_permission.${key}`}
                      render={({ field }) => (
                        <div className="flex justify-center">
                          <Switch
                            size="sm"
                            checked={!!field.value}
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

  return renderTable(booleanKeys)
}
