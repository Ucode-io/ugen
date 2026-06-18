'use client'

import { useState, useMemo, useRef, useEffect, type TextareaHTMLAttributes } from 'react'
import {
  Loader2,
  PlusCircle,
  Bot,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api'
import {
  Button,
  Input,
  DataLoadingState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/ui'
import { WorkspaceDataTable } from './workspace-data-table'
import { cn } from '@/shared/lib/utils/cn'
import { toast } from 'sonner'
import { useChatStore } from '@/entities/chat'

// Textarea that grows to fit its content instead of scrolling.
const AutoResizeTextarea = ({
  value,
  className,
  minRows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) => {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      className={cn('resize-none overflow-hidden', className)}
      {...props}
    />
  )
}

interface AgentPermission {
  id?: string
  agent_id?: string
  table_slug: string
  can_create: boolean
  can_read: boolean
  can_update: boolean
  can_delete: boolean
  can_list: boolean
}

interface Agent {
  id: string
  project_id: string
  name: string
  description: string
  instruction: string
  model: string
  max_steps: number
  enabled: boolean
  permissions: AgentPermission[]
  created_at: string
  updated_at: string
}

interface AgentRunStep {
  index: number
  tool_name: string
  tool_input: Record<string, unknown>
  tool_result: string
  is_error: boolean
}

interface AgentRun {
  id: string
  agent_id: string
  status: 'running' | 'succeeded' | 'failed'
  input: { message: string; context?: Record<string, unknown> }
  output: string
  steps: AgentRunStep[]
  tokens_used: number
  error: string
  created_at: string
}

const TOOL_LABELS: Record<string, string> = {
  item_create: 'Create record',
  item_get: 'Read record',
  item_list: 'List records',
  item_update: 'Update record',
  item_delete: 'Delete record',
  web_fetch: 'Fetch URL',
}

const AGENT_MODELS = [
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-sonnet-4-7',
  'claude-sonnet-4-6',
  'claude-haiku-4-6',
  'claude-haiku-4-5',
  'gpt-5.5-pro',
  'gpt-5.5',
  'gpt-5.4-pro',
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.4-nano',
  'gemini-2.5-flash',
]

const defaultForm = {
  name: '',
  description: '',
  instruction: '',
  model: 'claude-sonnet-4-6',
  max_steps: 8,
  enabled: true,
  permissions: [] as AgentPermission[],
}

const RunStatusBadge = ({ status }: { status: AgentRun['status'] }) => {
  if (status === 'succeeded') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-500/10 text-green-600 border border-green-500/20">
        <CheckCircle2 size={10} /> succeeded
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-destructive/10 text-destructive border border-destructive/20">
        <XCircle size={10} /> failed
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20">
      <Clock size={10} /> running
    </span>
  )
}

interface AgentsPageProps {
  projectId: string
}

type View = 'list' | 'runs'

export const AgentsPage = ({ projectId }: AgentsPageProps) => {
  const [view, setView] = useState<View>('list')
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isFormOpen, setFormOpen] = useState(false)
  const [isDeleteOpen, setDeleteOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const setInputDraft = useChatStore((s) => s.setInputDraft)

  const { data: agentsData, isLoading } = useQuery({
    queryKey: ['agents', projectId],
    queryFn: async () => {
      const { data } = await api.get('/v1/agents', { params: { project_id: projectId, limit: 100 } })
      return (data?.data?.agents ?? []) as Agent[]
    },
    enabled: !!projectId,
  })

  const { data: runsData, isLoading: isRunsLoading } = useQuery({
    queryKey: ['agent-runs', selectedAgent?.id],
    queryFn: async () => {
      const { data } = await api.get(`/v1/agents/${selectedAgent!.id}/runs`, {
        params: { limit: 50, order_direction: 'desc' },
      })
      return (data?.data?.agent_runs ?? []) as AgentRun[]
    },
    enabled: !!selectedAgent && view === 'runs',
  })

  const createMutation = useMutation({
    mutationFn: (body: typeof defaultForm) => api.post('/v1/agents', { ...body, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', projectId] })
      setFormOpen(false)
      setEditingAgent(null)
      toast.success('Agent created')
    },
    onError: () => toast.error('Failed to save agent'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: typeof defaultForm }) =>
      api.put(`/v1/agents/${id}`, { ...body, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', projectId] })
      setFormOpen(false)
      setEditingAgent(null)
      toast.success('Agent updated')
    },
    onError: () => toast.error('Failed to save agent'),
  })

  // Toggle enabled directly from the table status badge (no modal). Optimistic
  // so the badge flips instantly; rolls back on error.
  const toggleEnabledMutation = useMutation({
    mutationFn: ({ agent, enabled }: { agent: Agent; enabled: boolean }) =>
      api.put(`/v1/agents/${agent.id}`, {
        name: agent.name,
        description: agent.description,
        instruction: agent.instruction,
        model: agent.model,
        max_steps: agent.max_steps,
        permissions: agent.permissions,
        enabled,
        project_id: projectId,
      }),
    onMutate: async ({ agent, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ['agents', projectId] })
      const prev = queryClient.getQueryData<Agent[]>(['agents', projectId])
      queryClient.setQueryData<Agent[]>(['agents', projectId], (old) =>
        (old ?? []).map((a) => (a.id === agent.id ? { ...a, enabled } : a)),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['agents', projectId], ctx.prev)
      toast.error('Failed to update status')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['agents', projectId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', projectId] })
      setDeleteOpen(false)
      setEditingAgent(null)
      toast.success('Agent deleted')
    },
  })

  // "New Agent" no longer opens the modal — it seeds the chat input so the user
  // describes the agent in the AI chat instead.
  const openCreate = () => {
    setInputDraft('Create an agent ')
  }

  const openEdit = (agent: Agent) => {
    setEditingAgent(agent)
    setForm({
      name: agent.name,
      description: agent.description,
      instruction: agent.instruction,
      model: agent.model,
      max_steps: agent.max_steps,
      enabled: agent.enabled,
      permissions: agent.permissions.map((p) => ({ ...p })),
    })
    setFormOpen(true)
  }

  const handleSave = () => {
    if (editingAgent) {
      updateMutation.mutate({ id: editingAgent.id, body: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-text-main">{row.original.name}</p>
              {row.original.description && (
                <p className="text-[11px] text-text-muted truncate max-w-[260px]">{row.original.description}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'model',
        header: 'Model',
        cell: ({ row }: any) => (
          <span className="text-[11px] font-mono text-text-muted">{row.original.model}</span>
        ),
      },
      {
        accessorKey: 'max_steps',
        header: 'Max Steps',
        cell: ({ row }: any) => (
          <span className="text-[12px] text-text-muted">{row.original.max_steps}</span>
        ),
      },
      {
        accessorKey: 'enabled',
        header: 'Status',
        cell: ({ row }: any) => (
          <button
            type="button"
            title="Toggle status"
            onClick={(e) => {
              e.stopPropagation()
              toggleEnabledMutation.mutate({
                agent: row.original,
                enabled: !row.original.enabled,
              })
            }}
            className={cn(
              'px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase transition-colors cursor-pointer',
              row.original.enabled
                ? 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20'
                : 'bg-text-muted/10 text-text-muted border-border-subtle hover:bg-text-muted/20',
            )}
          >
            {row.original.enabled ? 'enabled' : 'disabled'}
          </button>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
              onClick={(e) => {
                e.stopPropagation()
                openEdit(row.original)
              }}
              title="Edit"
            >
              <Edit size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                setEditingAgent(row.original)
                setDeleteOpen(true)
              }}
              title="Delete"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  if (view === 'runs' && selectedAgent) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setView('list'); setSelectedAgent(null) }}
            className="h-8 w-8 rounded-lg"
          >
            <ChevronLeft size={16} />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot size={16} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-main leading-tight">{selectedAgent.name}</h1>
              <p className="text-xs text-text-muted">Run history</p>
            </div>
          </div>
        </div>

        {isRunsLoading ? (
          <DataLoadingState message="Loading run history..." />
        ) : !runsData?.length ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] border border-dashed border-border-subtle rounded-2xl p-8 text-center">
            <div className="bg-primary/5 p-4 rounded-full mb-4">
              <Zap size={28} className="text-primary/40" />
            </div>
            <h3 className="text-base font-medium text-text-main">No runs yet</h3>
            <p className="text-text-muted text-sm mt-1 max-w-xs">This agent has not been invoked yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {runsData.map((run) => (
              <div
                key={run.id}
                className="border border-border-subtle rounded-xl bg-bg-card overflow-hidden"
              >
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-sidebar/50 transition-colors text-left"
                  onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                >
                  <RunStatusBadge status={run.status} />
                  <p className="text-[12px] text-text-muted truncate flex-1">{run.input?.message}</p>
                  <span className="text-[11px] text-text-muted shrink-0 flex items-center gap-1">
                    <Zap size={10} /> {run.tokens_used} tokens
                  </span>
                  <span className="text-[11px] text-text-muted shrink-0">
                    {new Date(run.created_at).toLocaleString()}
                  </span>
                  {expandedRun === run.id ? <ChevronUp size={14} className="text-text-muted shrink-0" /> : <ChevronDown size={14} className="text-text-muted shrink-0" />}
                </button>

                {expandedRun === run.id && (
                  <div className="border-t border-border-subtle px-4 py-3 space-y-3">
                    {run.output && (
                      <div>
                        <p className="text-[10px] font-bold uppercase text-text-muted mb-1">Output</p>
                        <p className="text-[12px] text-text-main whitespace-pre-wrap">{run.output}</p>
                      </div>
                    )}
                    {run.error && (
                      <div>
                        <p className="text-[10px] font-bold uppercase text-destructive mb-1">Error</p>
                        <p className="text-[12px] text-destructive">{run.error}</p>
                      </div>
                    )}
                    {run.steps?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase text-text-muted mb-2">Steps ({run.steps.length})</p>
                        <div className="space-y-1.5">
                          {run.steps.map((step) => (
                            <div
                              key={step.index}
                              className={cn(
                                'flex items-start gap-2.5 p-2.5 rounded-lg text-[11px]',
                                step.is_error ? 'bg-destructive/5 border border-destructive/20' : 'bg-bg-sidebar border border-border-subtle',
                              )}
                            >
                              <span className="font-bold text-text-muted w-4 shrink-0">{step.index + 1}.</span>
                              <span className={cn('font-semibold shrink-0', step.is_error ? 'text-destructive' : 'text-primary')}>
                                {TOOL_LABELS[step.tool_name] ?? step.tool_name}
                              </span>
                              <span className="font-mono text-text-muted truncate flex-1">
                                {JSON.stringify(step.tool_input)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight">AI Agents</h1>
          <p className="text-text-muted text-sm mt-1">
            Create server-side AI assistants that read and write your project data.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-white rounded-lg h-8 px-3 text-[13px] font-medium"
        >
          <PlusCircle size={14} className="mr-1.5" />
          New Agent
        </Button>
      </div>

      {isLoading ? (
        <DataLoadingState message="Loading agents..." />
      ) : agentsData?.length ? (
        <WorkspaceDataTable columns={columns} data={agentsData} />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-bg-card border border-dashed border-border-subtle rounded-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-primary/5 p-4 rounded-full mb-4">
            <Bot size={32} className="text-primary/40" />
          </div>
          <h3 className="text-lg font-medium text-text-main">No agents yet</h3>
          <p className="text-text-muted text-sm max-w-xs mt-1">
            Create your first AI agent to automate tasks and answer questions about your data.
          </p>
          <Button onClick={openCreate} className="mt-5 bg-primary text-white rounded-xl px-5">
            <PlusCircle size={14} className="mr-2" /> Create Agent
          </Button>
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAgent ? 'Edit Agent' : 'Create Agent'}</DialogTitle>
            <DialogDescription>
              Configure the agent's identity, model, and table permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Company Assistant"
                  value={form.name}
                  className="rounded-xl border-border-subtle"
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Model</label>
                <Select
                  value={form.model}
                  onValueChange={(v) => setForm((p) => ({ ...p, model: v }))}
                >
                  <SelectTrigger className="rounded-xl border-border-subtle font-mono text-sm">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48 overflow-y-auto">
                    {AGENT_MODELS.map((m) => (
                      <SelectItem key={m} value={m} className="font-mono text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <AutoResizeTextarea
                placeholder="One sentence for your reference"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                minRows={3}
                className="w-full rounded-xl border border-border-subtle bg-bg-sidebar px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">System Prompt (instruction)</label>
              <AutoResizeTextarea
                placeholder="You are a helpful assistant. When asked about..."
                value={form.instruction}
                onChange={(e) => setForm((p) => ({ ...p, instruction: e.target.value }))}
                minRows={5}
                className="w-full rounded-xl border border-border-subtle bg-bg-sidebar px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              disabled={!form.name || !form.instruction || isSaving}
              onClick={handleSave}
              className="bg-primary text-white rounded-xl"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAgent ? 'Save Changes' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 size={18} /> Delete Agent
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-bold text-text-main">{editingAgent?.name}</span>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(editingAgent!.id)}
              className="rounded-xl"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
