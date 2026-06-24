'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

export default function AuthCallbackPage() {
  const searchParams = useSearchParams()
  const provider = searchParams.get('provider')
  const status = searchParams.get('status')
  const reason = searchParams.get('reason') ?? searchParams.get('message')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const message = {
      type: 'oauth-callback',
      provider,
      status,
      reason,
    }

    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(message, window.location.origin)
      } catch {
        // best-effort: opener may be cross-origin
      }
      window.close()
    }
  }, [provider, status, reason])

  const isSuccess = status === 'success'

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-main p-4">
      <div className="bg-bg-card border border-border-subtle rounded-2xl p-8 max-w-md w-full shadow-sm text-center space-y-4">
        <div className="flex justify-center">
          {isSuccess ? (
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          ) : status ? (
            <XCircle className="w-12 h-12 text-destructive" />
          ) : (
            <Loader2 className="w-12 h-12 animate-spin text-text-muted" />
          )}
        </div>
        <h1 className="text-lg font-semibold text-text-main">
          {isSuccess
            ? 'Signed in successfully'
            : status
            ? 'Authentication failed'
            : 'Processing…'}
        </h1>
        <p className="text-sm text-text-muted">
          {isSuccess
            ? 'You can close this window.'
            : reason || 'This window will close automatically.'}
        </p>
      </div>
    </div>
  )
}
