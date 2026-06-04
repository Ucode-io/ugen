'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { User as UserIcon, Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { z } from 'zod'
import { useAuthStore } from '@/entities/session'
import { useChatStore } from '@/entities/chat'
import { fetchUserProjects, matchUserProject } from '@/entities/project'
import { logIsUgen } from '@/shared/lib/is-ugen-log'
import { loginSchema, type LoginFormValues } from '../model/validation'
import { authApi, api } from '@/shared/api'
import { useRouter } from '@/shared/lib/i18n/navigation'
import { Button } from '@/shared/ui'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui'
import { GoogleAuthButton } from './google-auth-button'

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

    // Capture this *before* setAuth flips activeView to 'dashboard'. Once that
    // happens, DashboardHome/PromptInput mount and PromptInput clears
    // pendingDraft synchronously in its mount effect — so reading it after the
    // awaits below would always see null and wrongly trigger router.push('/').
    const hadPendingDraft = !!useChatStore.getState().pendingDraft

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

    logIsUgen('login:raw', {
      responseData_is_ugen: responseData?.is_ugen,
      project_data_is_ugen: project_data?.is_ugen,
      project_data_project_id: project_data?.project_id,
      project_data_environment_id: project_data?.environment_id,
      project_data_company_id: project_data?.company_id,
      resolved: responseData?.is_ugen ?? project_data?.is_ugen ?? false,
    })

    setAuth(
      userData,
      { ...project_data, is_ugen: responseData?.is_ugen ?? project_data?.is_ugen ?? false },
      permissions || [],
      app_permissions || [],
      global_permission,
      token?.access_token,
      token?.refresh_token
    )

    // The login response's is_ugen flag is unreliable (it can come back false
    // even for ugen accounts), which makes the dashboard render the non-ugen
    // layout. /v1/ugen/user-projects is the source of truth the project
    // dropdown reads, so reconcile is_ugen from there — exactly like switching
    // a workspace does — before navigating. Matched by project_id with an
    // environment_id fallback so a differing id-space can't silently skip it.
    try {
      const companies = await fetchUserProjects()
      const matched = matchUserProject(companies, {
        projectId: project_data?.project_id,
        environmentId: project_data?.environment_id,
      })
      logIsUgen('login:reconcile', {
        matched: !!matched,
        matchedBy: matched?.matchedBy ?? 'none',
        matched_is_ugen: matched?.project?.is_ugen,
        matched_project_id: matched?.project?.id,
        matched_company_id: matched?.companyId,
        lookup: {
          projectId: project_data?.project_id,
          environmentId: project_data?.environment_id,
        },
        userProjects: companies.flatMap((c) =>
          c.projects.map((p) => ({ company: c.id, id: p.id, env: p.environment_id, is_ugen: p.is_ugen }))
        ),
      })
      if (matched) {
        useAuthStore.setState((state) => ({
          project: state.project
            ? { ...state.project, is_ugen: matched.project.is_ugen }
            : state.project,
          // user-projects is the source of truth for company ids used by the
          // project dropdown, so align activeCompanyId with it instead of the
          // (possibly different id-space) project_data.company_id.
          activeCompanyId: matched.companyId ?? state.activeCompanyId,
        }))
      } else {
        console.warn('[is_ugen] login:reconcile no match — flag stays at raw login value', {
          projectId: project_data?.project_id,
          environmentId: project_data?.environment_id,
        })
      }
      logIsUgen('login:final', { is_ugen: useAuthStore.getState().project?.is_ugen })
    } catch (err) {
      console.error('[is_ugen] login:reconcile failed', err)
    }

    try {
      const langRes = await api.get('/v1/language?search=Admin')
      if (langRes.data?.data?.languages) {
        useAuthStore.getState().setLanguages(langRes.data.data.languages)
      }
    } catch (err) {
      console.error("Failed to fetch languages", err)
    }

    onSuccess()

    // If a draft was stashed on a public page (e.g. landing), keep us on '/'
    // so the dashboard mounts in place and PromptInput can resume the submit
    // flow, navigating to the new project itself. Pushing '/' here would race
    // with that navigation and leave the prompt input stuck on a loader.
    if (!hadPendingDraft) {
      router.push('/')
    }
  }

  const onSubmit = async (data: LoginFormValues) => {
    try {
      // ─── NEW LOGIN LOGIC ────────────────────────────────────────────
      const res = await authApi.post('/v3/ugen/login', {
        login: data.login,
        password: data.password
      })

      const responseData = res.data?.data
      if (!responseData) throw new Error("Invalid response")

      await handleLoginResponse(responseData)
      // ────────────────────────────────────────────────────────────────
    } catch (error: any) {
      console.error(error)
      form.setError('root', {
        type: 'manual',
        message: error.response?.data?.description || error.message || 'Login failed'
      })
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const res = await authApi.get('/v3/ugen/auth/session', { withCredentials: true })

      const responseData = res.data?.data
      if (!responseData) throw new Error('Invalid response')

      await handleLoginResponse(responseData)
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
          <label className="text-sm font-medium text-text-main">{t('login.passwordLabel')}</label>
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
          <div className="flex justify-end">
            <a href="#" className="text-xs text-primary hover:underline">{t('login.forgotPassword')}</a>
          </div>
        </div>

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full mt-2"
        >
          {t('login.submit')}
        </Button>
      </form>

      <div className="flex items-center gap-3 my-4">
        <div className="h-px flex-1 bg-border-subtle" />
        <span className="text-xs text-text-muted">{t('google.or')}</span>
        <div className="h-px flex-1 bg-border-subtle" />
      </div>

      <GoogleAuthButton
        isLogin
        disabled={form.formState.isSubmitting}
        onSuccess={handleGoogleLogin}
        onError={(err) => {
          console.error(err)
          form.setError('root', {
            type: 'manual',
            message: (err as any)?.response?.data?.description || (err as Error)?.message || 'Google sign-in failed',
          })
        }}
      />

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
