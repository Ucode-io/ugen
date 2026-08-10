import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/entities/session'
import { handlePaymentRequired } from '@/entities/billing/model/billing-limit-store'
import { logIsUgen } from '@/shared/lib/is-ugen-log'
import {
  extractRefreshTokenData,
  isTerminalRefreshFailure,
  usesBearerAuthorization,
} from './refresh-token'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://api.admin.u-code.io'
const AUTH_BASE_URL = process.env.NEXT_PUBLIC_AUTH_BASE_URL || 'https://api.auth.u-code.io'
const GITHUB_API_BASE_URL = process.env.NEXT_PUBLIC_GITHUB_API_BASE_URL || 'https://admin-api.ucode.run'

export const api = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } })
export const authApi = axios.create({ baseURL: AUTH_BASE_URL, headers: { 'Content-Type': 'application/json' } })
export const githubApi = axios.create({ baseURL: GITHUB_API_BASE_URL, headers: { 'Content-Type': 'application/json' } })

// Token rotation must never depend on the current project route or its API key.
// This instance intentionally has no shared request/response interceptors.
const refreshApi = axios.create({ baseURL: AUTH_BASE_URL, headers: { 'Content-Type': 'application/json' } })

const getProjectIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(/\/projects\/([^/?#]+)/)
  return match ? match[1] : null
}

// Endpoints that always use Bearer token even when on a project page.
// Add any endpoint here that must NOT use the project-scoped API-KEY.
const BEARER_ONLY_ENDPOINTS = [
  /^\/v1\/ai-chat(\/|$)/,
  /^\/v1\/ai-edit-prompts(\/|$)/,
  /^\/v1\/mcp_project(\/|$)/,
  /^\/v1\/upload(\/|$)/,
  /^\/v1\/ugen\//,
  /^\/v1\/ugen-template(?!\/public)(\/|$)/,
  /^\/v1\/company-project(\/|$)/,
  /^\/v1\/pricing\/company-stats(\/|$)/,
  /^\/v1\/token-pack(\/|$)/,
]

const requiresBearerToken = (url: string = '') => {
  const path = url.startsWith('http') ? new URL(url).pathname : url
  return BEARER_ONLY_ENDPOINTS.some((pattern) => pattern.test(path))
}

// A 402 on these is a project-balance shortfall (surfaced with a top-up
// prompt), not a plan limit — so skip the global upgrade dialog and let the
// caller handle it locally.
const handlesPaymentRequiredLocally = (url: string = '') => {
  const path = url.startsWith('http') ? new URL(url).pathname : url
  return (
    /^\/v1\/token-pack\/purchase(\/|$)/.test(path) ||
    /^\/v1\/ugen-template\/create-project(\/|$)/.test(path)
  )
}

const waitForMatchingApiKey = async (urlProjectId: string, timeoutMs = 5000): Promise<string | null> => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const { apiKey, apiKeyProjectId } = useAuthStore.getState()
    if (apiKey && apiKeyProjectId === urlProjectId) return apiKey
    await new Promise((r) => setTimeout(r, 30))
  }
  const { apiKey, apiKeyProjectId } = useAuthStore.getState()
  return apiKey && apiKeyProjectId === urlProjectId ? apiKey : null
}

// Single shared interceptor factory used by all three instances.
// Rules:
//   1. FormData → remove Content-Type so browser sets multipart boundary automatically.
//   2. Authorization already set → skip (caller took explicit control).
//   3. On project page + bearer-only endpoint → Bearer token.
//   4. On project page + normal endpoint → wait for API-KEY, throw if unavailable.
//   5. Outside project page → Bearer token.
const buildRequestInterceptor = () => async (config: InternalAxiosRequestConfig) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  if (config.headers?.['Authorization']) return config

  const urlProjectId = getProjectIdFromUrl()

  if (urlProjectId && !requiresBearerToken(config.url)) {
    const apiKey = await waitForMatchingApiKey(urlProjectId)
    if (!apiKey) {
      const err: any = new Error(`API key unavailable for project ${urlProjectId}`)
      err.config = config
      err.code = 'ERR_NO_API_KEY'
      throw err
    }
    config.headers['Authorization'] = 'API-KEY'
    config.headers['x-api-key'] = apiKey
    return config
  }

  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
}

const onRequestError = (error: unknown) => Promise.reject(error)

api.interceptors.request.use(buildRequestInterceptor(), onRequestError)
authApi.interceptors.request.use(buildRequestInterceptor(), onRequestError)
githubApi.interceptors.request.use(buildRequestInterceptor(), onRequestError)

// Billing limit (HTTP 402) → open the global upgrade dialog. Shared by every
// instance so any limited action (invite, upload, api-key, table/item, function…)
// surfaces the same popup. Still rejects so callers know the request failed.
//
// Only mutating requests trigger the popup. `api_call_limit` is enforced by
// middleware on every /v2/* request — including background GET queries (lists,
// polling) — so reacting to GET would flash the popup constantly. Limits the
// user actually hits via an action are all POST/PUT/PATCH/DELETE.
const handle402 = (error: any) => {
  const method = (error?.config?.method || 'get').toLowerCase()
  if (
    error?.response?.status === 402 &&
    method !== 'get' &&
    !handlesPaymentRequiredLocally(error?.config?.url)
  ) {
    handlePaymentRequired(error.response.data?.data)
  }
  return Promise.reject(error)
}

let refreshOperations: Promise<void> = Promise.resolve()
let accessTokenRefresh: Promise<string> | null = null
const refreshTokenUsedByError = new WeakMap<object, string>()

const rememberRefreshFailure = (error: unknown, refreshToken: string): never => {
  if (error && typeof error === 'object') {
    refreshTokenUsedByError.set(error, refreshToken)
    throw error
  }

  const wrapped = new Error('Token refresh failed', { cause: error })
  refreshTokenUsedByError.set(wrapped, refreshToken)
  throw wrapped
}

const serializeRefreshOperation = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = refreshOperations.then(operation, operation)
  refreshOperations = result.then(() => undefined, () => undefined)
  return result
}

/**
 * Execute any token-rotating auth request one at a time and persist its tokens
 * before the next operation starts. Project/environment switches use the same
 * coordinator as background access-token refreshes, preventing two same-tab
 * requests from submitting the same rotating refresh token concurrently.
 */
export const refreshAuthTokens = <TPayload extends object>(
  endpoint: '/v2/refresh' | '/v2/refresh-superadmin',
  payload: TPayload & { refresh_token?: string },
  config?: AxiosRequestConfig,
): Promise<any> =>
  serializeRefreshOperation(async () => {
    const refreshToken = useAuthStore.getState().refreshToken
      || (typeof payload.refresh_token === 'string' ? payload.refresh_token : '')

    if (!refreshToken) throw new Error('No refresh token available')

    try {
      const { data } = await refreshApi.put(endpoint, {
        ...payload,
        refresh_token: refreshToken,
      }, config)
      const tokenData = extractRefreshTokenData(data)
      if (!tokenData) throw new Error('No access token in refresh response')

      useAuthStore.setState({
        accessToken: tokenData.access_token,
        ...(tokenData.refresh_token && { refreshToken: tokenData.refresh_token }),
      })

      return data
    } catch (error) {
      return rememberRefreshFailure(error, refreshToken)
    }
  })

const refreshExpiredAccessToken = (): Promise<string> => {
  if (!accessTokenRefresh) {
    accessTokenRefresh = refreshAuthTokens('/v2/refresh', {})
      .then((data) => {
        const tokenData = extractRefreshTokenData(data)
        if (!tokenData) throw new Error('No access token in refresh response')
        return tokenData.access_token
      })
      .finally(() => {
        accessTokenRefresh = null
      })
  }

  return accessTokenRefresh
}

const logoutAndRedirect = () => {
  useAuthStore.getState().logout()
  if (typeof window !== 'undefined') window.location.href = '/'
}

// Reconcile is_ugen from /v1/ugen/user-projects (the source of truth used by
// the project dropdown). The /v2/refresh response's is_ugen is unreliable —
// it can come back false (mirrors the login response, see login-form.tsx) —
// so trusting it after a background 401 refresh flips is_ugen to false and
// makes the sidebar project list / home nav vanish until the user manually
// re-selects the project. We pass an explicit Bearer header so the request
// interceptor skips the project-scoped API-KEY path even on a project page.
const reconcileIsUgenFromUserProjects = async (token: string) => {
  try {
    const project = useAuthStore.getState().project
    const projectId = project?.project_id
    const environmentId = project?.environment_id
    if (!projectId && !environmentId) return
    const { data } = await api.get('/v1/ugen/user-projects', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const companies = data?.data?.companies ?? []
    const allProjects = companies.flatMap((c: any) => c.projects ?? [])
    // Match by project id first; fall back to environment_id since the stored
    // project_id can be in a different id-space than user-projects' .id.
    const byId = allProjects.find((p: any) => p.id === projectId)
    const matched =
      byId ??
      (environmentId
        ? allProjects.find((p: any) => p.environment_id === environmentId)
        : undefined)
    logIsUgen('refresh:reconcile', {
      store_project_id: projectId,
      store_environment_id: environmentId,
      prev_is_ugen: project?.is_ugen,
      matched: !!matched,
      matchedBy: byId ? 'project_id' : matched ? 'environment_id' : 'none',
      matched_is_ugen: matched?.is_ugen,
      userProjects: allProjects.map((p: any) => ({ id: p.id, env: p.environment_id, is_ugen: p.is_ugen })),
    })
    if (matched) {
      useAuthStore.setState((state) => ({
        project: state.project
          ? { ...state.project, is_ugen: matched.is_ugen }
          : state.project,
      }))
    }
  } catch (err) {
    console.error('Failed to reconcile is_ugen after token refresh', err)
  }
}

const buildResponseErrorHandler = (instance: AxiosInstance) => async (error: any) => {
  const originalRequest = error?.config

  if (error?.response?.status === 402) return handle402(error)

  // A project API-key rejection is not evidence that the user's access token
  // expired. Refresh only requests that were actually sent with Bearer auth.
  if (
    error?.response?.status !== 401 ||
    originalRequest?._retry ||
    !usesBearerAuthorization(originalRequest?.headers)
  ) {
    return Promise.reject(error)
  }

  originalRequest._retry = true

  if (!useAuthStore.getState().refreshToken) {
    logoutAndRedirect()
    return Promise.reject(error)
  }

  try {
    const newAccessToken = await refreshExpiredAccessToken()
    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

    // is_ugen from /v2/refresh is unreliable; reconcile from the source of
    // truth without blocking the retried request.
    if (instance === api) void reconcileIsUgenFromUserProjects(newAccessToken)

    return instance(originalRequest)
  } catch (refreshError) {
    const tokenUsed = refreshError && typeof refreshError === 'object'
      ? refreshTokenUsedByError.get(refreshError)
      : undefined
    const tokenIsStillCurrent = Boolean(
      tokenUsed && useAuthStore.getState().refreshToken === tokenUsed,
    )

    // Another refresh may already have rotated the token while this request
    // was in flight. Never let a stale failure erase that newer session.
    if (tokenIsStillCurrent && isTerminalRefreshFailure(refreshError)) {
      logoutAndRedirect()
    }

    return Promise.reject(refreshError)
  }
}

api.interceptors.response.use((response) => response, buildResponseErrorHandler(api))
authApi.interceptors.response.use((response) => response, buildResponseErrorHandler(authApi))
githubApi.interceptors.response.use((response) => response, buildResponseErrorHandler(githubApi))
