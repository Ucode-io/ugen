import { api } from '@/shared/api'
import type {
  GithubIntegration,
  GithubRepo,
  GithubValidationResult,
  CreateRepoPayload,
} from '../model/types'

export const githubIntegrationApi = {
  getConnectUrl: async (): Promise<string> => {
    const { data } = await api.get('/v1/github/connect')
    if (data.status !== 'OK') throw new Error(data.data)
    return data.data
  },

  getIntegration: async (): Promise<GithubIntegration | null> => {
    try {
      const { data } = await api.get('/v1/github/integration')
      if (data.status === 'OK') return data.data
      return null
    } catch (err: any) {
      if (err?.response?.data?.status === 'NOT_FOUND') return null
      throw err
    }
  },

  validate: async (): Promise<GithubValidationResult> => {
    try {
      const { data } = await api.get('/v1/github/integration/validate')
      if (data.status === 'OK') return { connected: true, user: data.data }
      return { connected: false, reason: 'not_connected' }
    } catch (err: any) {
      const status = err?.response?.data?.status
      if (status === 'NOT_FOUND') return { connected: false, reason: 'not_connected' }
      if (status === 'UNAUTHORIZED') return { connected: false, reason: 'token_expired' }
      throw err
    }
  },

  disconnect: async (id: string): Promise<void> => {
    const { data } = await api.delete(`/v1/github/integration/${id}`)
    if (data.status !== 'OK') throw new Error(data.data)
  },

  listRepos: async (): Promise<GithubRepo[]> => {
    const { data } = await api.get('/v1/github/repos')
    if (data.status !== 'OK') throw new Error(data.data)
    return data.data
  },

  createRepo: async (payload: CreateRepoPayload): Promise<GithubRepo> => {
    const { data } = await api.post('/v1/github/repo', payload)
    if (data.status !== 'CREATED') throw new Error(data.data)
    return data.data
  },
}
