'use client'

import { useState, useMemo } from 'react'
import {
  Loader2,
  PlusCircle,
  Bot,
  Trash2,
  Edit,
  Play,
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
  Switch,
} from '@/shared/ui'
import { WorkspaceDataTable } from './workspace-data-table'
import { cn } from '@/shared/lib/utils/cn'
import { toast } from 'sonner'

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

const defaultForm = {
  name: '',
  description: '',
  instruction: '',
  model: 'claude-sonnet-4-6',
  max_steps: 8,
  enabled: true,
  permissions: [] as AgentPermission[],
}

const PermissionRow = ({
  perm,
  onChange,
  onRemove,
}: {
  perm: AgentPermission
  onChange: (updated: AgentPermission) => void
  onRemove: () => void
}) => {
  const toggle = (field: keyof AgentPermission) =>
    onChange({ ...perm, [field]: !perm[field as keyof AgentPermission] })

  const PermToggle = ({ field, label }: { field: keyof AgentPermission; label: string }) => (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input
        type="checkbox"
        checked={!!perm[field]}
        onChange={() => toggle(field)}
        className="w-3.5 h-3.5 accent-primary"
      />
      <span className="text-xs text-text-muted">{label}</span>
    </label>
  )

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border-subtle bg-bg-sidebar">
      <Input
        placeholder="table_slug"
        value={perm.table_slug}
        onChange={(e) => onChange({ ...perm, table_slug: e.target.value })}
        className="h-8 text-xs font-mono w-36 shrink-0"
      />
      <div className="flex flex-wrap gap-3 flex-1">
        <PermToggle field="can_list" label="list" />
        <PermToggle field="can_read" label="read" />
        <PermToggle field="can_create" label="create" />
        <PermToggle field="can_update" label="update" />
        <PermToggle field="can_delete" label="delete" />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-7 w-7 shrink-0 text-text-muted hover:text-destructive"
      >
        <Trash2 size={13} />
      </Button>
    </div>
  )
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', projectId] })
      setDeleteOpen(false)
      setEditingAgent(null)
      toast.success('Agent deleted')
    },
  })

  const openCreate = () => {
    setEditingAgent(null)
    setForm(defaultForm)
    setFormOpen(true)
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
      permissions: agent.permissions?.map((p) => ({ ...p })) ?? [],
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

  const addPermission = () =>
    setForm((prev) => ({
      ...prev,
      permissions: [
        ...(prev.permissions ?? []),
        { table_slug: '', can_create: false, can_read: true, can_update: false, can_delete: false, can_list: true },
      ],
    }))

  const updatePermission = (index: number, updated: AgentPermission) =>
    setForm((prev) => {
      const perms = [...prev.permissions]
      perms[index] = updated
      return { ...prev, permissions: perms }
    })

  const removePermission = (index: number) =>
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.filter((_, i) => i !== index),
    }))

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
        cell: ({ row }: any) =>
          row.original.enabled ? (
            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20 text-[10px] font-bold uppercase">
              enabled
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-text-muted/10 text-text-muted border border-border-subtle text-[10px] font-bold uppercase">
              disabled
            </span>
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
                setSelectedAgent(row.original)
                setView('runs')
              }}
              title="View runs"
            >
              <Play size={13} />
            </Button>
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
            {runsData?.map((run) => (
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
                        <p className="text-[10px] font-bold uppercase text-text-muted mb-2">Steps ({run.steps?.length})</p>
                        <div className="space-y-1.5">
                          {run.steps?.map((step) => (
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
                <Input
                  placeholder="claude-sonnet-4-6"
                  value={form.model}
                  className="rounded-xl border-border-subtle font-mono text-sm"
                  onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="One sentence for your reference"
                value={form.description}
                className="rounded-xl border-border-subtle"
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">System Prompt (instruction)</label>
              <textarea
                placeholder="You are a helpful assistant. When asked about..."
                value={form.instruction}
                onChange={(e) => setForm((p) => ({ ...p, instruction: e.target.value }))}
                rows={5}
                className="w-full rounded-xl border border-border-subtle bg-bg-sidebar px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Max Steps</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={form.max_steps}
                  className="rounded-xl border-border-subtle"
                  onChange={(e) => setForm((p) => ({ ...p, max_steps: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, enabled: v }))}
                />
                <span className="text-sm text-text-muted">Enabled</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Table Permissions</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addPermission}
                  className="h-7 text-xs text-primary hover:bg-primary/10 rounded-lg px-2"
                >
                  <PlusCircle size={12} className="mr-1" /> Add Table
                </Button>
              </div>
              {form.permissions?.length === 0 && (
                <p className="text-[12px] text-text-muted py-2">
                  No permissions yet — the agent can still use web_fetch.
                </p>
              )}
              <div className="space-y-2">
                {form.permissions?.map((perm, i) => (
                  <PermissionRow
                    key={i}
                    perm={perm}
                    onChange={(updated) => updatePermission(i, updated)}
                    onRemove={() => removePermission(i)}
                  />
                ))}
              </div>
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
