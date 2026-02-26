'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { User as UserIcon, Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/entities/session'
import { loginSchema, type LoginFormValues } from '../model/validation'
import { authApi } from '@/shared/api'
import { useRouter } from '@/shared/lib/i18n/navigation'

interface LoginFormProps {
  onSuccess: () => void
  defaultValues?: { login?: string; password?: string }
}

export const LoginForm = ({ onSuccess, defaultValues }: LoginFormProps) => {
  const t = useTranslations('Navigation')
  const { setAuth } = useAuthStore()

  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues
  })

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const res = await authApi.post('/v3/multicompany/default-login', {
        username: data.login,
        password: data.password
      })

      const responseData = res.data?.data
      if (!responseData) throw new Error("Invalid response")


      const { project_data } = responseData

      const { user, permissions, role, app_permissions, global_permission, token } = responseData?.response

      const userData = {
        id: user.id,
        login: user.login,
        email: user.email,
        company_id: user.company_id,
        role
      }

      setAuth(
        userData,
        project_data,
        permissions || [],
        app_permissions || [],
        global_permission,
        token.access_token,
        token.refresh_token
      )

      onSuccess()
      router.push('/')
    } catch (error: any) {
      console.error(error)
      setError('root', {
        type: 'manual',
        message: error.response?.data?.description || error.message || 'Login failed'
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
        <label className="text-sm font-medium text-text-main">Login</label>
        <div className="relative">
          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            {...register('login')}
            type="text"
            placeholder="Enter your login"
            className="w-full rounded-lg border border-border-subtle bg-bg-sidebar py-2 pl-9 pr-3 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
        {errors.login && <p className="text-xs text-red-500">{errors.login.message}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-main">Password</label>
          <a href="#" className="text-xs text-primary hover:underline">Forgot?</a>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            {...register('password')}
            type="password"
            placeholder="Enter your password"
            className="w-full rounded-lg border border-border-subtle bg-bg-sidebar py-2 pl-9 pr-3 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 mt-2 disabled:opacity-50"
      >
        {t('login')}
      </button>
    </form>
  )
}
