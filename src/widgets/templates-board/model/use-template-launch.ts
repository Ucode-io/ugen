'use client'

import { useCallback, useState } from 'react'

import { useAuthStore } from '@/entities/session'
import { githubApi } from '@/shared/api'
import { useRouter } from '@/shared/lib/i18n/navigation'

import type { Template } from './templates'

type LaunchTemplateOptions = {
  title: string
}

export const useTemplateLaunch = () => {
  const router = useRouter()
  const [launchingTemplateId, setLaunchingTemplateId] = useState<string | null>(null)

  const launchTemplate = useCallback(async (template: Template, options: LaunchTemplateOptions) => {
    if (launchingTemplateId) return

    const project = useAuthStore.getState().project
    if (!project?.project_id || !project?.environment_id) {
      console.error('Cannot launch template: missing target project_id or environment_id')
      return
    }

    setLaunchingTemplateId(template.id)

    try {
      const projectName = (options.title || 'Template project').trim().slice(0, 60)

      const { data } = await githubApi.post(
        '/v1/ugen-template/create-project',
        {
          template_id: template.id,
          project_name: projectName,
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

      router.push(`/projects/${mcpProjectId}`)
    } catch (error) {
      console.error('Failed to launch template', error)
      setLaunchingTemplateId(null)
    }
  }, [launchingTemplateId, router])

  return {
    launchTemplate,
    launchingTemplateId,
  }
}
