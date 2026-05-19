'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, User as UserIcon, Building } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/entities/session'
import { registerSchema, type RegisterFormValues } from '../model/validation'
import { api, authApi } from '@/shared/api'
import { useRouter } from '@/shared/lib/i18n/navigation'
import { GoogleAuthButton } from './google-auth-button'

interface RegisterFormProps {
  onSuccess: (login?: string, password?: string) => void
  onAuthenticated?: () => void
}

export const RegisterForm = ({ onSuccess, onAuthenticated }: RegisterFormProps) => {
  const t = useTranslations('features.auth.register')
  const tAuth = useTranslations('features.auth')
  const { setAuth } = useAuthStore()
  const router = useRouter()

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema)
  })

  const handleGoogleAuth = async () => {
    try {
      const res = await authApi.get('/v3/ugen/auth/session', { withCredentials: true })
      const responseData = res.data?.data
      if (!responseData) throw new Error('Invalid response')

      const { project_data } = responseData
      const response = responseData?.response || responseData
      const { user, permissions, role, app_permissions, global_permission, environment_id, token } = response

      const userData = {
        id: user?.id,
        login: user?.login,
        email: user?.email,
        company_id: user?.company_id,
        environment_id,
        role,
      }

      setAuth(
        userData,
        { ...project_data, is_ugen: responseData?.is_ugen ?? project_data?.is_ugen ?? false },
        permissions || [],
        app_permissions || [],
        global_permission,
        token?.access_token,
        token?.refresh_token,
      )

      try {
        const langRes = await api.get('/v1/language?search=Admin')
        if (langRes.data?.data?.languages) {
          useAuthStore.getState().setLanguages(langRes.data.data.languages)
        }
      } catch (err) {
        console.error('Failed to fetch languages', err)
      }

      onAuthenticated?.()
      router.push('/')
    } catch (error: any) {
      console.error(error)
      setError('root', {
        type: 'manual',
        message: error.response?.data?.description || error.message || 'Google sign-up failed',
      })
    }
  }

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const fareRes = await api.get('/v1/fare')
      const fares = fareRes.data?.data?.fares || []
      const fare_id = fares.length > 0 ? fares[0].id : undefined

      if (!fare_id) {
        throw new Error("No fare configuration found")
      }

      await authApi.post('/v3/ugen/register', { ...data, fare_id })

      onSuccess(data.user_info.login, data.user_info.password)
    } catch (error: any) {
      console.error(error)
      setError('root', {
        type: 'manual',
        message: error.response?.data?.description || error.message || 'Registration failed'
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errors.root && (
        <div className="p-3 mb-2 text-sm text-red-500 bg-red-50 rounded-lg border border-red-200">
          {errors.root.message}
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-text-main">{t('companyName')}</label>
        <div className="relative">
          <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            {...register('name')}
            type="text"
            placeholder={t('companyPlaceholder')}
            className="w-full rounded-lg border border-border-subtle bg-bg-sidebar py-2 pl-9 pr-3 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-text-main">{t('loginLabel')}</label>
        <div className="relative">
          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            {...register('user_info.login')}
            type="text"
            placeholder={t('loginPlaceholder')}
            className="w-full rounded-lg border border-border-subtle bg-bg-sidebar py-2 pl-9 pr-3 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
        {errors.user_info?.login && <p className="text-xs text-red-500">{errors.user_info.login.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-text-main">{t('emailLabel')}</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            {...register('user_info.email')}
            type="email"
            placeholder={t('emailPlaceholder')}
            className="w-full rounded-lg border border-border-subtle bg-bg-sidebar py-2 pl-9 pr-3 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
        {errors.user_info?.email && <p className="text-xs text-red-500">{errors.user_info.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-text-main">{t('passwordLabel')}</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            {...register('user_info.password')}
            type="password"
            placeholder={t('passwordPlaceholder')}
            className="w-full rounded-lg border border-border-subtle bg-bg-sidebar py-2 pl-9 pr-3 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
        {errors.user_info?.password && <p className="text-xs text-red-500">{errors.user_info.password.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 mt-2 disabled:opacity-50"
      >
        {t('submit')}
      </button>

      <div className="flex items-center gap-3 my-4">
        <div className="h-px flex-1 bg-border-subtle" />
        <span className="text-xs text-text-muted">{tAuth('google.or')}</span>
        <div className="h-px flex-1 bg-border-subtle" />
      </div>

      <GoogleAuthButton
        isLogin={false}
        disabled={isSubmitting}
        onSuccess={handleGoogleAuth}
        onError={(err) => {
          console.error(err)
          setError('root', {
            type: 'manual',
            message: (err as any)?.response?.data?.description || (err as Error)?.message || 'Google sign-up failed',
          })
        }}
      />
    </form>
  )
}
