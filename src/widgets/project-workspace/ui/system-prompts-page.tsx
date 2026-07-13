'use client'

import { useEffect, useState } from 'react'
import { Loader2, RotateCcw, Save, Sparkles } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/shared/api'
import { useAuthStore } from '@/entities/session'
import { Button, DataLoadingState, ReusableTabs } from '@/shared/ui'

type PromptKind = 'code_editor' | 'visual_editor'

interface SystemPrompt {
  prompt_kind: PromptKind
  content: string
  default_content: string
  custom_content: string | null
  source: 'default' | 'custom'
  revision: number
}

const promptLabels: Record<PromptKind, { title: string; description: string }> = {
  code_editor: {
    title: 'Code editor',
    description: 'Instructions used by AI when it edits generated code.',
  },
  visual_editor: {
    title: 'Visual editor',
    description: 'Instructions used by AI when it applies visual changes.',
  },
}

export const SystemPromptsPage = ({ projectId, promptKind }: { projectId: string; promptKind?: PromptKind }) => {
  const environmentId = useAuthStore((state) => state.projectEnvId)
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<PromptKind, string>>({ code_editor: '', visual_editor: '' })
  const [activePromptKind, setActivePromptKind] = useState<PromptKind>(promptKind ?? 'code_editor')

  const requestConfig = {
    params: { 'project-id': projectId },
    headers: { 'Environment-Id': environmentId ?? '' },
  }

  const promptsQuery = useQuery({
    queryKey: ['ai-edit-prompts', projectId, environmentId],
    enabled: Boolean(projectId && environmentId),
    queryFn: async () => {
      const { data } = await api.get('/v1/ai-edit-prompts', requestConfig)
      return (data?.data?.prompts ?? []) as SystemPrompt[]
    },
  })

  useEffect(() => {
    if (!promptsQuery.data) return
    setDrafts((current) => {
      const next = { ...current }
      for (const prompt of promptsQuery.data) next[prompt.prompt_kind] = prompt.content
      return next
    })
  }, [promptsQuery.data])

  useEffect(() => {
    if (promptKind) setActivePromptKind(promptKind)
  }, [promptKind])

  const saveMutation = useMutation({
    mutationFn: async ({ prompt, content }: { prompt: SystemPrompt; content: string }) => {
      const { data } = await api.put(`/v1/ai-edit-prompts/${prompt.prompt_kind}`, {
        content,
        expected_revision: prompt.revision,
      }, requestConfig)
      return data?.data as SystemPrompt
    },
    onSuccess: () => {
      toast.success('System prompt saved')
      queryClient.invalidateQueries({ queryKey: ['ai-edit-prompts', projectId] })
    },
    onError: () => toast.error('Could not save system prompt. It may have changed elsewhere.'),
  })

  const resetMutation = useMutation({
    mutationFn: async (prompt: SystemPrompt) => {
      const { data } = await api.delete(`/v1/ai-edit-prompts/${prompt.prompt_kind}`, {
        ...requestConfig,
        params: { ...requestConfig.params, expected_revision: prompt.revision },
      })
      return data?.data as SystemPrompt
    },
    onSuccess: () => {
      toast.success('System prompt reset to default')
      queryClient.invalidateQueries({ queryKey: ['ai-edit-prompts', projectId] })
    },
    onError: () => toast.error('Could not reset system prompt. It may have changed elsewhere.'),
  })

  if (!environmentId || promptsQuery.isLoading) return <DataLoadingState message="Loading system prompts..." />
  if (promptsQuery.isError) {
    return <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">Failed to load system prompts. Please try again.</div>
  }

  const prompts = (['code_editor', 'visual_editor'] as PromptKind[])
    .map((kind) => promptsQuery.data?.find((prompt) => prompt.prompt_kind === kind))
    .filter((prompt): prompt is SystemPrompt => Boolean(prompt))
    .filter((prompt) => !promptKind || prompt.prompt_kind === promptKind)
  const activePrompt = prompts.find((prompt) => prompt.prompt_kind === activePromptKind) ?? prompts[0]

  if (!activePrompt) {
    return <div className="rounded-xl border border-border-subtle bg-bg-card p-6 text-sm text-text-muted">No system prompts are available for this project.</div>
  }

  const meta = promptLabels[activePrompt.prompt_kind]
  const isSaving = saveMutation.isPending && saveMutation.variables?.prompt.prompt_kind === activePrompt.prompt_kind
  const isResetting = resetMutation.isPending && resetMutation.variables?.prompt_kind === activePrompt.prompt_kind
  const isDirty = drafts[activePrompt.prompt_kind] !== activePrompt.content

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-text-main">System prompt</h1>
        </div>
        <p className="mt-1 text-sm text-text-muted">Customize the instructions used by AI in this project.</p>
      </div>

      {prompts.length > 1 && (
        <ReusableTabs
          activeId={activePrompt.prompt_kind}
          onTabChange={(id) => setActivePromptKind(id as PromptKind)}
          size="lg"
          options={prompts.map((prompt) => ({
            id: prompt.prompt_kind,
            label: promptLabels[prompt.prompt_kind].title,
            icon: <Sparkles size={15} />,
          }))}
          className="w-full"
          tabClassName="flex-1"
        />
      )}

      <section className="rounded-2xl border border-border-subtle bg-bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-main">{meta.title}</h2>
            <p className="mt-1 text-sm text-text-muted">{meta.description}</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">{activePrompt.source}</span>
        </div>
        <textarea
          value={drafts[activePrompt.prompt_kind]}
          onChange={(event) => setDrafts((current) => ({ ...current, [activePrompt.prompt_kind]: event.target.value }))}
          className="min-h-[560px] w-full resize-y rounded-xl border border-border-subtle bg-bg-sidebar p-4 font-mono text-sm leading-6 text-text-main outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          spellCheck={false}
        />
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs text-text-muted">Revision {activePrompt.revision}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={isSaving || isResetting || activePrompt.source === 'default'} onClick={() => resetMutation.mutate(activePrompt)}>
              {isResetting ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <RotateCcw size={14} className="mr-1.5" />}
              Reset
            </Button>
            <Button size="sm" disabled={!isDirty || isSaving || isResetting} onClick={() => saveMutation.mutate({ prompt: activePrompt, content: drafts[activePrompt.prompt_kind] })}>
              {isSaving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Save size={14} className="mr-1.5" />}
              Save
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
