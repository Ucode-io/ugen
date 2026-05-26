import { api } from '@/shared/api'
import type {
  GitlabIntegration,
  GitlabRepo,
  GitlabScope,
  GitlabValidationResult,
  CreateRepoPayload,
} from '../model/types'

// Mirrors githubIntegrationApi, but every endpoint is scoped to a project
// environment via project_id + environment_id query params (the GitLab backend
// uses the `ext-gitlab` prefix and is environment-bound).
export const gitlabIntegrationApi = {
  getConnectUrl: async (scope: GitlabScope): Promise<string> => {
    const { data } = await api.get('/v1/ext-gitlab/connect', { params: scope })
    if (data.status !== 'OK') throw new Error(data.data)
    return data.data
  },

  getIntegration: async (scope: GitlabScope): Promise<GitlabIntegration | null> => {
    try {
      const { data } = await api.get('/v1/ext-gitlab/integration', { params: scope })
      if (data.status === 'OK') return data.data
      return null
    } catch (err: any) {
      if (err?.response?.data?.status === 'NOT_FOUND') return null
      throw err
    }
  },

  validate: async (scope: GitlabScope): Promise<GitlabValidationResult> => {
    try {
      const { data } = await api.get('/v1/ext-gitlab/integration/validate', { params: scope })
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
    const { data } = await api.delete(`/v1/ext-gitlab/integration/${id}`)
    if (data.status !== 'OK') throw new Error(data.data)
  },

  listRepos: async (scope: GitlabScope): Promise<GitlabRepo[]> => {
    const { data } = await api.get('/v1/ext-gitlab/repos', { params: scope })
    if (data.status !== 'OK') throw new Error(data.data)
    return data.data
  },

  createRepo: async (scope: GitlabScope, payload: CreateRepoPayload): Promise<GitlabRepo> => {
    const { data } = await api.post('/v1/ext-gitlab/repo', payload, { params: scope })
    if (data.status !== 'CREATED') throw new Error(data.data)
    return data.data
  },
}
