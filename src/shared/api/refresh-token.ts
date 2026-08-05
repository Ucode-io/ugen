export interface RefreshTokenData {
  access_token: string
  refresh_token?: string
}

type HeaderContainer = Record<string, unknown> | { get?: (name: string) => unknown } | null | undefined

export const extractRefreshTokenData = (data: any): RefreshTokenData | null => {
  const tokenData = data?.data?.response?.token || data?.data?.token || data?.data || data?.response?.token || data

  return typeof tokenData?.access_token === 'string' && tokenData.access_token ? tokenData : null
}

export const getAuthorizationHeader = (headers: HeaderContainer): string => {
  if (!headers) return ''

  const getter = 'get' in headers && typeof headers.get === 'function' ? headers.get.bind(headers) : null
  const value =
    getter?.('Authorization') ??
    getter?.('authorization') ??
    (headers as Record<string, unknown>).Authorization ??
    (headers as Record<string, unknown>).authorization

  return typeof value === 'string' ? value : ''
}

export const usesBearerAuthorization = (headers: HeaderContainer): boolean =>
  /^Bearer\s+\S+/i.test(getAuthorizationHeader(headers))

export const getHttpStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined
  const response = (error as { response?: { status?: unknown } }).response
  return typeof response?.status === 'number' ? response.status : undefined
}

// Only an explicit auth rejection proves that the refresh token is unusable.
// Timeouts, offline errors, 5xx responses, and malformed successful responses
// must keep the local session so the next request can retry.
export const isTerminalRefreshFailure = (error: unknown): boolean => {
  const status = getHttpStatus(error)
  return status === 400 || status === 401 || status === 403
}
