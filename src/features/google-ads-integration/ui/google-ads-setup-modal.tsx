"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CircleCheck,
  Copy,
  Database,
  ExternalLink,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Table2,
  Trash2,
} from "lucide-react";
import { databaseApi, useTables, useTableDetail } from "@/entities/database";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";
import { toast } from "sonner";
import {
  googleAdsIntegrationApi,
  getGoogleAdsErrorMessage,
  type GoogleAdsColumn,
  type GoogleAdsConnectionPayload,
  type GoogleAdsCreateResult,
  type GoogleAdsFieldMapping,
  type GoogleAdsIntegration,
  type GoogleAdsScope,
} from "../api";

type View = "list" | "editor" | "keys";

// Radix Select forbids empty-string values, so the "custom column_id" choice
// uses a sentinel that the row resolves back to a free-text input.
const CUSTOM_COLUMN_VALUE = "__custom__";

interface MappingRow {
  /** Local key only. */
  id: string;
  /** Selected standard column_id (ignored when isCustom). */
  leadColumn: string;
  isCustom: boolean;
  customValue: string;
  /** Target table column slug. */
  tableField: string;
  required: boolean;
}

const newRowId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `row-${Math.random().toString(36).slice(2)}`;

const emptyRow = (): MappingRow => ({
  id: newRowId(),
  leadColumn: "",
  isCustom: false,
  customValue: "",
  tableField: "",
  required: false,
});

const formatConnectedAt = (value?: string): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const resolveLeadColumn = (row: MappingRow): string =>
  (row.isCustom ? row.customValue : row.leadColumn).trim();

const buildPayload = (
  tableSlug: string,
  formName: string,
  formId: string,
  rows: MappingRow[],
): GoogleAdsConnectionPayload => {
  const fields: GoogleAdsFieldMapping[] = rows
    .map((row) => ({
      lead_column: resolveLeadColumn(row),
      table_field: row.tableField.trim(),
      required: row.required,
    }))
    .filter((f) => f.lead_column && f.table_field);
  return {
    table_slug: tableSlug,
    form_name: formName.trim() || undefined,
    form_id: formId.trim() || undefined,
    fields,
  };
};

interface GoogleAdsSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Environment-Id / Resource-Id headers for every google-leads request. */
  scope: GoogleAdsScope;
  /** uCode project id used for table-schema and record (verify) lookups. */
  mainProjectId: string;
  /** Open straight into the create wizard ("create") or the connection list. */
  initialMode?: "list" | "create";
  /** Called after any create / update / disconnect so the parent can refetch. */
  onChanged?: () => void;
}

export const GoogleAdsSetupModal = ({
  open,
  onOpenChange,
  scope,
  mainProjectId,
  initialMode = "list",
  onChanged,
}: GoogleAdsSetupModalProps) => {
  const scopeReady = !!scope.environmentId;

  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Editor state.
  const [tableSlug, setTableSlug] = useState("");
  const [formName, setFormName] = useState("");
  const [formId, setFormId] = useState("");
  const [rows, setRows] = useState<MappingRow[]>([emptyRow()]);

  // Keys view state — populated from a fresh create OR an existing connection.
  const [keyResult, setKeyResult] = useState<GoogleAdsCreateResult | null>(null);
  const [keysTableSlug, setKeysTableSlug] = useState("");

  // Verify (poll the target table for a freshly-arrived test lead).
  const [verifyState, setVerifyState] = useState<
    "idle" | "checking" | "success" | "empty"
  >("idle");
  const baselineGuidsRef = useRef<Set<string>>(new Set());
  const verifyTokenRef = useRef(0);

  const columnsQuery = useQuery({
    queryKey: ["google-ads-columns", scope.environmentId],
    queryFn: () => googleAdsIntegrationApi.getColumns(scope),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const columns: GoogleAdsColumn[] = useMemo(
    () => columnsQuery.data ?? [],
    [columnsQuery.data],
  );
  const standardColumnIds = useMemo(
    () => new Set(columns.map((c) => c.column_id)),
    [columns],
  );

  const integrationQuery = useQuery({
    queryKey: ["google-ads-integration", scope.environmentId, scope.resourceId],
    queryFn: () => googleAdsIntegrationApi.getIntegration(scope),
    enabled: open && scopeReady,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const integrations = integrationQuery.data?.integrations ?? [];

  const { data: tables = [], isLoading: tablesLoading } = useTables("", 200, 0);
  const { data: tableDetail, isLoading: fieldsLoading } = useTableDetail(
    tableSlug || null,
    mainProjectId,
  );
  const tableFields = useMemo(() => tableDetail?.fields ?? [], [tableDetail]);

  // Reset to the requested entry view whenever the modal (re)opens.
  useEffect(() => {
    if (!open) return;
    verifyTokenRef.current += 1;
    setVerifyState("idle");
    setKeyResult(null);
    setKeysTableSlug("");
    if (initialMode === "create") {
      setEditingId(null);
      setTableSlug("");
      setFormName("");
      setFormId("");
      setRows([emptyRow()]);
      setView("editor");
    } else {
      setView("list");
    }
    // Only react to the open transition; initialMode is read once per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchLeadGuids = useCallback(
    async (slug: string): Promise<Set<string>> => {
      try {
        const { items } = await databaseApi.fetchTableRecords(
          slug,
          mainProjectId,
          undefined,
          100,
          0,
        );
        return new Set(
          items
            .map((r: Record<string, unknown>) => String(r.guid ?? r.id ?? ""))
            .filter(Boolean),
        );
      } catch {
        return new Set();
      }
    },
    [mainProjectId],
  );

  // Snapshot the table's current rows when the keys view opens, so verify can
  // detect a brand-new test lead (a guid not present in the baseline).
  useEffect(() => {
    if (view !== "keys" || !keysTableSlug) return;
    let cancelled = false;
    setVerifyState("idle");
    baselineGuidsRef.current = new Set();
    void fetchLeadGuids(keysTableSlug).then((guids) => {
      if (!cancelled) baselineGuidsRef.current = guids;
    });
    return () => {
      cancelled = true;
      // Invalidate any in-flight verify poll so it can't update state after the
      // user has navigated away from (or re-entered) the keys view.
      verifyTokenRef.current += 1;
    };
  }, [view, keysTableSlug, fetchLeadGuids]);

  const startCreate = () => {
    setEditingId(null);
    setTableSlug("");
    setFormName("");
    setFormId("");
    setRows([emptyRow()]);
    setView("editor");
  };

  const startEdit = (integ: GoogleAdsIntegration) => {
    setEditingId(integ.resource_id);
    setTableSlug(integ.table_slug);
    setFormName(integ.form_name || "");
    setFormId(integ.form_id || "");
    setRows(
      integ.fields.length > 0
        ? integ.fields.map((f) => {
            const isCustom = !standardColumnIds.has(f.lead_column);
            return {
              id: newRowId(),
              leadColumn: isCustom ? "" : f.lead_column,
              isCustom,
              customValue: isCustom ? f.lead_column : "",
              tableField: f.table_field,
              required: f.required,
            };
          })
        : [emptyRow()],
    );
    setView("editor");
  };

  const showKeys = (integ: GoogleAdsIntegration) => {
    setKeyResult({
      resource_id: integ.resource_id,
      google_key: integ.google_key,
      webhook_url: integ.webhook_url,
    });
    setKeysTableSlug(integ.table_slug);
    setView("keys");
  };

  const setRow = (id: string, patch: Partial<MappingRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (id: string) =>
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));

  const validFieldCount = rows.filter(
    (r) => resolveLeadColumn(r) && r.tableField.trim(),
  ).length;
  const canSave = scopeReady && !!tableSlug && validFieldCount > 0;

  const createMutation = useMutation({
    mutationFn: () =>
      googleAdsIntegrationApi.createConnection(
        scope,
        buildPayload(tableSlug, formName, formId, rows),
      ),
    onSuccess: (result) => {
      setKeyResult(result);
      setKeysTableSlug(tableSlug);
      setView("keys");
      toast.success("Connection created");
      integrationQuery.refetch();
      onChanged?.();
    },
    onError: (err) =>
      toast.error(getGoogleAdsErrorMessage(err, "Failed to create connection")),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      googleAdsIntegrationApi.updateMapping(
        scope,
        editingId!,
        buildPayload(tableSlug, formName, formId, rows),
      ),
    onSuccess: () => {
      toast.success("Mapping saved");
      setView("list");
      integrationQuery.refetch();
      onChanged?.();
    },
    onError: (err) =>
      toast.error(getGoogleAdsErrorMessage(err, "Failed to save mapping")),
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => googleAdsIntegrationApi.disconnect(scope, id),
    onSuccess: () => {
      toast.success("Connection removed");
      integrationQuery.refetch();
      onChanged?.();
    },
    onError: (err) =>
      toast.error(getGoogleAdsErrorMessage(err, "Failed to disconnect")),
  });

  const copy = async (text: string, label: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Couldn't copy — select and copy manually");
    }
  };

  const handleVerify = async () => {
    if (!keysTableSlug) return;
    const token = ++verifyTokenRef.current;
    setVerifyState("checking");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const guids = await fetchLeadGuids(keysTableSlug);
      if (verifyTokenRef.current !== token) return;
      const hasNew = [...guids].some((g) => !baselineGuidsRef.current.has(g));
      if (hasNew) {
        setVerifyState("success");
        toast.success("Test lead received — the connection works");
        return;
      }
      if (attempt < 4) await new Promise((r) => setTimeout(r, 2000));
      if (verifyTokenRef.current !== token) return;
    }
    setVerifyState("empty");
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isEdit = !!editingId;

  const dialogWidth =
    view === "keys"
      ? "sm:max-w-[560px]"
      : view === "editor"
        ? "sm:max-w-[880px]"
        : "sm:max-w-[680px]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("gap-0 overflow-hidden p-0", dialogWidth)}>
        <div className="flex max-h-[86vh] flex-col">
          <DialogHeader className="border-border-subtle space-y-1 border-b px-5 py-4 text-left">
            <DialogTitle className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-5 w-5 bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/googleads.svg')" }}
              />
              Google Lead Ads
            </DialogTitle>
            <DialogDescription>
              {view === "keys"
                ? "Paste the key and webhook URL into your Google Ads lead form."
                : view === "editor"
                  ? "Pick a table and map Google form fields onto its columns."
                  : "Google sends each lead straight to your project table — no OAuth required."}
            </DialogDescription>
          </DialogHeader>

          {!scopeReady ? (
            <ContextLoading />
          ) : view === "list" ? (
            <ListView
              loading={integrationQuery.isLoading}
              integrations={integrations}
              onCreate={startCreate}
              onEdit={startEdit}
              onShowKeys={showKeys}
              onDisconnect={(id) => disconnectMutation.mutate(id)}
              disconnectingId={
                disconnectMutation.isPending
                  ? (disconnectMutation.variables as string)
                  : null
              }
            />
          ) : view === "editor" ? (
            <EditorView
              isEdit={isEdit}
              tables={tables}
              tablesLoading={tablesLoading}
              tableSlug={tableSlug}
              onTableChange={setTableSlug}
              formName={formName}
              onFormNameChange={setFormName}
              formId={formId}
              onFormIdChange={setFormId}
              columns={columns}
              tableFields={tableFields}
              fieldsLoading={fieldsLoading}
              rows={rows}
              setRow={setRow}
              addRow={addRow}
              removeRow={removeRow}
            />
          ) : (
            <KeysView
              result={keyResult}
              onCopy={copy}
              verifyState={verifyState}
              onVerify={handleVerify}
            />
          )}

          {/* Footer */}
          <div className="border-border-subtle flex items-center justify-between gap-3 border-t px-5 py-3">
            {view === "editor" ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setView("list")}
                  className="gap-2"
                >
                  <ArrowLeft size={14} />
                  Back
                </Button>
                <Button
                  variant="primary"
                  loading={isSaving}
                  disabled={!canSave}
                  onClick={() =>
                    isEdit ? updateMutation.mutate() : createMutation.mutate()
                  }
                >
                  <Check size={14} />
                  {isEdit ? "Save mapping" : "Create connection"}
                </Button>
              </>
            ) : view === "keys" ? (
              <>
                <p className="text-text-muted hidden text-xs sm:block">
                  After sending test data in Google Ads, hit “Check connection”.
                </p>
                <Button variant="outline" onClick={() => setView("list")}>
                  Done
                </Button>
              </>
            ) : (
              <>
                <p className="text-text-muted hidden text-xs sm:block">
                  {integrations.length > 0
                    ? `${integrations.length} connection${integrations.length > 1 ? "s" : ""}`
                    : "No connections yet."}
                </p>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Context-not-ready notice ────────────────────────────────────────────────
const ContextLoading = () => (
  <div className="flex flex-col items-center justify-center gap-3 px-8 py-14 text-center">
    <AlertCircle className="text-amber-500" size={28} />
    <div>
      <p className="text-text-main text-sm font-semibold">
        Project context is still loading
      </p>
      <p className="text-text-muted mt-1 text-sm">
        Google Lead Ads needs the project environment. Try again once the project
        finishes loading.
      </p>
    </div>
  </div>
);

// ── List of connections (Screen 1) ──────────────────────────────────────────
interface ListViewProps {
  loading: boolean;
  integrations: GoogleAdsIntegration[];
  onCreate: () => void;
  onEdit: (integ: GoogleAdsIntegration) => void;
  onShowKeys: (integ: GoogleAdsIntegration) => void;
  onDisconnect: (id: string) => void;
  disconnectingId: string | null;
}

const ListView = ({
  loading,
  integrations,
  onCreate,
  onEdit,
  onShowKeys,
  onDisconnect,
  disconnectingId,
}: ListViewProps) => {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (integrations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-14 text-center">
        <div className="bg-bg-sidebar border-border-subtle flex h-14 w-14 items-center justify-center rounded-2xl border">
          <span
            aria-hidden="true"
            className="h-7 w-7 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/googleads.svg')" }}
          />
        </div>
        <div>
          <p className="text-text-main text-sm font-semibold">
            No Google Lead Ads connections yet
          </p>
          <p className="text-text-muted mx-auto mt-1 max-w-80 text-sm leading-relaxed">
            Create a connection to get a webhook URL and key to paste into your
            Google Ads lead form.
          </p>
        </div>
        <Button variant="primary" onClick={onCreate} className="gap-2">
          <Plus size={15} />
          Connect Google Lead Ads
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-border-subtle flex items-center justify-between border-b px-5 py-3">
        <span className="text-text-muted text-xs font-semibold tracking-wide uppercase">
          Your connections
        </span>
        <Button size="sm" variant="primary" onClick={onCreate} className="gap-1.5">
          <Plus size={14} />
          New connection
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-3">
          {integrations.map((integ) => {
            const isDisconnecting = disconnectingId === integ.resource_id;
            const fieldSummary = integ.fields
              .slice(0, 2)
              .map((f) => `${f.lead_column}→${f.table_field}`)
              .join(", ");
            const extra = Math.max(0, integ.fields.length - 2);
            return (
              <div
                key={integ.resource_id}
                className="bg-bg-card border-border-subtle rounded-xl border p-4 shadow-sm"
                style={{
                  borderLeftWidth: "3px",
                  borderLeftColor: "var(--green, #22c55e)",
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-green-600 uppercase dark:text-green-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    {integ.status || "active"}
                  </span>
                  <span className="text-text-main truncate text-sm font-semibold">
                    {integ.form_name || "Untitled connection"}
                  </span>
                  {integ.connected_at && (
                    <span className="text-text-muted ml-auto shrink-0 text-[11px]">
                      connected {formatConnectedAt(integ.connected_at)}
                    </span>
                  )}
                </div>
                <div className="text-text-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Table2 size={12} />
                    {integ.table_slug}
                  </span>
                  <span>Form: {integ.form_id || "any"}</span>
                </div>
                {fieldSummary && (
                  <div className="text-text-muted mt-1.5 truncate font-mono text-[11px]">
                    {fieldSummary}
                    {extra > 0 ? ` (+${extra})` : ""}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border-subtle bg-bg-main gap-1.5"
                    onClick={() => onShowKeys(integ)}
                  >
                    <KeyRound size={13} />
                    Key &amp; setup
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border-subtle bg-bg-main gap-1.5"
                    onClick={() => onEdit(integ)}
                  >
                    <SlidersHorizontal size={13} />
                    Mapping
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border-subtle bg-bg-main text-destructive hover:bg-destructive/5 hover:text-destructive ml-auto gap-1.5"
                    onClick={() => onDisconnect(integ.resource_id)}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    Disconnect
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Table + mapping editor (Screen 2, step 1) ───────────────────────────────
interface EditorViewProps {
  isEdit: boolean;
  tables: { id: string; slug: string; label: string }[];
  tablesLoading: boolean;
  tableSlug: string;
  onTableChange: (slug: string) => void;
  formName: string;
  onFormNameChange: (v: string) => void;
  formId: string;
  onFormIdChange: (v: string) => void;
  columns: GoogleAdsColumn[];
  tableFields: { id: string; slug: string; label: string; type: string }[];
  fieldsLoading: boolean;
  rows: MappingRow[];
  setRow: (id: string, patch: Partial<MappingRow>) => void;
  addRow: () => void;
  removeRow: (id: string) => void;
}

const EditorView = ({
  isEdit,
  tables,
  tablesLoading,
  tableSlug,
  onTableChange,
  formName,
  onFormNameChange,
  formId,
  onFormIdChange,
  columns,
  tableFields,
  fieldsLoading,
  rows,
  setRow,
  addRow,
  removeRow,
}: EditorViewProps) => (
  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
    {/* Target table + form details */}
    <div className="border-border-subtle grid gap-4 border-b p-5 md:grid-cols-3">
      <div className="space-y-1.5">
        <label className="text-text-main text-sm font-medium">Target table</label>
        <Select value={tableSlug} onValueChange={onTableChange}>
          <SelectTrigger className="bg-bg-sidebar border-border-subtle">
            <SelectValue
              placeholder={tablesLoading ? "Loading tables…" : "Select a table"}
            />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {tables.map((t) => (
              <SelectItem key={t.id} value={t.slug}>
                {t.label || t.slug}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label className="text-text-main text-sm font-medium">
          Form name <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <Input
          value={formName}
          onChange={(e) => onFormNameChange(e.target.value)}
          placeholder="Consultation request"
          className="bg-bg-sidebar border-border-subtle"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-text-main text-sm font-medium">
          Google form id{" "}
          <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <Input
          value={formId}
          onChange={(e) => onFormIdChange(e.target.value)}
          placeholder="123456789"
          className="bg-bg-sidebar border-border-subtle"
        />
      </div>
    </div>

    {/* Field mapping */}
    <div className="flex-1 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-text-main text-sm font-semibold">Field mapping</p>
          <p className="text-text-muted mt-0.5 text-xs">
            Map each Google form field onto a column of the selected table.
          </p>
        </div>
      </div>

      {!tableSlug ? (
        <div className="text-text-muted flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-subtle px-6 py-10 text-center">
          <Database size={24} className="opacity-40" />
          <p className="text-sm">Select a table to start mapping fields.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Column labels */}
          <div className="text-text-muted hidden grid-cols-[1fr_1fr_auto_auto] items-center gap-3 px-1 text-[11px] font-semibold tracking-wide uppercase sm:grid">
            <span>Google field</span>
            <span>Table column</span>
            <span className="px-1">Required</span>
            <span className="w-7" />
          </div>

          {rows.map((row) => (
            <div
              key={row.id}
              className="border-border-subtle bg-bg-sidebar/40 grid grid-cols-1 items-start gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center sm:border-0 sm:bg-transparent sm:p-1"
            >
              {/* Google field (standard dropdown or custom) */}
              <div className="space-y-1.5">
                <Select
                  value={row.isCustom ? CUSTOM_COLUMN_VALUE : row.leadColumn}
                  onValueChange={(v) =>
                    v === CUSTOM_COLUMN_VALUE
                      ? setRow(row.id, { isCustom: true })
                      : setRow(row.id, { isCustom: false, leadColumn: v })
                  }
                >
                  <SelectTrigger className="bg-bg-sidebar border-border-subtle h-9 text-sm">
                    <SelectValue placeholder="Google field" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {columns.map((c) => (
                      <SelectItem key={c.column_id} value={c.column_id}>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate">{c.label}</span>
                          <span className="bg-bg-sidebar text-text-muted shrink-0 rounded px-1 py-px font-mono text-[10px]">
                            {c.column_id}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_COLUMN_VALUE}>
                      <span className="text-primary font-medium">
                        Custom column id…
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {row.isCustom && (
                  <Input
                    value={row.customValue}
                    onChange={(e) =>
                      setRow(row.id, { customValue: e.target.value })
                    }
                    placeholder="my_custom_question"
                    className="bg-bg-sidebar border-border-subtle h-8 font-mono text-xs"
                  />
                )}
              </div>

              {/* Table column */}
              <Select
                value={row.tableField}
                onValueChange={(v) => setRow(row.id, { tableField: v })}
                disabled={fieldsLoading}
              >
                <SelectTrigger className="bg-bg-sidebar border-border-subtle h-9 text-sm">
                  <SelectValue
                    placeholder={fieldsLoading ? "Loading…" : "Table column"}
                  />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {tableFields.map((f) => (
                    <SelectItem key={f.id ?? f.slug} value={f.slug}>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{f.label || f.slug}</span>
                        <span className="bg-bg-sidebar text-text-muted shrink-0 rounded px-1 py-px font-mono text-[10px]">
                          {f.type}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Required */}
              <div className="flex items-center gap-2 px-1 sm:justify-center">
                <Checkbox
                  checked={row.required}
                  onCheckedChange={(checked) =>
                    setRow(row.id, { required: checked })
                  }
                />
                <span className="text-text-muted text-xs sm:hidden">Required</span>
              </div>

              {/* Remove */}
              <Button
                variant="ghost"
                size="icon"
                className="text-text-muted hover:text-destructive h-8 w-8 shrink-0"
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1}
                aria-label="Remove field"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="border-border-subtle text-text-muted hover:border-primary/40 hover:text-primary mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            Add field
          </button>
        </div>
      )}
    </div>
  </div>
);

// ── Key + webhook + setup instructions + verify (Screen 2, step 2) ──────────
interface KeysViewProps {
  result: GoogleAdsCreateResult | null;
  onCopy: (text: string, label: string) => void;
  verifyState: "idle" | "checking" | "success" | "empty";
  onVerify: () => void;
}

const KeysView = ({ result, onCopy, verifyState, onVerify }: KeysViewProps) => {
  if (!result) {
    return (
      <div className="text-text-muted flex flex-1 items-center justify-center px-6 py-12 text-sm">
        No connection details available.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4">
      <CopyField
        label="Webhook URL"
        value={result.webhook_url}
        emptyHint="Webhook URL will appear once the server is configured — contact an admin."
        onCopy={() => onCopy(result.webhook_url, "Webhook URL")}
      />
      <div className="h-3" />
      <CopyField
        label="Key (secret)"
        value={result.google_key}
        secret
        emptyHint="No key returned."
        onCopy={() => onCopy(result.google_key, "Key")}
      />

      {/* Setup cheatsheet */}
      <div className="border-border-subtle bg-bg-sidebar/40 mt-4 rounded-xl border p-4">
        <p className="text-text-main flex items-center gap-2 text-sm font-semibold">
          <ExternalLink size={14} />
          Connect the webhook in Google Ads
        </p>
        <ol className="text-text-muted mt-2 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed">
          <li>
            Open <span className="text-text-main font-medium">Google Ads</span> →
            your campaign with a lead form.
          </li>
          <li>
            Edit the form → <span className="text-text-main font-medium">Lead delivery</span>{" "}
            → enable webhook integration.
          </li>
          <li>Paste the Webhook URL and Key above.</li>
          <li>
            Click{" "}
            <span className="text-text-main font-medium">“Send test data”</span>,
            then save.
          </li>
          <li>Come back here and check the connection below.</li>
        </ol>
        <p className="text-text-muted/80 mt-2 text-[11px]">
          The key is a secret — don&apos;t publish it.
        </p>
      </div>

      {/* Verify */}
      <div className="border-border-subtle mt-4 flex items-center gap-3 rounded-xl border p-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
            verifyState === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-500"
              : verifyState === "empty"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                : "border-border-subtle bg-bg-sidebar text-text-muted",
          )}
        >
          {verifyState === "checking" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : verifyState === "success" ? (
            <CircleCheck size={16} />
          ) : verifyState === "empty" ? (
            <AlertCircle size={16} />
          ) : (
            <ShieldCheck size={16} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-text-main text-sm font-medium">
            {verifyState === "success"
              ? "Connection works — a test lead arrived"
              : verifyState === "checking"
                ? "Waiting for a test lead…"
                : verifyState === "empty"
                  ? "No new lead yet"
                  : "Check the connection"}
          </p>
          <p className="text-text-muted text-[11px] leading-snug">
            {verifyState === "empty"
              ? "Send test data in Google Ads, then check again."
              : "After “Send test data”, we look for a new row in the table."}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-border-subtle bg-bg-main shrink-0 gap-1.5"
          onClick={onVerify}
          disabled={verifyState === "checking"}
        >
          {verifyState === "checking" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          {verifyState === "idle" ? "Check connection" : "Check again"}
        </Button>
      </div>
    </div>
  );
};

// ── Read-only monospace value with a copy button ────────────────────────────
interface CopyFieldProps {
  label: string;
  value: string;
  secret?: boolean;
  emptyHint?: string;
  onCopy: () => void;
}

const CopyField = ({ label, value, secret, emptyHint, onCopy }: CopyFieldProps) => {
  const [revealed, setRevealed] = useState(false);
  const display = !value
    ? ""
    : secret && !revealed
      ? "•".repeat(Math.min(40, Math.max(12, value.length)))
      : value;
  return (
    <div className="space-y-1.5">
      <label className="text-text-main text-sm font-medium">{label}</label>
      {value ? (
        <div className="bg-bg-sidebar border-border-subtle flex items-center gap-2 rounded-lg border px-3 py-2">
          <span className="text-text-main flex-1 truncate font-mono text-xs">
            {display}
          </span>
          {secret && (
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              className="text-text-muted hover:text-text-main shrink-0 text-[11px] font-medium"
            >
              {revealed ? "Hide" : "Show"}
            </button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-border-subtle bg-bg-main h-7 shrink-0 gap-1.5 px-2"
            onClick={onCopy}
          >
            <Copy size={12} />
            Copy
          </Button>
        </div>
      ) : (
        <div className="border-border-subtle text-text-muted flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs">
          <AlertCircle size={13} className="shrink-0 text-amber-500" />
          {emptyHint}
        </div>
      )}
    </div>
  );
};
