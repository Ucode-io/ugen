export interface GithubUser {
  id: number
  login: string
  name: string
  email: string
  avatar_url: string
  bio: string
  html_url: string
}

export interface GithubIntegration {
  id: string
  username: string
  name: string
  project_id: string
  environment_id: string
}

export interface GithubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  description: string
  html_url: string
  clone_url: string
  language: string
  default_branch: string
  owner: {
    id: number
    login: string
    avatar_url: string
    html_url: string
  }
}

export interface CreateRepoPayload {
  name: string
  description?: string
  private?: boolean
  auto_init?: boolean
}

export type GithubValidationResult =
  | { connected: true; user: GithubUser }
  | { connected: false; reason: 'not_connected' | 'token_expired' }
