"use client";

import { useState, useEffect } from "react";
import {
  Pencil,
  Trash2,
  X,
  Check,
  ShieldOff,
  ChevronDown,
} from "lucide-react";
import {
  useDatabaseStore,
  useTableSchemaV2,
  useAddSchemaField,
  useAddRelationField,
  useDeleteSchemaField,
  useUpdateSchemaField,
  useTables,
  useTableRelations,
  SchemaColumn,
} from "@/entities/database";
import { Skeleton } from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";
import { useAuthStore } from "@/entities/session";
import { toast } from "sonner";
import { useTranslations } from 'next-intl'

// ─────────────────────────────────────────────────────────────────────────────
// Protected fields — cannot be deleted
// ─────────────────────────────────────────────────────────────────────────────

const PROTECTED_FIELDS = new Set([
  "guid",
  "created_at",
  "updated_at",
  "deleted_at",
]);

// ─────────────────────────────────────────────────────────────────────────────
// PostgreSQL types
// ─────────────────────────────────────────────────────────────────────────────

const PG_TYPES = [
  "character varying",
  "relation",
  "varchar",
  "text",
  "citext",
  "integer",
  "smallint",
  "bigint",
  "int2",
  "int4",
  "int8",
  "serial",
  "numeric",
  "decimal",
  "real",
  "double precision",
  "money",
  "boolean",
  "uuid",
  "jsonb",
  "json",
  "date",
  "timestamp",
  "timestamptz",
  "timestamp with time zone",
  "timestamp without time zone",
  "text[]",
  "uuid[]",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Shared field payload type
// ─────────────────────────────────────────────────────────────────────────────

interface FieldPayload {
  id: string;
  slug: string;
  label: string;
  type: string;
  table_id: string;
  index: string;
  required: boolean;
  show_label: boolean;
  is_visible: boolean;
  attributes: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constraint badge
// ─────────────────────────────────────────────────────────────────────────────

type ConstraintVariant = "pk" | "fk" | "nn" | "uq" | "df" | "ai";

const CONSTRAINT_STYLES: Record<ConstraintVariant, string> = {
  pk: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  fk: "bg-blue-500/10   text-blue-400   border border-blue-500/20",
  nn: "bg-red-500/10    text-red-400    border border-red-500/20",
  uq: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  df: "bg-green-500/10  text-green-400  border border-green-500/20",
  ai: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
};

function constraintVariant(label: string): ConstraintVariant {
  const l = label.toUpperCase();
  if (l === "PK" || l.includes("PRIMARY")) return "pk";
  if (l === "FK" || l.includes("FOREIGN")) return "fk";
  if (l.includes("NOT NULL") || l === "NN") return "nn";
  if (l.includes("UNIQUE") || l === "UQ") return "uq";
  if (l.includes("AUTO") || l === "AI") return "ai";
  return "df";
}

const ConstraintBadge = ({
  label,
  title,
}: {
  label: string;
  title?: string;
}) => (
  <span
    title={title}
    className={cn(
      "shrink-0 rounded px-2 py-0.5 text-[10px] font-bold tracking-[0.4px] whitespace-nowrap uppercase",
      CONSTRAINT_STYLES[constraintVariant(label)],
    )}
  >
    {label}
  </span>
);

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirmation Dialog
// ─────────────────────────────────────────────────────────────────────────────

interface DeleteConfirmDialogProps {
  fieldName: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmDialog = ({
  fieldName,
  isLoading,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) => {
  const t = useTranslations('widgets.databaseStudio')
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        className="bg-bg-card border-border-subtle relative z-10 flex w-[400px] flex-col gap-5 rounded-xl border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className="bg-destructive/10 border-destructive/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
            <Trash2 size={18} className="text-destructive" />
          </div>
          <div className="pt-0.5">
            <h3 className="text-text-main text-[15px] leading-tight font-semibold">
              {t('deleteFieldTitle')}
            </h3>
            <p className="text-text-muted mt-1.5 text-[13px] leading-relaxed">
              Are you sure you want to delete{" "}
              <code className="text-text-main bg-bg-main border-border-subtle rounded border px-1.5 py-0.5 font-mono text-[12px] font-semibold">
                {fieldName}
              </code>
              ? This action is <strong>permanent</strong> and cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg rounded-lg border px-4 py-2 text-[13px] font-medium transition-colors"
          >
            {t('cancelBtn')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90 flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 size={13} />
            {isLoading ? "Deleting…" : "Delete field"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CSV export
// ─────────────────────────────────────────────────────────────────────────────

export function exportSchemaToCSV(tableName: string, columns: SchemaColumn[]) {
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const headers = ["Name", "Type", "Nullable", "Constraints", "Default"];
  const rows = columns.map((col) => [
    col.name,
    col.type,
    col.nullable,
    (col.constraints ?? []).map((c) => c.label).join(" | "),
    col.default ?? "",
  ]);
  const csv = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${tableName}_schema.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function toSlug(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Field Form (used by both Add and Edit)
// ─────────────────────────────────────────────────────────────────────────────

interface FieldFormProps {
  tableId: string;
  /** Pre-fill values for edit mode */
  initial?: {
    id: string;
    slug: string;
    label: string;
    type: string;
    required: boolean;
  };
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (payload: FieldPayload) => void;
  submitLabel: string;
}

const FieldForm = ({
  tableId,
  initial,
  isLoading,
  onClose,
  onSubmit,
  submitLabel,
}: FieldFormProps) => {
  const t = useTranslations('widgets.databaseStudio')
  const [label, setLabel] = useState(initial?.label ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [type, setType] = useState(initial?.type ?? "character varying");
  const [required, setRequired] = useState(initial?.required ?? false);
  const [relationTable, setRelationTable] = useState("");

  const { data: tables = [] } = useTables("", 200, 0);
  const relationOptions = tables.filter((t) => t.slug !== tableId);

  const handleLabelChange = (val: string) => {
    setLabel(val);
    if (!slugTouched) setSlug(toSlug(val));
  };

  const handleSubmit = () => {
    if (!label.trim()) {
      toast.error(t('labelRequired'));
      return;
    }
    if (!slug.trim()) {
      toast.error(t('slugRequired'));
      return;
    }
    if (type === "relation" && !relationTable) {
      toast.error(t('selectRelatedTable'));
      return;
    }
    onSubmit({
      id: initial?.id ?? crypto.randomUUID(),
      slug: slug.trim(),
      label: label.trim(),
      type,
      table_id: tableId,
      index: "string",
      required,
      show_label: true,
      is_visible: true,
      attributes: type === "relation" ? { relation_table: relationTable } : {},
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="border-primary/30 border-l-primary bg-primary/[0.04] flex flex-wrap items-center gap-2 border-b border-l-2 px-4 py-2.5"
      onKeyDown={handleKeyDown}
    >
      {/* Label */}
      <input
        autoFocus
        type="text"
        disabled={!!initial}
        placeholder={t('labelPlaceholder')}
        value={label}
        onChange={(e) => handleLabelChange(e.target.value)}
        className={cn(
          "bg-bg-main border-border-subtle text-text-main focus:border-primary/60 shrink-0 rounded border px-2.5 py-1.5 text-[12px] font-semibold outline-none",
          type === "relation" ? "w-35" : "w-42.5",
        )}
      />

      {/* Slug */}
      <input
        type="text"
        placeholder="slug"
        value={slug}
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(e.target.value);
        }}
        disabled={!!initial}
        className={cn(
          "bg-bg-main border-border-subtle shrink-0 rounded border px-2.5 py-1.5 font-mono text-[12px] outline-none",
          type === "relation" ? "w-30" : "w-37.5",
          initial
            ? "text-text-muted/50 cursor-not-allowed opacity-60"
            : "text-text-muted focus:border-primary/60",
        )}
        title={
          initial ? "Slug cannot be changed after creation" : "Column slug"
        }
      />

      {/* Type */}
      <div
        className={cn(
          "relative shrink-0",
          type === "relation" ? "w-35" : "w-52.5",
        )}
      >
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-bg-main border-border-subtle focus:border-primary/60 w-full appearance-none rounded border py-1.5 pr-7 pl-2.5 font-mono text-[12px] text-blue-400 outline-none"
        >
          {PG_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="text-text-muted pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
        />
      </div>

      {/* Relation target table — only when type === "relation" */}
      {type === "relation" && (
        <div className="flex shrink-0 items-center gap-1">
          <div className="relative w-42.5 shrink-0">
            <select
              value={relationTable}
              onChange={(e) => setRelationTable(e.target.value)}
              className="bg-bg-main border-border-subtle focus:border-primary/60 w-full appearance-none rounded border py-1.5 pr-7 pl-2.5 font-mono text-[12px] text-blue-400 outline-none"
            >
              <option value="">Select table…</option>
              {relationOptions.map((t) => {
                const label = t.label || t.name || t.slug;
                return (
                  <option key={t.id} value={t.slug}>
                    {label === t.slug ? label : `${label} (${t.slug})`}
                  </option>
                );
              })}
            </select>
            <ChevronDown
              size={12}
              className="text-text-muted pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
            />
          </div>
          {relationTable && (
            <button
              type="button"
              onClick={() => setRelationTable("")}
              title={t('clearRelation')}
              className="border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded border transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Required */}
      <label className="text-text-muted flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] select-none">
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
          className="accent-primary"
        />
        {t('requiredLabel')}
      </label>

      {/* Actions */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90 flex items-center gap-1 rounded px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Check size={12} /> {isLoading ? "…" : submitLabel}
        </button>
        <button
          onClick={onClose}
          className="border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg rounded border p-1.5 transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FieldRow — grid: [name 160px] | [type 240px] | [constraints 1fr] | [actions auto]
// When editing → replaced by inline FieldForm
// ─────────────────────────────────────────────────────────────────────────────

interface FieldRowProps {
  col: SchemaColumn;
  tableId: string;
  isEditing: boolean;
  isProtected: boolean;
  isUpdating: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (payload: FieldPayload) => void;
  onDelete: () => void;
}

const FieldRow = ({
  col,
  tableId,
  isEditing,
  isProtected,
  isUpdating,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: FieldRowProps) => {
  const t = useTranslations('widgets.databaseStudio')
  const constraints = col.constraints ?? [];
  const hasDefault =
    col.default !== null && col.default !== undefined && col.default !== "";
  const isNullable = col.nullable === "YES";

  // Editing mode — show pre-filled form inline
  if (isEditing) {
    return (
      <FieldForm
        tableId={tableId}
        initial={{
          id: col.id ?? "",
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
    );
  }

  return (
    <div
      className="group border-border-subtle hover:bg-hover-bg/60 grid items-center border-b px-4 py-[10px] transition-colors"
      style={{ gridTemplateColumns: "160px 240px 1fr auto" }}
    >
      {/* Col 1: name + protected badge */}
      <div className="flex min-w-0 items-center gap-1.5 pr-2">
        <span className="text-text-main truncate text-[13px] font-semibold">
          {col.name}
        </span>
        {isProtected && (
          <span title={t('systemFieldHint')}>
            <ShieldOff size={10} className="text-text-muted/40 shrink-0" />
          </span>
        )}
      </div>

      {/* Col 2: type pill (+ relation target when type === "relation") */}
      <div className="flex items-center gap-1.5">
        <span className="rounded bg-blue-400/[0.08] px-2 py-0.5 font-mono text-[12px] text-blue-400">
          {col.type}
        </span>
        {col.type === "relation" &&
          typeof col.attributes?.relation_table === "string" &&
          col.attributes.relation_table && (
            <span
              title={`Relates to ${col.attributes.relation_table}`}
              className="rounded bg-purple-400/8 px-2 py-0.5 font-mono text-[11px] text-purple-400"
            >
              → {col.attributes.relation_table}
            </span>
          )}
      </div>

      {/* Col 3: constraint badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        {constraints.map((c, i) => (
          <ConstraintBadge key={i} label={c.label} title={c.name} />
        ))}
        {!isNullable &&
          !constraints.some(
            (c) =>
              c.label.toUpperCase().includes("NOT NULL") ||
              c.label.toUpperCase() === "NN",
          ) && <ConstraintBadge label={t('notNull')} />}
        {hasDefault && (
          <ConstraintBadge
            label={`DEFAULT ${col.default}`}
            title={`Default: ${col.default}`}
          />
        )}
      </div>

      {/* Col 4: hover actions */}
      <div className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="border-border-subtle bg-bg-main text-text-muted hover:text-text-main hover:bg-hover-bg flex h-7 w-7 items-center justify-center rounded border transition-colors"
          title={t('editField')}
        >
          <Pencil size={11} />
        </button>

        {isProtected ? (
          <button
            disabled
            title={t('systemFieldHint')}
            className="border-border-subtle/40 bg-bg-main text-text-muted/30 flex h-7 w-7 cursor-not-allowed items-center justify-center rounded border"
          >
            <Trash2 size={11} />
          </button>
        ) : (
          <button
            onClick={onDelete}
            className="border-border-subtle bg-bg-main text-text-muted hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 flex h-7 w-7 items-center justify-center rounded border transition-colors"
            title={t('deleteFieldTitle')}
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main SchemaView
// ─────────────────────────────────────────────────────────────────────────────

interface SchemaViewProps {
  isAddingField: boolean;
  setIsAddingField: (v: boolean) => void;
}

export const SchemaView = ({
  isAddingField,
  setIsAddingField,
}: SchemaViewProps) => {
  const t = useTranslations('widgets.databaseStudio')
  const { selectedTable } = useDatabaseStore();
  const ucodeProjectId = useAuthStore((state) => state.ucodeProjectId);

  const { data: rawColumns = [], isLoading } = useTableSchemaV2(
    selectedTable,
    ucodeProjectId || "",
  );
  const { data: relations = [] } = useTableRelations(
    selectedTable,
    ucodeProjectId || "",
  );

  // The relations API sometimes returns table_to / label / slug as a nested
  // table object ({ id, label, slug, … }) instead of a string. Coerce to a
  // plain string so these never get rendered as a React child.
  const asStr = (v: unknown): string => {
    if (typeof v === "string") return v;
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      return asStr(o.slug) || asStr(o.label) || asStr(o.name);
    }
    return "";
  };

  const columns: SchemaColumn[] = [
    ...rawColumns,
    ...relations
      .filter((r) => !!r.table_to)
      .map<SchemaColumn>((r) => {
        const tableTo = asStr(r.table_to);
        const attrLabel = asStr(r.attributes?.label);
        const slug = asStr(r.slug);
        const label = asStr(r.label);
        return {
          id: r.id,
          name: slug || attrLabel || label || tableTo || "",
          label: attrLabel || label || slug,
          type: "relation",
          nullable: r.required ? "NO" : "YES",
          default: null,
          constraints: [{ label: "FK", name: `${tableTo}_fk` }],
          attributes: { ...(r.attributes || {}), relation_table: tableTo },
        };
      }),
  ];

  const addFieldMutation = useAddSchemaField();
  const addRelationMutation = useAddRelationField();
  const updateFieldMutation = useUpdateSchemaField();
  const deleteFieldMutation = useDeleteSchemaField();

  const [editingName, setEditingName] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    setIsAddingField(false);
    setEditingName(null);
    setDeleteTarget(null);
  }, [selectedTable]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddField = async (payload: FieldPayload) => {
    if (!selectedTable) return;
    try {
      if (payload.type === "relation") {
        const tableTo = payload.attributes?.relation_table;
        if (typeof tableTo !== "string" || !tableTo) {
          toast.error(t('selectRelatedTable'));
          return;
        }
        await addRelationMutation.mutateAsync({
          tableFrom: selectedTable,
          projectId: ucodeProjectId || "",
          payload: {
            id: payload.id,
            label: payload.label,
            slug: payload.slug,
            tableTo,
            required: payload.required,
          },
        });
      } else {
        await addFieldMutation.mutateAsync({
          tableSlug: selectedTable,
          projectId: ucodeProjectId || "",
          payload,
        });
      }
      toast.success(`Field "${payload.label}" added`);
      setIsAddingField(false);
    } catch {
      toast.error(t('addFieldFailed'));
    }
  };

  const handleUpdateField = async (payload: FieldPayload) => {
    if (!selectedTable) return;
    try {
      await updateFieldMutation.mutateAsync({
        tableSlug: selectedTable,
        projectId: ucodeProjectId || "",
        payload,
      });
      toast.success(`Field "${payload.label}" updated`);
      setEditingName(null);
    } catch {
      toast.error(t('updateFieldFailed'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !selectedTable) return;
    try {
      await deleteFieldMutation.mutateAsync({
        tableSlug: selectedTable,
        fieldId: deleteTarget.id,
        projectId: ucodeProjectId || "",
      });
      toast.success(`Field "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    } catch {
      toast.error(t('deleteFieldFailed'));
    }
  };

  const requestDelete = (col: SchemaColumn) => {
    if (PROTECTED_FIELDS.has(col.name)) {
      toast.error(`"${col.name}" is a system field and cannot be deleted`);
      return;
    }
    if (!col.id) {
      toast.error(t('fieldNoId'));
      return;
    }
    setDeleteTarget({ id: col.id, name: col.name });
  };

  if (!selectedTable) {
    return (
      <div className="text-text-muted flex flex-1 items-center justify-center text-sm">
        {t('selectTableSchema')}
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        {/* ── Fields list ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="text-text-muted/50 bg-bg-card border-border-subtle sticky top-0 z-10 border-b px-4 py-[10px] text-[10px] font-semibold tracking-[0.6px] uppercase">
            {t('columnsLabel')}
          </div>

          {/* Add field form */}
          {isAddingField && (
            <FieldForm
              tableId={selectedTable}
              isLoading={
                addFieldMutation.isPending || addRelationMutation.isPending
              }
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
                  className="border-border-subtle grid items-center border-b px-4 py-[10px]"
                  style={{ gridTemplateColumns: "160px 240px 1fr auto" }}
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
            <div className="text-text-muted/50 px-4 py-10 text-center text-sm">
              {t('noColumnsFound')}
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
                onEdit={() => {
                  setIsAddingField(false);
                  setEditingName(col.name);
                }}
                onCancelEdit={() => setEditingName(null)}
                onUpdate={handleUpdateField}
                onDelete={() => requestDelete(col)}
              />
            ))
          )}
        </div>

        {/* ── Bottom status bar ── */}
        <div className="bg-bg-card border-border-subtle text-text-muted/50 flex h-[28px] shrink-0 items-center gap-4 border-t px-4 text-[11px] font-medium">
          <span className="flex items-center gap-1.5">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
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
  );
};
