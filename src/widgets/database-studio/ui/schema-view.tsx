'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Download, RefreshCw, Check, ShieldOff } from 'lucide-react'
import {
  useDatabaseStore,
  useTableSchemaV2,
  useAddSchemaField,
  useDeleteSchemaField,
  useUpdateSchemaField,
  SchemaColumn,
} from '@/entities/database'
import { Skeleton } from '@/shared/ui'
import { cn } from '@/shared/lib/utils/cn'
import { useAuthStore } from '@/entities/session'
import { toast } from 'sonner'

// ─────────────────────────────────────────────────────────────────────────────
// Protected fields — cannot be deleted
// ─────────────────────────────────────────────────────────────────────────────

const PROTECTED_FIELDS = new Set(['guid', 'created_at', 'updated_at', 'deleted_at'])

// ─────────────────────────────────────────────────────────────────────────────
// PostgreSQL types
// ─────────────────────────────────────────────────────────────────────────────

const PG_TYPES = [
  'character varying', 'varchar', 'text', 'citext',
  'integer', 'smallint', 'bigint', 'int2', 'int4', 'int8', 'serial',
  'numeric', 'decimal', 'real', 'double precision', 'money',
  'boolean', 'uuid', 'jsonb', 'json', 'date',
  'timestamp', 'timestamptz', 'timestamp with time zone',
  'timestamp without time zone', 'text[]', 'uuid[]',
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Shared field payload type
// ─────────────────────────────────────────────────────────────────────────────

interface FieldPayload {
  id: string
  slug: string
  label: string
  type: string
  table_id: string
  index: string
  required: boolean
  show_label: boolean
  is_visible: boolean
  attributes: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Constraint badge
// ─────────────────────────────────────────────────────────────────────────────

type ConstraintVariant = 'pk' | 'fk' | 'nn' | 'uq' | 'df' | 'ai'

const CONSTRAINT_STYLES: Record<ConstraintVariant, string> = {
  pk: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  fk: 'bg-blue-500/10   text-blue-400   border border-blue-500/20',
  nn: 'bg-red-500/10    text-red-400    border border-red-500/20',
  uq: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  df: 'bg-green-500/10  text-green-400  border border-green-500/20',
  ai: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
}

function constraintVariant(label: string): ConstraintVariant {
  const l = label.toUpperCase()
  if (l === 'PK' || l.includes('PRIMARY')) return 'pk'
  if (l === 'FK' || l.includes('FOREIGN')) return 'fk'
  if (l.includes('NOT NULL') || l === 'NN') return 'nn'
  if (l.includes('UNIQUE') || l === 'UQ') return 'uq'
  if (l.includes('AUTO') || l === 'AI') return 'ai'
  return 'df'
}

const ConstraintBadge = ({ label, title }: { label: string; title?: string }) => (
  <span
    title={title}
    className={cn(
      'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.4px] shrink-0 whitespace-nowrap',
      CONSTRAINT_STYLES[constraintVariant(label)]
    )}
  >
    {label}
  </span>
)

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirmation Dialog
// ─────────────────────────────────────────────────────────────────────────────

interface DeleteConfirmDialogProps {
  fieldName: string
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
}

const DeleteConfirmDialog = ({ fieldName, isLoading, onConfirm, onCancel }: DeleteConfirmDialogProps) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        className="relative z-10 w-[400px] bg-bg-card border border-border-subtle rounded-xl shadow-2xl p-6 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-destructive" />
          </div>
          <div className="pt-0.5">
            <h3 className="text-[15px] font-semibold text-text-main leading-tight">Delete field</h3>
            <p className="text-[13px] text-text-muted mt-1.5 leading-relaxed">
              Are you sure you want to delete{' '}
              <code className="font-mono font-semibold text-text-main bg-bg-main border border-border-subtle px-1.5 py-0.5 rounded text-[12px]">
                {fieldName}
              </code>
              ? This action is <strong>permanent</strong> and cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border-subtle text-[13px] font-medium text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-white text-[13px] font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Trash2 size={13} />
            {isLoading ? 'Deleting…' : 'Delete field'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV export
// ─────────────────────────────────────────────────────────────────────────────

function exportSchemaToCSV(tableName: string, columns: SchemaColumn[]) {
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`
  const headers = ['Name', 'Type', 'Nullable', 'Constraints', 'Default']
  const rows = columns.map(col => [
    col.name, col.type, col.nullable,
    (col.constraints ?? []).map(c => c.label).join(' | '),
    col.default ?? '',
  ])
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${tableName}_schema.csv`; a.click()
  URL.revokeObjectURL(url)
}

function toSlug(label: string): string {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Field Form (used by both Add and Edit)
// ─────────────────────────────────────────────────────────────────────────────

interface FieldFormProps {
  tableId: string
  /** Pre-fill values for edit mode */
  initial?: {
    id: string
    slug: string
    label: string
    type: string
    required: boolean
  }
  isLoading: boolean
  onClose: () => void
  onSubmit: (payload: FieldPayload) => void
  submitLabel: string
}

const FieldForm = ({ tableId, initial, isLoading, onClose, onSubmit, submitLabel }: FieldFormProps) => {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(!!initial)
  const [type, setType] = useState(initial?.type ?? 'character varying')
  const [required, setRequired] = useState(initial?.required ?? false)

  const handleLabelChange = (val: string) => {
    setLabel(val)
    if (!slugTouched) setSlug(toSlug(val))
  }

  const handleSubmit = () => {
    if (!label.trim()) { toast.error('Label is required'); return }
    if (!slug.trim()) { toast.error('Slug is required'); return }
    onSubmit({
      id: initial?.id ?? crypto.randomUUID(),
      slug: slug.trim(),
      label: label.trim(),
      type,
      table_id: tableId,
      index: 'string',
      required,
      show_label: true,
      is_visible: true,
      attributes: {},
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 border-b border-primary/30 border-l-2 border-l-primary bg-primary/[0.04] flex-wrap"
      onKeyDown={handleKeyDown}
    >
      {/* Label */}
      <input
        autoFocus
        type="text"
        disabled={!!initial}
        placeholder="Label (e.g. Phone Number)"
        value={label}
        onChange={e => handleLabelChange(e.target.value)}
        className="bg-bg-main border border-border-subtle rounded px-2.5 py-1.5 text-[12px] font-semibold text-text-main outline-none focus:border-primary/60 w-[170px] shrink-0"
      />

      {/* Slug */}
      <input
        type="text"
        placeholder="slug"
        value={slug}
        onChange={e => { setSlugTouched(true); setSlug(e.target.value) }}
        disabled={!!initial}
        className={cn(
          "bg-bg-main border border-border-subtle rounded px-2.5 py-1.5 text-[12px] font-mono outline-none w-[150px] shrink-0",
          initial
            ? "text-text-muted/50 cursor-not-allowed opacity-60"
            : "text-text-muted focus:border-primary/60"
        )}
        title={initial ? "Slug cannot be changed after creation" : "Column slug"}
      />

      {/* Type */}
      <select
        value={type}
        onChange={e => setType(e.target.value)}
        className="bg-bg-main border border-border-subtle rounded px-2.5 py-1.5 text-[12px] font-mono text-blue-400 outline-none focus:border-primary/60 w-[210px] shrink-0"
      >
        {PG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      {/* Required */}
      <label className="flex items-center gap-1.5 text-[11px] text-text-muted cursor-pointer select-none shrink-0">
        <input
          type="checkbox"
          checked={required}
          onChange={e => setRequired(e.target.checked)}
          className="accent-primary"
        />
        Required
      </label>

      {/* Actions */}
      <div className="flex items-center gap-1.5 ml-auto shrink-0">
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-primary text-white text-[11px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Check size={12} /> {isLoading ? '…' : submitLabel}
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded border border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FieldRow — grid: [name 160px] | [type 240px] | [constraints 1fr] | [actions auto]
// When editing → replaced by inline FieldForm
// ─────────────────────────────────────────────────────────────────────────────

interface FieldRowProps {
  col: SchemaColumn
  tableId: string
  isEditing: boolean
  isProtected: boolean
  isUpdating: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onUpdate: (payload: FieldPayload) => void
  onDelete: () => void
}

const FieldRow = ({
  col, tableId, isEditing, isProtected, isUpdating,
  onEdit, onCancelEdit, onUpdate, onDelete,
}: FieldRowProps) => {
  const constraints = col.constraints ?? []
  const hasDefault = col.default !== null && col.default !== undefined && col.default !== ''
  const isNullable = col.nullable === 'YES'

  // Editing mode — show pre-filled form inline
  if (isEditing) {
    return (
      <FieldForm
        tableId={tableId}
        initial={{
          id: col.id ?? '',
          slug: col.name,
          label: col.label ?? col.name,
          type: col.type,
          required: false,
        }}
        isLoading={isUpdating}
        onClose={onCancelEdit}
        onSubmit={onUpdate}
        submitLabel="Save"
      />
    )
  }

  return (
    <div
      className="group grid items-center px-4 py-[10px] border-b border-border-subtle hover:bg-hover-bg/60 transition-colors"
      style={{ gridTemplateColumns: '160px 240px 1fr auto' }}
    >
      {/* Col 1: name + protected badge */}
      <div className="flex items-center gap-1.5 pr-2 min-w-0">
        <span className="font-semibold text-[13px] text-text-main truncate">{col.name}</span>
        {isProtected && (
          <span title="System field — cannot be deleted">
            <ShieldOff size={10} className="shrink-0 text-text-muted/40" />
          </span>
        )}
      </div>

      {/* Col 2: type pill */}
      <div className="flex items-center">
        <span className="font-mono text-[12px] text-blue-400 bg-blue-400/[0.08] px-2 py-0.5 rounded">
          {col.type}
        </span>
      </div>

      {/* Col 3: constraint badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {constraints.map((c, i) => (
          <ConstraintBadge key={i} label={c.label} title={c.name} />
        ))}
        {!isNullable && !constraints.some(c =>
          c.label.toUpperCase().includes('NOT NULL') || c.label.toUpperCase() === 'NN'
        ) && <ConstraintBadge label="NOT NULL" />}
        {hasDefault && (
          <ConstraintBadge label={`DEFAULT ${col.default}`} title={`Default: ${col.default}`} />
        )}
      </div>

      {/* Col 4: hover actions */}
      <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onEdit}
          className="w-7 h-7 border border-border-subtle rounded bg-bg-main text-text-muted hover:text-text-main hover:bg-hover-bg flex items-center justify-center transition-colors"
          title="Edit field"
        >
          <Pencil size={11} />
        </button>

        {isProtected ? (
          <button
            disabled
            title="System field — cannot be deleted"
            className="w-7 h-7 border border-border-subtle/40 rounded bg-bg-main text-text-muted/30 flex items-center justify-center cursor-not-allowed"
          >
            <Trash2 size={11} />
          </button>
        ) : (
          <button
            onClick={onDelete}
            className="w-7 h-7 border border-border-subtle rounded bg-bg-main text-text-muted hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 flex items-center justify-center transition-colors"
            title="Delete field"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SchemaView
// ─────────────────────────────────────────────────────────────────────────────

export const SchemaView = () => {
  const { selectedTable } = useDatabaseStore()
  const ucodeProjectId = useAuthStore(state => state.ucodeProjectId)

  const { data: columns = [], isLoading, refetch } = useTableSchemaV2(
    selectedTable,
    ucodeProjectId || ''
  )
  const addFieldMutation = useAddSchemaField()
  const updateFieldMutation = useUpdateSchemaField()
  const deleteFieldMutation = useDeleteSchemaField()

  const [isAddingField, setIsAddingField] = useState(false)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    setIsAddingField(false)
    setEditingName(null)
    setDeleteTarget(null)
  }, [selectedTable])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddField = async (payload: FieldPayload) => {
    if (!selectedTable) return
    try {
      await addFieldMutation.mutateAsync({ tableSlug: selectedTable, projectId: ucodeProjectId || '', payload })
      toast.success(`Field "${payload.label}" added`)
      setIsAddingField(false)
    } catch {
      toast.error('Failed to add field')
    }
  }

  const handleUpdateField = async (payload: FieldPayload) => {
    if (!selectedTable) return
    try {
      await updateFieldMutation.mutateAsync({ tableSlug: selectedTable, projectId: ucodeProjectId || '', payload })
      toast.success(`Field "${payload.label}" updated`)
      setEditingName(null)
    } catch {
      toast.error('Failed to update field')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !selectedTable) return
    try {
      await deleteFieldMutation.mutateAsync({
        tableSlug: selectedTable,
        fieldId: deleteTarget.id,
        projectId: ucodeProjectId || '',
      })
      toast.success(`Field "${deleteTarget.name}" deleted`)
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete field')
    }
  }

  const requestDelete = (col: SchemaColumn) => {
    if (PROTECTED_FIELDS.has(col.name)) {
      toast.error(`"${col.name}" is a system field and cannot be deleted`)
      return
    }
    if (!col.id) {
      toast.error('Cannot delete: field has no ID')
      return
    }
    setDeleteTarget({ id: col.id, name: col.name })
  }

  if (!selectedTable) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
        Select a table to view its schema
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-2 px-4 py-[10px] border-b border-border-subtle bg-bg-main/50 shrink-0">
          <svg className="text-primary shrink-0" width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M3 15h18M9 3v18" />
          </svg>
          <span className="text-[14px] font-semibold text-text-main">{selectedTable}</span>
          <span className="text-[12px] text-text-muted/60">{columns.length} fields</span>
          <span className="flex-1" />

          <button
            onClick={() => { setIsAddingField(v => !v); setEditingName(null) }}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-[5px] rounded border text-[12px] font-medium transition-colors',
              isAddingField
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'border-border-subtle bg-bg-card text-text-muted hover:text-text-main hover:border-border-main'
            )}
          >
            <Plus size={12} /> Add Field
          </button>

          <div className="h-5 w-px bg-border-subtle/60 mx-0.5" />

          <button
            onClick={() => exportSchemaToCSV(selectedTable, columns)}
            className="flex items-center gap-1.5 px-2.5 py-[5px] rounded border border-border-subtle bg-bg-card text-[12px] font-medium text-text-muted hover:text-text-main hover:border-border-main transition-colors"
          >
            <Download size={12} /> Export DDL
          </button>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-2.5 py-[5px] rounded border border-border-subtle bg-bg-card text-[12px] font-medium text-text-muted hover:text-text-main hover:border-border-main transition-colors"
          >
            <RefreshCw size={12} className={cn(isLoading && 'animate-spin')} /> Refresh
          </button>
        </div>

        {/* ── Fields list ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-[10px] text-[10px] font-semibold uppercase tracking-[0.6px] text-text-muted/50 bg-bg-card border-b border-border-subtle sticky top-0 z-10">
            Columns
          </div>

          {/* Add field form */}
          {isAddingField && (
            <FieldForm
              tableId={selectedTable}
              isLoading={addFieldMutation.isPending}
              onClose={() => setIsAddingField(false)}
              onSubmit={handleAddField}
              submitLabel="Add"
            />
          )}

          {isLoading ? (
            <>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="grid items-center px-4 py-[10px] border-b border-border-subtle"
                  style={{ gridTemplateColumns: '160px 240px 1fr auto' }}
                >
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-5 w-[140px] rounded" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-14 rounded" />
                    <Skeleton className="h-5 w-16 rounded" />
                  </div>
                  <div className="w-16" />
                </div>
              ))}
            </>
          ) : columns.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-text-muted/50">
              No columns found for this table.
            </div>
          ) : (
            columns.map((col, i) => (
              <FieldRow
                key={`${col.name}-${i}`}
                col={col}
                tableId={selectedTable}
                isEditing={editingName === col.name}
                isProtected={PROTECTED_FIELDS.has(col.name)}
                isUpdating={updateFieldMutation.isPending}
                onEdit={() => { setIsAddingField(false); setEditingName(col.name) }}
                onCancelEdit={() => setEditingName(null)}
                onUpdate={handleUpdateField}
                onDelete={() => requestDelete(col)}
              />
            ))
          )}
        </div>

        {/* ── Bottom status bar ── */}
        <div className="h-[28px] bg-bg-card border-t border-border-subtle flex items-center px-4 gap-4 text-[11px] text-text-muted/50 shrink-0 font-medium">
          <span className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            Schema: {selectedTable}
          </span>
          <span>{columns.length} columns</span>
          <span className="flex-1" />
          <span>PostgreSQL 16</span>
        </div>
      </div>

      {/* ── Delete confirmation dialog ── */}
      {deleteTarget && (
        <DeleteConfirmDialog
          fieldName={deleteTarget.name}
          isLoading={deleteFieldMutation.isPending}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
