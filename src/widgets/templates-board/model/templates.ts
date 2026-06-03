import { api } from '@/shared/api'

export type Template = {
  id: string
  [key: string]: any
}

const unwrapList = (payload: any): Template[] => {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.templates)) return payload.templates
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload?.data?.templates)) return payload.data.templates
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

const unwrapItem = (payload: any): Template | null => {
  if (!payload) return null
  if (payload.id) return payload
  if (payload?.data?.id) return payload.data
  if (payload?.data?.template?.id) return payload.data.template
  return null
}

export const fetchTemplates = async (): Promise<Template[]> => {
  const { data } = await api.get('/v1/ugen-template')
  return unwrapList(data)
}

export const fetchTemplateDetail = async (id: string): Promise<Template | null> => {
  const { data } = await api.get(`/v1/ugen-template/${id}`)
  return unwrapItem(data)
}

export const fetchPublicTemplates = async (): Promise<Template[]> => {
  const { data } = await api.get('/v1/ugen-template/public')
  return unwrapList(data)
}

export const fetchPublicTemplateDetail = async (id: string): Promise<Template | null> => {
  const { data } = await api.get(`/v1/ugen-template/public/${id}`)
  return unwrapItem(data)
}

export const getTemplateTitle = (t: Template) =>
  t.name || t.title || 'Template'

export const getTemplateDescription = (t: Template) =>
  t.description || ''

export const getTemplateImage = (t: Template) =>
  t.photo || t.preview_image || t.image_url || t.image || t.thumbnail || ''

export const getTemplateDemoUrl = (t: Template) =>
  t.preview_url || t.demo_url || t.url || t.link || ''

export const getTemplatePrompt = (t: Template) =>
  t.request || t.prompt || `Recreate the template "${getTemplateTitle(t)}".`

export type ReactionType = 'like' | 'dislike'

const toCount = (v: any): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

// Counts + the current user's reaction may come back under a few different
// field names depending on the endpoint, so probe the likely ones (same
// defensive style as getTemplateTitle/Image above).
export const getTemplateLikeCount = (t: Template): number =>
  toCount(t.like_count ?? t.likes_count ?? t.likes ?? t.reaction_like_count)

export const getTemplateDislikeCount = (t: Template): number =>
  toCount(t.dislike_count ?? t.dislikes_count ?? t.dislikes ?? t.reaction_dislike_count)

export const getTemplateMyReaction = (t: Template): ReactionType | null => {
  // `current_user_reaction` is the field the backend actually returns ("" when
  // the user hasn't reacted); the rest are defensive fallbacks.
  const raw =
    t.current_user_reaction ??
    t.my_reaction ??
    t.user_reaction ??
    t.current_reaction ??
    t.reaction ??
    t.reaction_type
  const val =
    raw && typeof raw === 'object' ? (raw.reaction_type ?? raw.type ?? raw.value) : raw
  return val === 'like' || val === 'dislike' ? val : null
}

// POST a like/dislike. The backend replaces any previous reaction by the same
// user, so switching like↔dislike is a single create call (no delete first).
export const createTemplateReaction = async (id: string, reaction: ReactionType) => {
  const { data } = await api.post(`/v1/ugen-template/${id}/reaction`, {
    reaction_type: reaction,
  })
  return data
}

// Remove the current user's reaction from a template.
export const deleteTemplateReaction = async (id: string) => {
  const { data } = await api.delete(`/v1/ugen-template/${id}/reaction`)
  return data
}
