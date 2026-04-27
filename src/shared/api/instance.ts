import axios from 'axios'
import { useAuthStore } from '@/entities/session'

// Ensure we have fallback URLs if env vars are missing during build/dev
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://api.admin.u-code.io'
const AUTH_BASE_URL = process.env.NEXT_PUBLIC_AUTH_BASE_URL || 'https://api.auth.u-code.io'
const GITHUB_API_BASE_URL = process.env.NEXT_PUBLIC_GITHUB_API_BASE_URL || 'https://admin-api.ucode.run'

/**
 * Main API instance for general application requests
 */
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Auth API instance specifically for authentication endpoints
 */
export const authApi = axios.create({
  baseURL: AUTH_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * GitHub Integration API instance — base URL: https://admin-api.ucode.run
 * project_id and environment_id are extracted from the JWT by the server.
 */
export const githubApi = axios.create({
  baseURL: GITHUB_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const getProjectIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(/\/projects\/([^/?#]+)/)
  return match ? match[1] : null
}

// These endpoints always use Bearer token even on the project page
const BEARER_ONLY_ENDPOINTS = [
  /^\/v1\/ai-chat(\/|$)/,
  /^\/v1\/mcp_project(\/|$)/,
]

const requiresBearerToken = (url: string = '') => {
  const path = url.startsWith('http') ? new URL(url).pathname : url
  return BEARER_ONLY_ENDPOINTS.some((pattern) => pattern.test(path))
}

// Wait until apiKey matches the current URL project id (or timeout).
// Prevents race where requests fire before `/v1/mcp_project/:id` response
// populates the project-scoped api key.
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

// Request interceptor: inject token for main API
api.interceptors.request.use(
  async (config) => {
    if (config.headers?.['Authorization']) return config

    const urlProjectId = getProjectIdFromUrl()

    // On project page: non-bearer-only endpoints MUST use API-KEY. Never fall back to Bearer.
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

    // Bearer-only endpoints OR outside project page
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)


// Request interceptor: auth API always uses Bearer token (refresh, login, etc.)
authApi.interceptors.request.use(
  (config) => {
    if (config.headers?.['Authorization']) return config

    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Request interceptor: GitHub API always uses API-KEY on project page, never Bearer fallback.
githubApi.interceptors.request.use(
  async (config) => {
    if (config.headers?.['Authorization']) return config

    const urlProjectId = getProjectIdFromUrl()
    if (urlProjectId) {
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
  },
  (error) => Promise.reject(error)
)

let isRefreshing = false
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      const state = useAuthStore.getState()
      const refreshToken = state.refreshToken

      if (!refreshToken) {
        state.logout()
        if (typeof window !== 'undefined') window.location.href = '/'
        return Promise.reject(error)
      }

      try {
        const { data } = await authApi.put('/v2/refresh', { refresh_token: refreshToken })

        // Depending on backend structure, locate the new tokens
        const tokenData = data?.data?.response?.token || data?.data?.token || data?.data || data?.response?.token || data
        const newAccessToken = tokenData?.access_token
        const newRefreshToken = tokenData?.refresh_token

        if (newAccessToken) {
          useAuthStore.setState({
            accessToken: newAccessToken,
            ...(newRefreshToken && { refreshToken: newRefreshToken })
          })

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          processQueue(null, newAccessToken)
          return api(originalRequest)
        } else {
          throw new Error('No access token in refresh response')
        }
      } catch (refreshError) {
        processQueue(refreshError, null)
        const authState = useAuthStore.getState()
        authState.logout()
        if (typeof window !== 'undefined') window.location.href = '/'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
