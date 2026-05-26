'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Github, Gitlab, GitBranch } from 'lucide-react'
import { Button } from '@/shared/ui'

// Backend redirects the OAuth popup here after handling the provider callback:
//   success: /oauth/success?provider=gitlab&username=<login>
//   failure: /oauth/success?provider=gitlab&reason=<error_code>
const ERROR_MESSAGES: Record<string, string> = {
  missing_params: 'Authorization code or state parameter is missing.',
  invalid_state: 'The authorization request expired or was already used. Please try again.',
  state_parse_error: 'An internal error occurred. Please try again.',
  token_exchange_failed: 'The provider rejected the authorization. Please try again.',
  fetch_user_failed: 'Could not fetch your profile. Please try again.',
  save_failed: 'Could not save the integration. Please try again.',
}

export default function OAuthSuccessPage() {
  const params = useSearchParams()
  const provider = (params.get('provider') ?? '').toLowerCase()
  const username = params.get('username')
  const reason = params.get('reason')
  const isError = !!reason

  const [closeFailed, setCloseFailed] = useState(false)

  const label =
    provider === 'gitlab' ? 'GitLab'
      : provider === 'github' ? 'GitHub'
      : provider === 'bitbucket' ? 'Bitbucket'
      : 'Integration'
  const Icon =
    provider === 'gitlab' ? Gitlab
      : provider === 'bitbucket' ? GitBranch
      : Github

  // Notify the app window that opened this popup so it can refresh the card.
  useEffect(() => {
    try {
      window.opener?.postMessage(
        { source: 'ucode-oauth', provider, status: isError ? 'error' : 'success', username, reason },
        window.location.origin,
      )
    } catch {
      /* opener gone or cross-origin — nothing to notify */
    }
  }, [provider, username, reason, isError])

  const handleClose = () => {
    window.close()
    // window.close() only works for script-opened windows; if it didn't, tell
    // the user they can close the tab themselves.
    setTimeout(() => setCloseFailed(true), 200)
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main p-4">
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-8 max-w-md w-full shadow-sm text-center space-y-5">
          <div className="flex justify-center">
            <XCircle className="w-14 h-14 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-main mb-2">{label} connection failed</h1>
            <p className="text-sm text-text-muted">
              {ERROR_MESSAGES[reason as string] ?? 'An unexpected error occurred. Please try again.'}
            </p>
          </div>
          <Button onClick={handleClose} className="w-full rounded-xl">
            Close window
          </Button>
          {closeFailed && (
            <p className="text-xs text-text-muted">You can close this tab and try again.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-main p-4">
      <div className="bg-bg-card border border-border-subtle rounded-2xl p-8 max-w-md w-full shadow-sm text-center space-y-5">
        <div className="flex justify-center">
          <div className="relative">
            <Icon className="w-14 h-14 text-text-main" />
            <CheckCircle2 className="w-6 h-6 text-green-500 absolute -bottom-1 -right-1 bg-bg-card rounded-full" />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-main mb-1">{label} connected!</h1>
          {username ? (
            <p className="text-sm text-text-muted">
              Successfully connected as <span className="font-semibold text-text-main">@{username}</span>
            </p>
          ) : (
            <p className="text-sm text-text-muted">Your account is now connected.</p>
          )}
        </div>
        <Button onClick={handleClose} className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white">
          Close window
        </Button>
        {closeFailed && (
          <p className="text-xs text-text-muted">You can safely close this tab and return to the app.</p>
        )}
      </div>
    </div>
  )
}
