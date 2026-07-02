// Helpers for turning a thrown axios/gateway error into something the UI can
// show. The gateway wraps every response in `{ status, description, data,
// custom_message }`; on failure the specific message lives in `data` (a plain
// string), so prefer that over the generic `description`.

/** HTTP status from a thrown axios error, or undefined for a non-HTTP failure. */
export const getApiErrorStatus = (err: unknown): number | undefined =>
  (err as { response?: { status?: number } } | undefined)?.response?.status

/**
 * Pull a human-readable message out of the gateway envelope. Prefers the
 * specific `data` string, then `custom_message`, then the generic
 * `description`, then the axios/JS message, falling back to `fallback`.
 */
export const getApiErrorMessage = (err: unknown, fallback: string): string => {
  const envelope = (err as { response?: { data?: Record<string, unknown> } })
    ?.response?.data
  if (envelope) {
    if (typeof envelope.data === 'string' && envelope.data.trim())
      return envelope.data
    if (
      typeof envelope.custom_message === 'string' &&
      envelope.custom_message.trim()
    )
      return envelope.custom_message
    if (typeof envelope.description === 'string' && envelope.description.trim())
      return envelope.description
  }
  const message = (err as { message?: string })?.message
  return message || fallback
}
