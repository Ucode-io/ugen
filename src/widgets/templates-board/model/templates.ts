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
