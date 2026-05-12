'use client'

import { useCallback, useState } from 'react'

import { useChatStore } from '@/entities/chat'
import { DEFAULT_MODEL_ID } from '@/entities/ai-model'
import { api } from '@/shared/api'
import { useRouter } from '@/shared/lib/i18n/navigation'

import type { Template } from './templates'

type LaunchTemplateOptions = {
  title: string
  model?: string
}

export const useTemplateLaunch = () => {
  const router = useRouter()
  const clearChat = useChatStore((state) => state.clearChat)
  const setChatId = useChatStore((state) => state.setChatId)
  const setProjectId = useChatStore((state) => state.setProjectId)
  const setPendingPrompt = useChatStore((state) => state.setPendingPrompt)
  const [launchingTemplateId, setLaunchingTemplateId] = useState<string | null>(null)

  const launchTemplate = useCallback(async (template: Template, options: LaunchTemplateOptions) => {
    if (launchingTemplateId) return

    setLaunchingTemplateId(template.id)

    try {
      const title = options.title.trim() || 'Template project'
      const model = options.model || DEFAULT_MODEL_ID

      clearChat()

      const { data } = await api.post('/v1/ai-chat', {
        title: title.slice(0, 30),
        project_name: title.slice(0, 20),
        description: `Template: ${template.id}`,
        model,
      })

      const chatId = data?.data?.id
      const projectId = data?.data?.project_id

      if (!chatId || !projectId) {
        throw new Error('Template project creation response is missing chat or project id')
      }

      setChatId(chatId)
      setProjectId(projectId)
      setPendingPrompt({
        content: template.request,
        model,
      })

      router.push(`/projects/${projectId}?template=${template.id}&tab=preview`)
    } catch (error) {
      console.error('Failed to launch template', error)
      setLaunchingTemplateId(null)
    }
  }, [clearChat, launchingTemplateId, router, setChatId, setPendingPrompt, setProjectId])

  return {
    launchTemplate,
    launchingTemplateId,
  }
}
