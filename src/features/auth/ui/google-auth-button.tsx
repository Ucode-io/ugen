'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'

const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL || 'https://api.auth.u-code.io'

const POPUP_NAME = 'ugen-google-oauth'
const POPUP_FEATURES = 'width=480,height=640,menubar=no,toolbar=no,location=no,status=no'

interface GoogleAuthButtonProps {
  isLogin?: boolean
  text?: string
  disabled?: boolean
  onSuccess: () => void | Promise<void>
  onError?: (error: unknown) => void
}

export const GoogleAuthButton = ({
  isLogin = true,
  text,
  disabled,
  onSuccess,
  onError,
}: GoogleAuthButtonProps) => {
  const t = useTranslations('features.auth')
  const [loading, setLoading] = useState(false)
  const popupRef = useRef<Window | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    popupRef.current = null
    setLoading(false)
  }

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const data = event.data
      if (!data || data.type !== 'oauth-callback' || data.provider !== 'google') return

      cleanup()

      if (data.status === 'success') {
        try {
          await onSuccess()
        } catch (err) {
          onError?.(err)
        }
      } else {
        onError?.(new Error(data.reason || 'Google sign-in was cancelled'))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [onSuccess, onError])

  const openPopup = () => {
    setLoading(true)
    const url = `${AUTH_BASE_URL}/v3/ugen/auth/google`
    const popup = window.open(url, POPUP_NAME, POPUP_FEATURES)

    if (!popup) {
      setLoading(false)
      onError?.(new Error('Popup was blocked. Please allow popups for this site.'))
      return
    }

    popupRef.current = popup
    popup.focus()

    // Detect manual close (user dismissed the popup without finishing)
    pollRef.current = setInterval(() => {
      if (popupRef.current?.closed) {
        cleanup()
      }
    }, 500)
  }

  const label = text ?? (isLogin ? t('google.continue') : t('google.signUp'))

  return (
    <button
      type="button"
      disabled={loading || disabled}
      onClick={openPopup}
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
