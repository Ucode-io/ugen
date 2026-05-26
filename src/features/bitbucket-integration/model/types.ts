export interface BitbucketUser {
  id: number
  username: string
  name: string
  email: string
  avatar_url: string
  bio: string
  web_url: string
}

export interface BitbucketIntegration {
  id: string
  username: string
  name: string
  project_id: string
  environment_id: string
}

export interface BitbucketRepo {
  id: number
  name: string
  full_name: string
  is_private: boolean
  description: string
  web_url: string
  clone_url: string
  default_branch: string
  workspace: {
    id: number
    name: string
    avatar_url: string
    web_url: string
  }
}

export interface CreateRepoPayload {
  name: string
  description?: string
  is_private?: boolean
}

// Like GitLab, a Bitbucket connection is bound to a project environment, so
// every call is scoped by project_id + environment_id.
export interface BitbucketScope {
  project_id: string
  environment_id: string
}

export type BitbucketValidationResult =
  | { connected: true; user: BitbucketUser }
  | { connected: false; reason: 'not_connected' | 'token_expired' }
