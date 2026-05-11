'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { User as UserIcon, Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { z } from 'zod'
import { useAuthStore } from '@/entities/session'
import { loginSchema, type LoginFormValues } from '../model/validation'
import { authApi, api } from '@/shared/api'
import { useRouter } from '@/shared/lib/i18n/navigation'
import { Button } from '@/shared/ui'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui'
import axios from 'axios'

// New ugen auth API instance
const ugenApi = axios.create({
  baseURL: 'https://auth-api.ucode.run',
  headers: { 'Content-Type': 'application/json' }
})

interface LoginFormProps {
  onSuccess: () => void
  defaultValues?: { login?: string; password?: string }
}

const connectionFormSchema = z.object({
  tables: z.array(
    z.object({
      object_id: z.string().min(1, 'Required'),
      table_slug: z.string()
    })
  )
})

type ConnectionFormValues = z.infer<typeof connectionFormSchema>

const ConnectionSelect = ({ conn, index, form }: { conn: any, index: number, form: any }) => {
  const computedConnections = useMemo(() => {
    return (
      conn?.options?.map((item: any) => ({
        value: String(item?.guid),
        label: item?.[conn?.view_slug],
      })) ?? []
    )
  }, [conn?.options, conn?.view_slug])

  return (
    <FormField
      control={form.control}
      name={`tables.${index}.object_id`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="capitalize">{conn?.table_slug}</FormLabel>
          <Select
            onValueChange={(val) => {
              field.onChange(val)
              form.setValue(`tables.${index}.table_slug`, conn?.table_slug)
            }}
            defaultValue={field.value}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={conn?.view_slug || 'Select'} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {computedConnections.map((opt: any) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label || opt.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export const LoginForm = ({ onSuccess, defaultValues }: LoginFormProps) => {
  const t = useTranslations('features.auth')
  const { setAuth } = useAuthStore()
  const router = useRouter()

  const [showModal, setShowModal] = useState(false)
  const [connections, setConnections] = useState<any[]>([])
  const [credentials, setCredentials] = useState<LoginFormValues | null>(null)
  const [extraLoginData, setExtraLoginData] = useState<any>(null)
  const [isSecondStepSubmitting, setIsSecondStepSubmitting] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues
  })

  // Avoid creating connectionForm initially as connections are empty, but we must call hook.
  const connectionForm = useForm<ConnectionFormValues>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues: {
      tables: []
    }
  })

  const handleLoginResponse = async (responseData: any) => {
    // NOTE: response shape expected from /v3/ugen/login:
    // { response: { user, permissions, role, app_permissions, global_permission, environment_id, token }, project_data }
    const { project_data } = responseData
    const response = responseData?.response || responseData
    const { user, permissions, role, app_permissions, global_permission, environment_id, token } = response

    const userData = {
      id: user?.id,
      login: user?.login,
      email: user?.email,
      company_id: user?.company_id,
      environment_id,
      role
    }

    setAuth(
      userData,
      { ...project_data, is_ugen: responseData?.is_ugen ?? project_data?.is_ugen ?? false },
      permissions || [],
      app_permissions || [],
      global_permission,
      token?.access_token,
      token?.refresh_token
    )

    try {
      const langRes = await api.get('/v1/language?search=Admin', { _skipAuthRefresh: true } as any)
      if (langRes.data?.data?.languages) {
        useAuthStore.getState().setLanguages(langRes.data.data.languages)
      }
    } catch (err) {
      console.error("Failed to fetch languages", err)
    }

    onSuccess()
    router.push('/')
  }

  const onSubmit = async (data: LoginFormValues) => {
    try {
      // ─── NEW LOGIN LOGIC ────────────────────────────────────────────
      const res = await ugenApi.post('/v3/ugen/login', {
        login: data.login,
        password: data.password
      })

      const responseData = res.data?.data
      if (!responseData) throw new Error("Invalid response")

      await handleLoginResponse(responseData)
      // ────────────────────────────────────────────────────────────────

      // ─── OLD LOGIN LOGIC (commented out) ────────────────────────────
      // const res = await authApi.post('/v3/multicompany/default-login', {
      //   username: data.login,
      //   password: data.password
      // })
      //
      // const responseData = res.data?.data
      // if (!responseData) throw new Error("Invalid response")
      //
      // if (Array.isArray(responseData?.response)) {
      //   setConnections(responseData.response)
      //   setCredentials(data)
      //   setExtraLoginData({
      //     client_type: responseData.client_type,
      //     environment_id: responseData.environment,
      //     project_id: responseData.project,
      //     company_id: responseData.project_data?.company_id,
      //     project_data: responseData.project_data
      //   })
      //   connectionForm.reset({
      //     tables: responseData.response.map((conn: any) => ({
      //       object_id: '',
      //       table_slug: conn?.table_slug || ''
      //     }))
      //   })
      //   setShowModal(true)
      //   return
      // }
      //
      // handleLoginResponse(responseData)
      // ────────────────────────────────────────────────────────────────

    } catch (error: any) {
      console.error(error)
      form.setError('root', {
        type: 'manual',
        message: error.response?.data?.description || error.message || 'Login failed'
      })
    }
  }

  const onStep2Submit = async (values: ConnectionFormValues) => {
    // ─── OLD STEP 2 LOGIC (commented out) ───────────────────────────
    // setIsSecondStepSubmitting(true)
    // try {
    //   const res = await authApi.post('/v2/login', {
    //     username: credentials?.login,
    //     password: credentials?.password,
    //     tables: values.tables,
    //     ...extraLoginData
    //   })
    //
    //   const responseData = res.data?.data
    //   if (!responseData) throw new Error("Invalid response")
    //
    //   handleLoginResponse(responseData)
    //   setShowModal(false)
    // } catch (error: any) {
    //   console.error(error)
    //   connectionForm.setError('root', {
    //     type: 'manual',
    //     message: error.response?.data?.description || error.message || 'Login failed'
    //   })
    // } finally {
    //   setIsSecondStepSubmitting(false)
    // }
    // ────────────────────────────────────────────────────────────────
  }

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {form.formState.errors.root && (
          <div className="p-3 mb-2 text-sm text-red-500 bg-red-50 rounded-lg border border-red-200">
            {form.formState.errors.root.message}
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-main">{t('login.loginLabel')}</label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              {...form.register('login')}
              type="text"
              placeholder={t('login.loginPlaceholder')}
              className="w-full rounded-lg border border-border-subtle bg-bg-sidebar py-2 pl-9 pr-3 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          {form.formState.errors.login && <p className="text-xs text-red-500">{form.formState.errors.login.message}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-main">{t('login.passwordLabel')}</label>
            <a href="#" className="text-xs text-primary hover:underline">{t('login.forgotPassword')}</a>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              {...form.register('password')}
              type="password"
              placeholder={t('login.passwordPlaceholder')}
              className="w-full rounded-lg border border-border-subtle bg-bg-sidebar py-2 pl-9 pr-3 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          {form.formState.errors.password && <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full mt-2"
        >
          {t('login.submit')}
        </Button>
      </form>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.selectConnections')}</DialogTitle>
            <DialogDescription>{t('common.configureConnections')}</DialogDescription>
          </DialogHeader>
          <Form {...connectionForm}>
            <form onSubmit={connectionForm.handleSubmit(onStep2Submit)} className="space-y-4">
              {connectionForm.formState.errors.root && (
                <div className="p-3 mb-2 text-sm text-red-500 bg-red-50 rounded-lg border border-red-200">
                  {connectionForm.formState.errors.root.message}
                </div>
              )}
              {connections.map((conn, index) => (
                <ConnectionSelect key={index} conn={conn} index={index} form={connectionForm} />
              ))}
              <Button type="submit" className="w-full mt-4" disabled={isSecondStepSubmitting}>
                {t('login.submit')}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
