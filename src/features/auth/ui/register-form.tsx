'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, User as UserIcon, Building } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { registerSchema, type RegisterFormValues } from '../model/validation'
import { api, authApi } from '@/shared/api'
import { GoogleAuthButton, type GoogleUserInfo } from './google-auth-button'

interface RegisterFormProps {
  onSuccess: (login?: string, password?: string) => void
}

export const RegisterForm = ({ onSuccess }: RegisterFormProps) => {
  const t = useTranslations('features.auth.register')
  const tAuth = useTranslations('features.auth')

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, setValue } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema)
  })

  const [googleInfo, setGoogleInfo] = useState<GoogleUserInfo | null>(null)
  const [googleToken, setGoogleToken] = useState<string | null>(null)

  const handleGoogleSignup = async (accessToken: string, userInfo?: GoogleUserInfo) => {
    setGoogleToken(accessToken)
    if (userInfo) {
      setGoogleInfo(userInfo)
      setValue('user_info.email', userInfo.email, { shouldValidate: true })
    }
  }

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      // 1. Fetch fare_id from admin-api
      const fareRes = await api.get('/v1/fare')
      const fares = fareRes.data?.data?.fares || []
      const fare_id = fares.length > 0 ? fares[0].id : undefined

      if (!fare_id) {
        throw new Error("No fare configuration found")
      }

      // 2. Submit company registration. Attach google_token when the user
      // signed up via Google so the backend can link the account.
      const payload = {
        ...data,
        fare_id,
        user_info: {
          ...data.user_info,
          email: googleInfo?.email || data.user_info.email,
        },
        ...(googleToken ? { type: 'google', google_token: googleToken } : {}),
      }
      await authApi.post('/company', payload)

      // 3. Switch to login and prefill inputs
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

      {!googleInfo && (
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
      )}

      {googleInfo && (
        <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-sidebar px-3 py-2 text-xs">
          <img src="/google.svg" alt="" width={14} height={14} />
          <span className="text-text-muted truncate">{googleInfo.email}</span>
        </div>
      )}

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
        disabled={isSubmitting || !!googleToken}
        onToken={handleGoogleSignup}
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
