'use client'

import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useAuthStore } from '@/entities/session'
import { api, getApiErrorMessage, getApiErrorStatus } from '@/shared/api'
import { useRouter } from '@/shared/lib/i18n/navigation'

import type { Template } from './templates'

type LaunchTemplateOptions = {
  title: string
}

export const useTemplateLaunch = () => {
  const router = useRouter()
  const [launchingTemplateId, setLaunchingTemplateId] = useState<string | null>(null)
  // Drives the top-up modal the consumer renders when a paid template can't be
  // afforded (HTTP 402). `topUpProjectId` is the project whose balance is short.
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [topUpProjectId, setTopUpProjectId] = useState<string | null>(null)
  // One idempotency key per template, reused across retries so a network drop
  // after the charge already went through can't double-charge. Kept only while
  // the outcome is unknown (5xx / no response); cleared once we get a definitive
  // answer (success or a 4xx), where a fresh attempt should start clean.
  const idempotencyKeys = useRef<Record<string, string>>({})

  const launchTemplate = useCallback(
    async (template: Template, options: LaunchTemplateOptions) => {
      if (launchingTemplateId) return

      const project = useAuthStore.getState().project
      if (!project?.project_id || !project?.environment_id) {
        toast.error('Select a project first, then try again.')
        return
      }

      const idempotencyKey =
        idempotencyKeys.current[template.id] ??
        (idempotencyKeys.current[template.id] = crypto.randomUUID())

      setLaunchingTemplateId(template.id)

      try {
        const projectName = (options.title || 'Template project').trim().slice(0, 60)

        const { data } = await api.post(
          '/v1/ugen-template/create-project',
          {
            template_id: template.id,
            project_name: projectName,
            idempotency_key: idempotencyKey,
          },
          {
            params: { 'project-id': project.project_id },
            headers: { 'Environment-Id': project.environment_id },
          },
        )

        const mcpProjectId = data?.data?.mcp_project_id

        if (!mcpProjectId) {
          throw new Error('create-project response is missing mcp_project_id')
        }

        delete idempotencyKeys.current[template.id]
        router.push(`/projects/${mcpProjectId}`)
      } catch (error) {
        console.error('Failed to launch template', error)
        const status = getApiErrorStatus(error)
        // Retriable = server never gave a definitive answer, so any charge is
        // either unmade or was auto-refunded; keep the key for a safe retry.
        const retriable = status === undefined || status >= 500
        if (!retriable) delete idempotencyKeys.current[template.id]

        if (status === 402) {
          // Insufficient balance on the current project — offer a top-up.
          setTopUpProjectId(project.project_id)
          toast.error('Insufficient project balance', {
            description: 'Top up your balance to use this paid template.',
            action: {
              label: 'Top up',
              onClick: () => setTopUpOpen(true),
            },
          })
        } else if (status === 404) {
          toast.error('Template or project not found.')
        } else if (status === 401) {
          toast.error(getApiErrorMessage(error, 'Please sign in again.'))
        } else if (status === 400) {
          toast.error(getApiErrorMessage(error, 'Invalid request.'))
        } else {
          // 5xx / network: any charge was refunded automatically — retry is safe.
          toast.error(
            getApiErrorMessage(error, 'Something went wrong. Please try again.'),
          )
        }

        setLaunchingTemplateId(null)
      }
    },
    [launchingTemplateId, router],
  )

  return {
    launchTemplate,
    launchingTemplateId,
    topUpOpen,
    setTopUpOpen,
    topUpProjectId,
  }
}
