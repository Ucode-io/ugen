'use client'

import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useTranslations } from 'next-intl'
import axios from 'axios'
import { Loader2 } from 'lucide-react'

export interface GoogleUserInfo {
  email: string
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
}

interface GoogleAuthButtonProps {
  /** When true: do a sign-in (token only). When false: also fetch userinfo (used by register). */
  isLogin?: boolean
  text?: string
  disabled?: boolean
  onToken: (accessToken: string, userInfo?: GoogleUserInfo) => void | Promise<void>
  onError?: (error: unknown) => void
}

export const GoogleAuthButton = ({
  isLogin = true,
  text,
  disabled,
  onToken,
  onError,
}: GoogleAuthButtonProps) => {
  const t = useTranslations('features.auth')
  const [loading, setLoading] = useState(false)

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        if (isLogin) {
          await onToken(tokenResponse.access_token)
        } else {
          const { data } = await axios.get<GoogleUserInfo>(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } },
          )
          await onToken(tokenResponse.access_token, data)
        }
      } catch (err) {
        onError?.(err)
      } finally {
        setLoading(false)
      }
    },
    onError: (err) => {
      setLoading(false)
      onError?.(err)
    },
  })

  const label = text ?? (isLogin ? t('google.continue') : t('google.signUp'))

  return (
    <button
      type="button"
      disabled={loading || disabled}
      onClick={() => {
        setLoading(true)
        login()
      }}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-subtle bg-bg-card py-2 text-sm font-semibold text-text-main transition-colors hover:bg-hover-bg disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <img src="/google.svg" alt="" width={18} height={18} />
      )}
      <span>{label}</span>
    </button>
  )
}
