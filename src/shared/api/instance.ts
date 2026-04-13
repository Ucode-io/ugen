import axios from 'axios'
import { useAuthStore } from '@/entities/session'

// Ensure we have fallback URLs if env vars are missing during build/dev
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://api.admin.u-code.io'
const AUTH_BASE_URL = process.env.NEXT_PUBLIC_AUTH_BASE_URL || 'https://api.auth.u-code.io'

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

// Request interceptor: inject token for main API
api.interceptors.request.use(
  (config) => {
    // Zustand's getState allows us to read values outside of React components
    const state = useAuthStore.getState()
    const token = state.accessToken
    const apiKey = state.apiKey

    if (apiKey && state.activeProjectTab === 'dashboard' && config.headers && !config.headers['Authorization']) {
      config.headers['Authorization'] = 'API-KEY'
      config.headers['x-api-key'] = apiKey
    } else if (token && config.headers && !config.headers['Authorization']) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)


// Request interceptor: inject token for auth API (optional, if auth requires token)
authApi.interceptors.request.use(
  (config) => {
    const state = useAuthStore.getState()
    const token = state.accessToken
    const apiKey = state.apiKey

    if (apiKey && state.activeProjectTab === 'dashboard' && config.headers && !config.headers['Authorization']) {
      config.headers['Authorization'] = 'API-KEY'
      config.headers['x-api-key'] = apiKey
    } else if (token && config.headers && !config.headers['Authorization']) {
      config.headers.Authorization = `Bearer ${token}`
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
        state.setActiveView('home')
        state.logout()
        // if (typeof window !== 'undefined') window.location.href = '/'
        return Promise.reject(error)
      }

      try {
        const { data } = await authApi.put('/v2/refresh', null, {
          params: { refresh_token: refreshToken }
        })

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
        authState.setActiveView('home')
        authState.logout()
        // if (typeof window !== 'undefined') window.location.href = '/'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
