export interface GitlabUser {
  id: number
  username: string
  name: string
  email: string
  avatar_url: string
  bio: string
  web_url: string
}

export interface GitlabIntegration {
  id: string
  username: string
  name: string
  project_id: string
  environment_id: string
}

export interface GitlabRepo {
  id: number
  name: string
  path_with_namespace: string
  visibility: string
  description: string
  web_url: string
  http_url_to_repo: string
  default_branch: string
  namespace: {
    id: number
    name: string
    avatar_url: string
    web_url: string
  }
}

export interface CreateRepoPayload {
  name: string
  description?: string
  visibility?: 'private' | 'public' | 'internal'
  initialize_with_readme?: boolean
}

// project_id + environment_id scope every GitLab call — unlike the user-level
// GitHub integration, a GitLab connection is bound to a project environment.
export interface GitlabScope {
  project_id: string
  environment_id: string
}

export type GitlabValidationResult =
  | { connected: true; user: GitlabUser }
  | { connected: false; reason: 'not_connected' | 'token_expired' }
