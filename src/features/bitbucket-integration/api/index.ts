import { api } from '@/shared/api'
import type {
  BitbucketIntegration,
  BitbucketRepo,
  BitbucketScope,
  BitbucketValidationResult,
  CreateRepoPayload,
} from '../model/types'

// Mirrors gitlabIntegrationApi. Endpoints live under the `bitbucket` prefix and
// are scoped to a project environment via project_id + environment_id.
export const bitbucketIntegrationApi = {
  getConnectUrl: async (scope: BitbucketScope): Promise<string> => {
    const { data } = await api.get('/v1/bitbucket/connect', { params: scope })
    if (data.status !== 'OK') throw new Error(data.data)
    return data.data
  },

  getIntegration: async (scope: BitbucketScope): Promise<BitbucketIntegration | null> => {
    try {
      const { data } = await api.get('/v1/bitbucket/integration', { params: scope })
      if (data.status === 'OK') return data.data
      return null
    } catch (err: any) {
      if (err?.response?.data?.status === 'NOT_FOUND') return null
      throw err
    }
  },

  validate: async (scope: BitbucketScope): Promise<BitbucketValidationResult> => {
    try {
      const { data } = await api.get('/v1/bitbucket/integration/validate', { params: scope })
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
    const { data } = await api.delete(`/v1/bitbucket/integration/${id}`)
    if (data.status !== 'OK') throw new Error(data.data)
  },

  listRepos: async (scope: BitbucketScope): Promise<BitbucketRepo[]> => {
    const { data } = await api.get('/v1/bitbucket/repos', { params: scope })
    if (data.status !== 'OK') throw new Error(data.data)
    return data.data
  },

  createRepo: async (scope: BitbucketScope, payload: CreateRepoPayload): Promise<BitbucketRepo> => {
    const { data } = await api.post('/v1/bitbucket/repo', payload, { params: scope })
    if (data.status !== 'CREATED') throw new Error(data.data)
    return data.data
  },
}
