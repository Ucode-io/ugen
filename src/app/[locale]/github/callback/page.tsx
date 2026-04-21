'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, Github } from 'lucide-react'
import { Button } from '@/shared/ui'

const ERROR_MESSAGES: Record<string, string> = {
  missing_params: 'Authorization code or state parameter is missing.',
  invalid_state: 'The authorization request expired or was already used. Please try again.',
  state_parse_error: 'An internal error occurred. Please try again.',
  token_exchange_failed: 'GitHub rejected the authorization. Please try again.',
  fetch_user_failed: 'Could not fetch your GitHub profile. Please try again.',
  save_failed: 'Could not save the integration. Please try again.',
}

export default function GithubCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const integrationId = searchParams.get('integration_id')
  const username = searchParams.get('username')
  const reason = searchParams.get('reason')

  const [returnPath, setReturnPath] = useState<string | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('github_oauth_return_path')
    if (saved) {
      setReturnPath(saved)
      sessionStorage.removeItem('github_oauth_return_path')
    }
  }, [])

  const handleReturn = () => {
    if (returnPath) {
      router.push(returnPath)
    } else {
      router.back()
    }
  }

  if (!integrationId && !reason) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
          <p className="text-text-muted text-sm">Processing GitHub authorization…</p>
        </div>
      </div>
    )
  }

  if (reason) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main p-4">
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-8 max-w-md w-full shadow-sm text-center space-y-5">
          <div className="flex justify-center">
            <XCircle className="w-14 h-14 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-main mb-2">GitHub connection failed</h1>
            <p className="text-sm text-text-muted">
              {ERROR_MESSAGES[reason] ?? 'An unexpected error occurred. Please try again.'}
            </p>
          </div>
          <Button onClick={handleReturn} className="w-full rounded-xl">
            Go back and retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-main p-4">
      <div className="bg-bg-card border border-border-subtle rounded-2xl p-8 max-w-md w-full shadow-sm text-center space-y-5">
        <div className="flex justify-center">
          <div className="relative">
            <Github className="w-14 h-14 text-text-main" />
            <CheckCircle2 className="w-6 h-6 text-green-500 absolute -bottom-1 -right-1 bg-bg-card rounded-full" />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-main mb-1">GitHub connected!</h1>
          {username && (
            <p className="text-sm text-text-muted">
              Successfully connected as <span className="font-semibold text-text-main">@{username}</span>
            </p>
          )}
        </div>
        <Button onClick={handleReturn} className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white">
          Continue
        </Button>
      </div>
    </div>
  )
}
