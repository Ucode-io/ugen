'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Lock, User as UserIcon, Loader2, CheckCircle2 } from 'lucide-react'
import axios from 'axios'
import { api } from '@/shared/api'
import { useAuthStore } from '@/entities/session'
const ugenAuthApi = axios.create({
  baseURL: 'https://auth-api.ucode.run',
  headers: { 'Content-Type': 'application/json' },
})

export const WorkspaceInviteClient = () => {
  const searchParams = useSearchParams()
  const { isAuthenticated, user, setAuth, setLanguages } = useAuthStore()

  const projectId    = searchParams.get('project-id') || ''
  const envId        = searchParams.get('env_id') || ''
  const roleId       = searchParams.get('role_id') || ''
  const clientTypeId = searchParams.get('client_type_id') || ''
  const projectName  = searchParams.get('name') || ''
  const companyName  = searchParams.get('companyName') || ''

  const [isMounted, setIsMounted] = useState(false)
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [joinSuccess, setJoinSuccess] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

  const joinProject = async (userId: string) => {
    setIsJoining(true)
    try {
      await api.post(
        '/v2/user/invite',
        { project_id: projectId, env_id: envId, user_id: userId, client_type_id: clientTypeId, role_id: roleId, additional_data: {} },
        { params: { 'project-id': projectId } }
      )
      setJoinSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.description || err.message || 'Failed to join project')
    } finally {
      setIsJoining(false)
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    // Step 1: try register — ignore error if user already exists
    try {
      await ugenAuthApi.post(
        '/v2/register',
        {
          data: {
            login,
            password,
            type: 'login',
            role_id: roleId,
            client_type_id: clientTypeId,
            project_id: projectId,
            environment_id: envId,
          }
        },
        { params: { 'project-id': projectId }, headers: { 'environment-id': envId } }
      )
    } catch {
      // user likely already exists — proceed to login
    }

    // Step 2: login
    try {
      const res = await ugenAuthApi.post('/v3/ugen/login', { login, password })
      const responseData = res.data?.data
      if (!responseData) throw new Error('Invalid response')

      const { project_data } = responseData
      const response = responseData?.response || responseData
      const { user: u, permissions, role, app_permissions, global_permission, environment_id, token } = response

      setAuth(
        { id: u?.id, login: u?.login, email: u?.email, company_id: u?.company_id, environment_id, role },
        project_data,
        permissions || [],
        app_permissions || [],
        global_permission,
        token?.access_token,
        token?.refresh_token,
      )

      try {
        const langRes = await api.get('/v1/language?search=Admin')
        if (langRes.data?.data?.languages) setLanguages(langRes.data.data.languages)
      } catch { /* non-critical */ }

      // Step 3: join
      await joinProject(u?.id)
    } catch (err: any) {
      setError(err?.response?.data?.description || err.message || 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isMounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-main">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  /* ── Authenticated: show join card ── */
  if (isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-main px-4">
        <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-bg-card p-8 shadow-xl">
          {joinSuccess ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 size={40} className="text-primary" />
              <h2 className="text-lg font-semibold text-text-main">Joined successfully!</h2>
              <p className="text-sm text-text-muted">You have joined <span className="font-medium text-text-main">{projectName}</span>.</p>
            </div>
          ) : (
            <>
              <div className="mb-6 space-y-2">
                <h2 className="text-xl font-semibold text-text-main">{projectName}</h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  You have been invited to join{' '}
                  <span className="font-medium text-text-main">{companyName}</span>
                  {companyName && projectName ? ' / ' : ''}
                  <span className="font-medium text-text-main">{projectName}</span>
                  {' '}via link.
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-500">
                  {error}
                </div>
              )}

              <button
                onClick={() => user && joinProject(user.id)}
                disabled={isJoining}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {isJoining && <Loader2 size={16} className="animate-spin" />}
                Join Project
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  /* ── Not authenticated: show login form ── */
  return (
    <div className="flex h-screen items-center justify-center bg-bg-main px-4">
      <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-bg-card p-8 shadow-xl">
        <div className="mb-6 space-y-1.5">
          <h2 className="text-xl font-semibold text-text-main">Join {projectName}</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            You've been invited to{' '}
            <span className="font-medium text-text-main">{companyName}</span>
            {companyName && projectName ? ' / ' : ''}
            <span className="font-medium text-text-main">{projectName}</span>.
            {' '}Sign in to accept.
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-main">Login</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                value={login}
                onChange={e => setLogin(e.target.value)}
                type="text"
                placeholder="Enter your login"
                className="w-full rounded-lg border border-border-subtle bg-bg-sidebar py-2 pl-9 pr-3 text-sm text-text-main outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-main">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                placeholder="Enter your password"
                className="w-full rounded-lg border border-border-subtle bg-bg-sidebar py-2 pl-9 pr-3 text-sm text-text-main outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Sign in & Join
          </button>
        </form>
      </div>
    </div>
  )
}
