'use client'

import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/ui/table'
import { ReusableTabs } from '@/shared/ui/tabs'
import { Switch } from '@/shared/ui/ui/switch'

const ROLES = [
  { id: '1', label: 'Administrator' },
  { id: '2', label: 'Dispatcher' },
  { id: '3', label: 'Owner' }
]

const TARGET_DATA = {
  "id": "83865790-709a-417e-bd16-eda64c5b5fa0",
  "menu_button": true,
  "chat": true,
  "settings_button": true,
  "project_settings_button": true,
  "profile_settings_button": true,
  "menu_setting_button": true,
  "redirects_button": true,
  "api_keys_button": true,
  "projects_button": true,
  "version_button": true,
  "project_button": true,
  "sms_button": true,
  "gitbook_button": true,
  "chatwoot_button": true,
  "gpt_button": true
}

export const GlobalPermissions = () => {
  const [activeRole, setActiveRole] = useState(ROLES[0].id)

  const { control } = useForm({
    defaultValues: {
      permissions: TARGET_DATA
    }
  })

  // Format key to a human readable label
  const formatLabel = (key: string) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Filter out non-boolean fields like id
  const booleanKeys = Object.keys(TARGET_DATA).filter(k => k !== 'id')

  return (
    <div className="w-full relative flex flex-col p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <ReusableTabs
          options={ROLES}
          activeId={activeRole}
          onTabChange={setActiveRole}
          size="md"
          className="w-fit"
        />
      </div>

      <div className="rounded-2xl border border-border-subtle/60 bg-bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04),0_4px_20px_rgb(0,0,0,0.02)] isolation-isolate overflow-hidden">
        <Table wrapperClassName="max-h-[450px] custom-scrollbar rounded-2xl" className="border-collapse w-full">
          <TableHeader>
            <TableRow className="border-b-border-subtle/60 bg-bg-sidebar hover:bg-bg-sidebar transition-none">
              <TableHead className="sticky top-0 z-10 bg-bg-sidebar font-bold text-text-main py-4 px-6 text-[14px] tracking-tight border-b border-border-subtle/60">Global Permission Name</TableHead>
              <TableHead className="sticky top-0 z-10 bg-bg-sidebar text-center font-bold text-text-main py-4 px-6 w-[120px] text-[11px] uppercase tracking-widest text-text-muted/70 border-b border-border-subtle/60">Access Check</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {booleanKeys.map((key) => (
              <TableRow key={key} className="group/row transition-colors hover:bg-primary/[0.01] border-b-border-subtle/40 last:border-0">
                <TableCell className="font-medium text-text-main text-[13px] py-4 px-6">
                  <span className="group-hover/row:text-primary transition-colors duration-200">
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

