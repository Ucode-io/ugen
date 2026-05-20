"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Check,
  X,
  Database,
  PanelRightClose,
  PanelLeftClose,
  Save,
  Ban,
  MoreHorizontal,
  Download,
  LayoutList,
  GitFork,
  Pencil,
  Trash2,
} from "lucide-react";
import { SchemaView, exportSchemaToCSV } from "./schema-view";
import { RecordEditModal } from "./record-edit-modal";
import { RecordDeleteDialog } from "./record-delete-dialog";
import { toast } from "sonner";
import {
  useDatabaseStore,
  useTableRecords,
  useTableDetail,
  useTableSchemaV2,
  useAddRecord,
  useUpdateRecord,
  useDeleteRecord,
  Column,
  databaseApi,
} from "@/entities/database";
import { DataTable } from "@/shared/ui";
import { Button } from "@/shared/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";
import {
  exportToCSV,
  exportToJSON,
  exportToXLSX,
} from "@/shared/lib/utils/export-utils";

import { Skeleton } from "@/shared/ui";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/entities/session";

type ActiveTab = "records" | "schema";

// Module-level cache so all cells for the same related table share one fetch
const _lookupCache = new Map<string, any[]>();
const _lookupInFlight = new Map<string, Promise<any[]>>();

const fetchLookupOptions = (
  relatedTable: string,
  projectId: string,
  clientTypeId: string,
): Promise<any[]> => {
  const key = `${relatedTable}:${projectId}`;
  if (_lookupCache.has(key)) return Promise.resolve(_lookupCache.get(key)!);
  if (_lookupInFlight.has(key)) return _lookupInFlight.get(key)!;
  const p = databaseApi
    .fetchTableRecords(relatedTable, projectId, clientTypeId, 200, 0)
    .then((r) => {
      _lookupCache.set(key, r.items);
      _lookupInFlight.delete(key);
      return r.items;
    })
    .catch(() => {
      _lookupInFlight.delete(key);
      return [] as any[];
    });
  _lookupInFlight.set(key, p);
  return p;
};

const getRelatedTable = (slug: string): string => {
  if (slug.endsWith("_guid")) return slug.slice(0, -5);
  if (slug.endsWith("_id")) return slug.slice(0, -3);
  return slug;
};

type FilterInputKind = "number" | "bool" | "date" | "datetime" | "lookup" | "text";

// Maps a field type (UI-level like NUMBER/CHECKBOX or PG-level like integer/boolean)
// to the most convenient input control for the filter value.
const getFilterInputKind = (rawType: string): FilterInputKind => {
  const type = (rawType || "").toUpperCase();
  if (type === "LOOKUP") return "lookup";
  if (["CHECKBOX", "SWITCH", "BOOLEAN", "BOOL"].includes(type)) return "bool";
  if (
    [
      "NUMBER",
      "FLOAT",
      "FLOAT_NOLIMIT",
      "FORMULA",
      "INCREMENT_NUMBER",
      "INTEGER",
      "SMALLINT",
      "BIGINT",
      "INT2",
      "INT4",
      "INT8",
      "SERIAL",
      "NUMERIC",
      "DECIMAL",
      "REAL",
      "DOUBLE PRECISION",
    ].includes(type)
  )
    return "number";
  if (type === "DATE") return "date";
  if (
    [
      "TIMESTAMP",
      "TIMESTAMPTZ",
      "TIMESTAMP WITH TIME ZONE",
      "TIMESTAMP WITHOUT TIME ZONE",
      "DATE_TIME",
      "DATETIME",
    ].includes(type)
  )
    return "datetime";
  return "text";
};

const getRecordLabel = (record: any): string => {
  const keys = Object.keys(record).filter(
    (k) =>
      typeof record[k] === "string" &&
      k !== "guid" &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(record[k] || ""),
  );
  if (keys.length > 0) return String(record[keys[0]]);
  return record.guid || record.id || "—";
};

const LookupEditSelect = ({
  slug,
  value,
  projectId,
  clientTypeId,
  onSelect,
  onClose,
  autoOpen = false,
}: {
  slug: string;
  value: any;
  projectId: string;
  clientTypeId: string;
  onSelect: (val: string) => void;
  onClose?: () => void;
  autoOpen?: boolean;
}) => {
  const relatedTable = getRelatedTable(slug);
  const cacheKey = `${relatedTable}:${projectId}`;

  const [options, setOptions] = useState<any[]>(
    () => _lookupCache.get(cacheKey) ?? [],
  );
  const [isLoading, setIsLoading] = useState(options.length === 0);

  useEffect(() => {
    let cancelled = false;
    fetchLookupOptions(relatedTable, projectId, clientTypeId).then((items) => {
      if (!cancelled) {
        setOptions(items);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [relatedTable, projectId, clientTypeId, cacheKey]);

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    const match = options.find((o) => (o.guid || o.id) === value);
    return match ? getRecordLabel(match) : String(value);
  }, [value, options]);

  return (
    <Popover
      defaultOpen={autoOpen}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <PopoverTrigger asChild>
        <div className="-mx-1 min-w-[200px] max-w-[400px] cursor-pointer truncate rounded px-1 py-0.5 text-[13px] leading-tight">
          {selectedLabel ? (
            <span className="text-text-main">{selectedLabel}</span>
          ) : (
            <span className="text-text-muted/40 text-[11px] italic">
              Select…
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="bg-bg-card border-border-subtle w-[280px] p-1 shadow-lg"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isLoading ? (
          <div className="text-text-muted px-3 py-2 text-[12px]">
            Loading…
          </div>
        ) : options.length === 0 ? (
          <div className="text-text-muted px-3 py-2 text-[12px]">
            No options found
          </div>
        ) : (
          <div className="max-h-[240px] overflow-y-auto">
            {options.map((opt) => {
              const val = opt.guid || opt.id || getRecordLabel(opt);
              const label = getRecordLabel(opt);
              return (
                <div
                  key={val}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(val);
                  }}
                  className={cn(
                    "hover:bg-hover-bg cursor-pointer truncate rounded-sm px-3 py-1.5 text-[12px]",
                    value === val
                      ? "text-primary font-medium"
                      : "text-text-main",
                  )}
                >
                  {label}
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

const LookupDisplayCell = ({
  slug,
  value,
  projectId,
  clientTypeId,
  onEdit,
  onClear,
}: {
  slug: string;
  value: any;
  projectId: string;
  clientTypeId: string;
  onEdit: () => void;
  onClear?: () => void;
}) => {
  const [options, setOptions] = useState<any[]>([]);

  const relatedTable = getRelatedTable(slug);

  useEffect(() => {
    let cancelled = false;
    fetchLookupOptions(relatedTable, projectId, clientTypeId).then((items) => {
      if (!cancelled) setOptions(items);
    });
    return () => {
      cancelled = true;
    };
  }, [relatedTable, projectId, clientTypeId]);

  const label = useMemo(() => {
    if (!value) return null;
    const match = options.find((o) => (o.guid || o.id) === value);
    return match ? getRecordLabel(match) : String(value);
  }, [value, options]);

  const hasValue = value !== null && value !== undefined && value !== "";

  return (
    <div
      className="group/lookup -mx-1 flex max-w-[400px] min-w-[200px] cursor-pointer items-center gap-1.5 rounded px-1 py-0 text-[13px] leading-tight"
      onClick={onEdit}
    >
      <div className="min-w-0 flex-1 truncate">
        {label ? (
          <span className="text-text-main">{label}</span>
        ) : (
          <span className="text-text-muted/40 text-[11px] italic">Select…</span>
        )}
      </div>
      {hasValue && onClear && (
        <button
          type="button"
          title="Clear value"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="text-text-muted/60 hover:text-text-main hover:bg-hover-bg flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 transition-opacity group-hover/lookup:opacity-100"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
};

export const RecordsView = ({
  projectId,
  isPannelOpen,
  onTogglePannel,
}: {
  projectId: string;
  isPannelOpen: boolean;
  onTogglePannel: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("records");
  const t = useTranslations("widgets.databaseStudio");
  const ucodeProjectId = useAuthStore((state) => state.ucodeProjectId);
  const { selectedTable } = useDatabaseStore();
  const {
    data: tableDetail,
    isLoading: isDetailLoading,
    refetch: refetchTableDetail,
  } = useTableDetail(selectedTable, ucodeProjectId || "");
  const {
    data: schemaColumns = [],
    isLoading: isSchemaColumnsLoading,
    refetch: refetchSchema,
  } = useTableSchemaV2(selectedTable, ucodeProjectId || "");
  const [filterQuery, setFilterQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [localFilters, setLocalFilters] = useState<
    { id: string; column: string; operator: string; value: string }[]
  >([]);
  const [appliedFilters, setAppliedFilters] = useState<any[]>([]);

  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  const [isInlineAdding, setIsInlineAdding] = useState(false);
  const [isAddingField, setIsAddingField] = useState(false);
  const [inlineRowData, setInlineRowData] = useState<Record<string, any>>({});
  const [editingCell, setEditingCell] = useState<{
    id: string;
    key: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  // Ref that's always current — used in uncontrolled-input handlers and async callbacks
  // so we never capture stale closure values.
  const editValueRef = useRef<any>(null);
  editValueRef.current = editValue;
  const editingKey = editingCell
    ? `${editingCell.id}:${editingCell.key}`
    : null;

  const queryClient = useQueryClient();
  const addRecordMutation = useAddRecord();
  const updateRecordMutation = useUpdateRecord();
  const deleteRecordMutation = useDeleteRecord();

  const [editingRecord, setEditingRecord] = useState<Record<
    string,
    any
  > | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, any> | null>(
    null,
  );

  const currentPage = Math.floor(offset / limit) + 1;
  const [tempPage, setTempPage] = useState(String(currentPage));
  const [tempLimit, setTempLimit] = useState(String(limit));

  useEffect(() => {
    setTempPage(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    setTempLimit(String(limit));
  }, [limit]);

  const handlePageBlur = () => {
    const val = parseInt(tempPage);
    if (!isNaN(val) && val > 0) {
      setOffset((val - 1) * limit);
    } else {
      setTempPage(String(currentPage));
    }
  };

  const handleLimitBlur = () => {
    const val = parseInt(tempLimit);
    if (!isNaN(val) && val > 0) {
      setLimit(val);
      setOffset(0);
    } else {
      setTempLimit(String(limit));
    }
  };

  const schema: Column[] =
    tableDetail?.fields || (tableDetail as any)?.data?.fields || [];
  const allColumns = useMemo(() => schema.map((c) => c.slug), [schema]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  useEffect(() => {
    if (allColumns.length === 0) return;
    setSelectedColumns((prev) => {
      if (prev.length === 0) return allColumns;
      // Auto-include any columns that were added since the last snapshot
      // so newly created fields always appear without requiring a manual refresh.
      const brandNew = allColumns.filter((c) => !prev.includes(c));
      return brandNew.length > 0 ? [...prev, ...brandNew] : prev;
    });
  }, [allColumns]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const cleanedFilters = localFilters
        .map((f) => {
          let val: any = f.value;
          if (f.operator === "in") {
            val = val
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean);
          } else if (f.value === "true") {
            val = true;
          } else if (f.value === "false") {
            val = false;
          } else if (!isNaN(Number(f.value)) && f.value.trim() !== "") {
            val = Number(f.value);
          }
          return { column: f.column, operator: f.operator, value: val };
        })
        .filter(
          (f) =>
            ["is_null", "is_not_null"].includes(f.operator) || f.value !== "",
        );
      setAppliedFilters(cleanedFilters);
    }, 400);
    return () => clearTimeout(handler);
  }, [localFilters]);

  // Reset offset when limit changes or filters apply
  useEffect(() => {
    setOffset(0);
  }, [limit, appliedFilters]);

  const {
    data,
    isLoading: isRecordsLoading,
    refetch,
  } = useTableRecords(
    selectedTable,
    projectId,
    ucodeProjectId || "",
    limit,
    offset,
    appliedFilters,
    selectedColumns,
  );

  const records = data?.items || [];
  const fetchDuration = data?.duration || 0;
  const types = data?.types || {};

  const transformValue = (val: any, col: Column) => {
    if (val === "" || val === undefined || val === null) return null;

    const type = (col.type || "").toUpperCase();

    // Provided Types Mapping Categories
    const floatTypes = ["NUMBER", "FLOAT", "FLOAT_NOLIMIT", "FORMULA"];
    const boolTypes = ["CHECKBOX", "SWITCH"];
    const arrayTypes = [
      "MULTISELECT",
      "LOOKUPS",
      "DYNAMIC",
      "LANGUAGE_TYPE",
      "MULTI_IMAGE",
      "MULTI_FILE",
      "MONEY",
      "ARRAY",
    ];
    const serialTypes = ["INCREMENT_NUMBER"];

    if (floatTypes.includes(type) || serialTypes.includes(type)) {
      const num = Number(val);
      if (isNaN(num)) return { error: `${col.label} must be a number` };
      return num;
    } else if (boolTypes.includes(type)) {
      return val === "true" || val === true || val === "1";
    } else if (arrayTypes.includes(type)) {
      return typeof val === "string"
        ? val
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : val;
    }
    return val;
  };

  const handleSaveInline = async () => {
    if (!selectedTable) return;

    const dataToSave: Record<string, any> = {};
    for (const col of schema) {
      if (col.isPrimaryKey && col.type === "uuid") continue;

      const rawVal = inlineRowData[col.slug];
      if (
        col.required &&
        (rawVal === undefined || rawVal === "" || rawVal === null)
      ) {
        toast.error(`${col.label} is required`);
        return;
      }

      const result = transformValue(rawVal, col);
      if (result && typeof result === "object" && "error" in result) {
        toast.error(result.error as string);
        return;
      }
      dataToSave[col.slug] = result;
    }

    try {
      await addRecordMutation.mutateAsync({
        tableName: selectedTable,
        data: dataToSave,
      });
      setIsInlineAdding(false);
      setInlineRowData({});
      toast.success("Record added successfully");
      refetch();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add record");
    }
  };

  const clearLookupValue = async (row: any, key: string) => {
    if (!selectedTable) return;
    const col = schema?.find((s) => s.slug === key);
    if (!col) return;
    const currentVal = row[key];
    if (currentVal === null || currentVal === undefined || currentVal === "")
      return;

    const updatedData = { ...row, [key]: null };
    try {
      await updateRecordMutation.mutateAsync({
        tableName: selectedTable,
        data: updatedData,
      });
      queryClient.invalidateQueries({
        queryKey: ["db-records", selectedTable, projectId, ucodeProjectId || ""],
      });
    } catch {
      toast.error("Failed to clear value");
    }
  };

  const handleUpdateRecord = async (row: any, key: string, newVal: any) => {
    if (!selectedTable || editingCell === null) return;

    // Close edit mode immediately — no waiting for the API response.
    setEditingCell(null);
    setEditValue(null);
    editValueRef.current = null;

    if (newVal === row[key]) return;

    const col = schema?.find((s) => s.slug === key);
    if (!col) return;

    const result = transformValue(newVal, col);
    if (result && typeof result === "object" && "error" in result) {
      toast.error(result.error as string);
      return;
    }

    const updatedData = { ...row, [key]: result };

    try {
      await updateRecordMutation.mutateAsync({
        tableName: selectedTable,
        data: updatedData,
      });
      // Update the cached row in place — no refetch needed.
      queryClient.setQueryData(
        [
          "db-records",
          selectedTable,
          projectId,
          ucodeProjectId || "",
          limit,
          offset,
          appliedFilters,
          selectedColumns,
        ],
        (old: any) => {
          if (!old) return old;
          const rowId = row.guid || row.id;
          return {
            ...old,
            items: old.items.map((item: any) =>
              (item.guid || item.id) === rowId
                ? { ...item, [key]: result }
                : item,
            ),
          };
        },
      );
      toast.success("Record updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update record");
    }
  };

  const handleExport = (format: "json" | "csv" | "xlsx") => {
    if (!records.length) {
      toast.error("No records to export");
      return;
    }

    const filename = `${selectedTable}_export_${new Date().getTime()}`;

    try {
      if (format === "json") {
        exportToJSON(records, filename);
        toast.success("Successfully exported to JSON");
      } else if (format === "csv") {
        exportToCSV(records, filename);
        toast.success("Successfully exported to CSV");
      } else if (format === "xlsx") {
        exportToXLSX(records, filename);
        toast.success("Successfully exported to XLSX");
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export data");
    }
  };

  const displayRecords = useMemo(() => {
    if (!isInlineAdding) return records;
    return [{ __isDraft: true, ...inlineRowData }, ...records];
  }, [records, isInlineAdding, inlineRowData]);

  const isSchemaLoading = isDetailLoading;

  // Column keys derived from schema (stable) with records as structural fallback.
  // Depends on records.length (row added/removed) and schema — NOT on record values,
  // so updating a field does not recreate column definitions.
  const baseColumnKeys = useMemo(() => {
    if (schema?.length > 0) return schema.map((c) => c.slug);
    if (records.length > 0) return Object.keys(records[0]);
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, records.length]);

  const columns = useMemo(() => {
    let baseKeys = baseColumnKeys;

    if (selectedColumns.length > 0) {
      baseKeys = baseKeys.filter((k) => selectedColumns.includes(k));
    }

    const actionsColumn = {
      accessorKey: "__actions",
      header: () => (
        <div className="flex w-20 items-center justify-center py-1">
          <span className="text-text-main text-[11px] font-bold tracking-wider uppercase">
            Actions
          </span>
        </div>
      ),
      cell: ({ row }: { row: { original: any } }) => {
        if (row.original.__isDraft) {
          return <div className="w-20" />;
        }
        return (
          <div className="flex w-20 items-center justify-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingRecord(row.original);
              }}
              className="text-text-muted hover:text-primary hover:bg-primary/10 flex h-6 w-6 items-center justify-center rounded transition-colors"
              title="Edit record"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(row.original);
              }}
              className="text-text-muted hover:text-destructive hover:bg-destructive/10 flex h-6 w-6 items-center justify-center rounded transition-colors"
              title="Delete record"
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      },
    };

    const dataColumns = baseKeys.map((key) => {
      const schemaField = schema?.find((s) => s.slug === key);
      const label = schemaField?.label || key;
      const pgType = types[key] || "";

      return {
        accessorKey: key,
        header: () => (
          <div className="flex min-w-[200px] items-center gap-0.5 py-1">
            <div
              className="text-text-main truncate text-[11px] font-bold tracking-wider uppercase"
              title={label}
            >
              {label}
            </div>
            {pgType && (
              <div className="text-text-muted/60 bg-bg-sidebar border-border-subtle/50 w-fit rounded border px-1 font-mono text-[9px] font-medium uppercase">
                {pgType}
              </div>
            )}
          </div>
        ),
        cell: ({
          row,
        }: {
          row: {
            getValue: (key: string) => unknown;
            original: any;
            id: string;
          };
        }) => {
          const isEditing =
            editingCell?.id === row.id && editingCell?.key === key;

          if (isEditing) {
            const schemaFieldEdit = schema?.find((s) => s.slug === key);
            if (schemaFieldEdit?.type?.toUpperCase() === "LOOKUP") {
              return (
                <div className="max-w-[400px] min-w-[200px]">
                  <LookupEditSelect
                    slug={key}
                    value={editValue ?? ""}
                    projectId={projectId}
                    clientTypeId={ucodeProjectId || ""}
                    autoOpen
                    onSelect={(val) => handleUpdateRecord(row.original, key, val)}
                    onClose={() => {
                      setEditingCell(null);
                      setEditValue(null);
                    }}
                  />
                </div>
              );
            }
            return (
              <div className="max-w-[400px] min-w-[200px] px-0 py-0 text-[13px] leading-tight">
                <input
                  autoFocus
                  type="text"
                  defaultValue={editValueRef.current ?? ""}
                  onChange={(e) => {
                    editValueRef.current = e.target.value;
                  }}
                  onBlur={() =>
                    handleUpdateRecord(row.original, key, editValueRef.current)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      handleUpdateRecord(row.original, key, editValueRef.current);
                    if (e.key === "Escape") {
                      setEditingCell(null);
                      setEditValue(null);
                    }
                  }}
                  className="placeholder:text-text-muted/30 w-full border-none bg-transparent p-0 text-[13px] font-medium outline-none"
                />
              </div>
            );
          }

          if (row.original.__isDraft) {
            const schemaField = schema?.find((s) => s.slug === key);
            const isAutoUuid =
              schemaField?.isPrimaryKey && schemaField?.type === "uuid";

            if (isAutoUuid) {
              return (
                <div className="text-text-muted/40 px-2 text-[11px] italic">
                  Auto-gen
                </div>
              );
            }

            if (schemaField?.type?.toUpperCase() === "LOOKUP") {
              return (
                <div className="max-w-[400px] min-w-[200px]">
                  <LookupEditSelect
                    slug={key}
                    value={row.original[key] ?? ""}
                    projectId={projectId}
                    clientTypeId={ucodeProjectId || ""}
                    onSelect={(val) =>
                      setInlineRowData((prev) => ({ ...prev, [key]: val }))
                    }
                  />
                </div>
              );
            }

            return (
              <div className="max-w-[400px] min-w-[200px] px-0 py-0 text-[13px] leading-tight">
                <input
                  type="text"
                  value={row.original[key] ?? ""}
                  onChange={(e) =>
                    setInlineRowData((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                  placeholder={`Enter ${schemaField?.type || "value"}...`}
                  className="placeholder:text-text-muted/30 w-full border-none bg-transparent p-0 text-[13px] outline-none placeholder:text-sm"
                />
              </div>
            );
          }

          const val = row.getValue(key);

          if (schemaField?.type?.toUpperCase() === "LOOKUP") {
            return (
              <LookupDisplayCell
                slug={key}
                value={val}
                projectId={projectId}
                clientTypeId={ucodeProjectId || ""}
                onEdit={() => {
                  setEditingCell({ id: row.id, key });
                  setEditValue(val);
                }}
                onClear={() => clearLookupValue(row.original, key)}
              />
            );
          }

          let content: React.ReactNode = null;

          // Enhanced rendering based on PG Type
          const isArrayType = pgType.startsWith("_");
          const isUuid = pgType === "uuid";
          const isBool = pgType === "bool";
          const isTimestamp =
            pgType === "timestamp" || pgType === "timestamptz";

          if (typeof val === "number") {
            content = (
              <span className="font-mono text-[12px] font-semibold text-blue-500">
                {val}
              </span>
            );
          } else if (isBool || typeof val === "boolean") {
            const boolVal = val === true || val === "true" || val === "1";
            content = (
              <span
                className={cn(
                  "inline-flex min-w-[50px] items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                  boolVal
                    ? "bg-primary/10 text-primary border-primary/20 border"
                    : "bg-text-muted/10 text-text-muted border-text-muted/20 border",
                )}
              >
                {boolVal ? "TRUE" : "FALSE"}
              </span>
            );
          } else if (val === null) {
            content = (
              <span className="text-text-muted/40 px-1 text-[11px] italic">
                null
              </span>
            );
          } else if (
            isUuid ||
            (typeof val === "string" &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                val,
              ))
          ) {
            content = (
              <span
                className="block w-[200px] truncate font-mono text-[11px] text-amber-600/80"
                title={String(val)}
              >
                {String(val)}
              </span>
            );
          } else if (isArrayType || (typeof val === "object" && val !== null)) {
            const displayObj =
              typeof val === "string" ? val : JSON.stringify(val);
            content = (
              <div className="flex max-w-[300px] items-center gap-1 overflow-hidden">
                <span className="truncate rounded border border-teal-100/50 bg-teal-50 px-1 font-mono text-[10px] text-teal-600">
                  {displayObj}
                </span>
              </div>
            );
          } else {
            const isDate =
              isTimestamp ||
              (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val));
            const displayVal = String(val ?? "");
            content = (
              <span
                className={cn(
                  isDate
                    ? "text-text-muted/70 font-mono text-[12px]"
                    : "text-text-main",
                )}
                title={displayVal}
              >
                {displayVal}
              </span>
            );
          }

          return (
            <div
              className="hover:bg-primary/[0.04] -mx-1 max-w-[400px] min-w-[200px] cursor-text truncate rounded px-1 py-0 text-[13px] leading-tight transition-colors"
              onClick={() => {
                setEditingCell({ id: row.id, key });
                setEditValue(val);
              }}
            >
              {content}
            </div>
          );
        },
      };
    });

    return [...dataColumns, actionsColumn];
  }, [
    schema,
    baseColumnKeys,
    selectedColumns,
    isInlineAdding,
    editingKey,
  ]);

  useEffect(() => {
    // Reset column selection whenever the user switches to a different table
    setSelectedColumns([]);
    setIsAddingField(false);
  }, [selectedTable]);

  useEffect(() => {
    if (activeTab !== "schema") setIsAddingField(false);
    // Schema is shared between both tabs, always refetch on switch.
    refetchSchema();
    // Records tab uses tableDetail.fields for column headers AND rows data,
    // so both must be refetched when switching back to records.
    if (activeTab === "records") {
      refetchTableDetail();
      refetch();
    }
  }, [activeTab]);

  const setFilterValue = (id: string, value: string) =>
    setLocalFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, value } : f)),
    );

  const renderFilterValueInput = (filter: {
    id: string;
    column: string;
    operator: string;
    value: string;
  }) => {
    const col = schema?.find((s) => s.slug === filter.column);
    const inputClass =
      "bg-bg-card border-border-subtle focus:border-primary/50 h-8 w-[240px] shrink-0 rounded-md border px-3 py-1 text-[13px] font-medium outline-none";

    // The "in" operator always takes a comma-separated list regardless of type.
    const kind =
      filter.operator === "in" ? "text" : getFilterInputKind(col?.type || "");

    if (kind === "bool") {
      return (
        <select
          value={filter.value}
          onChange={(e) => setFilterValue(filter.id, e.target.value)}
          className={inputClass}
        >
          <option value="">Select…</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (kind === "lookup") {
      return (
        <div className={cn(inputClass, "flex items-center")}>
          <LookupEditSelect
            slug={filter.column}
            value={filter.value}
            projectId={projectId}
            clientTypeId={ucodeProjectId || ""}
            onSelect={(val) => setFilterValue(filter.id, val)}
          />
        </div>
      );
    }

    const inputType =
      kind === "number"
        ? "number"
        : kind === "date"
          ? "date"
          : kind === "datetime"
            ? "datetime-local"
            : "text";

    return (
      <input
        type={inputType}
        value={filter.value}
        onChange={(e) => setFilterValue(filter.id, e.target.value)}
        placeholder={filter.operator === "in" ? "v1,v2,..." : "..."}
        className={inputClass}
      />
    );
  };

  if (!selectedTable) {
    return (
      <div className="text-text-muted flex h-full flex-col items-center justify-center">
        <Database size={32} className="mb-4 opacity-50" />
        <p className="text-sm">Select a table to view its records</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full max-w-[100%] flex-col overflow-hidden">
      <div className="bg-bg-main/50 border-border-subtle flex min-h-[47px] shrink-0 items-center justify-between overflow-x-auto border-b p-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePannel}
            className="text-text-muted hover:text-text-main hover:bg-hover-bg flex shrink-0 items-center justify-center rounded-lg p-1 transition-colors"
            title={isPannelOpen ? `Open AI Chat` : `Collapse AI Chat`}
          >
            {!isPannelOpen ? (
              <PanelRightClose size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>

          {/* View mode toggle: Table | Schema */}
          <div className="bg-bg-card border-border-subtle flex shrink-0 items-center gap-0.5 rounded-lg border p-0.5">
            <button
              id="db-view-tab-records"
              onClick={() => setActiveTab("records")}
              title="Table view"
              className={cn(
                "flex items-center justify-center rounded-[4px] p-1 transition-all duration-150",
                activeTab === "records"
                  ? "bg-bg-main text-primary shadow-sm"
                  : "text-text-muted/60 hover:text-text-muted",
              )}
            >
              <LayoutList size={16} />
            </button>
            <button
              id="db-view-tab-schema"
              onClick={() => setActiveTab("schema")}
              title="Schema view"
              className={cn(
                "flex items-center justify-center rounded-[4px] p-1 transition-all duration-150",
                activeTab === "schema"
                  ? "bg-bg-main text-primary shadow-sm"
                  : "text-text-muted/60 hover:text-text-muted",
              )}
            >
              <GitFork size={16} />
            </button>
          </div>

          {activeTab === "records" && (
            <>
              {isInlineAdding ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-primary hover:bg-primary/90 gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-white"
                    onClick={handleSaveInline}
                    loading={addRecordMutation.isPending}
                  >
                    <Save size={14} />
                    Save changes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg gap-1.5 px-2.5 py-1.5 text-[11px] font-medium shadow-none"
                    onClick={() => {
                      setIsInlineAdding(false);
                      setInlineRowData({});
                    }}
                  >
                    <Ban size={14} />
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsInlineAdding(true);
                    setInlineRowData({});
                  }}
                  className="border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
                >
                  <Plus size={14} />
                  {t("records.addRow")}
                </button>
              )}

              <button
                onClick={() => {
                  if (!isFilterOpen && localFilters.length === 0) {
                    const defaultCol = schema?.[0]?.slug || "";
                    setLocalFilters([
                      {
                        id: Math.random().toString(36).substring(7),
                        column: defaultCol,
                        operator: "eq",
                        value: "",
                      },
                    ]);
                  }
                  setIsFilterOpen(!isFilterOpen);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  isFilterOpen
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg",
                )}
              >
                <Filter size={14} />
                {t("records.filter")}
              </button>

              <Popover>
                <PopoverTrigger asChild>
                  <button className="border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors">
                    <SlidersHorizontal size={14} />
                    Columns
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="bg-bg-card border-border-subtle w-56 rounded-md p-0 shadow-md"
                  align="start"
                >
                  <div className="border-border-subtle flex items-center justify-between border-b px-3 py-2">
                    <span className="text-text-main text-xs font-medium">
                      Toggle columns
                    </span>
                    <button
                      onClick={() => setSelectedColumns([])}
                      className="text-text-muted hover:text-text-main text-[11px]"
                    >
                      Deselect all
                    </button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-1">
                    {allColumns.map((col) => {
                      const isSelected = selectedColumns.includes(col);
                      return (
                        <div
                          key={col}
                          className="hover:bg-hover-bg group flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs"
                          onClick={() => {
                            setSelectedColumns((prev) =>
                              isSelected
                                ? prev.filter((c) => c !== col)
                                : [...prev, col],
                            );
                          }}
                        >
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                            {isSelected && (
                              <Check size={14} className="text-primary" />
                            )}
                          </div>
                          <span className="text-text-main group-hover:text-text-main truncate transition-colors">
                            {col}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>

        {activeTab === "schema" && (
          <div className="ml-4 flex shrink-0 items-center gap-2">
            <div className="text-text-muted/60 flex items-center gap-1.5 px-1 text-[11px] font-medium">
              <span>{schemaColumns.length}</span>
              <span>fields</span>
            </div>
            <button
              onClick={() => setIsAddingField(!isAddingField)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                isAddingField
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg",
              )}
            >
              <Plus size={14} /> Add field
            </button>
            <button
              onClick={() =>
                exportSchemaToCSV(selectedTable || "", schemaColumns)
              }
              className="border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
            >
              <Download size={14} /> Export DDL
            </button>
            <button
              onClick={() => refetchSchema()}
              className="border-border-subtle bg-bg-card hover:bg-hover-bg text-text-muted hover:text-text-main rounded-md border p-1.5 shadow-sm transition-colors"
              title="Refresh"
            >
              <RefreshCw
                size={14}
                className={cn(isSchemaColumnsLoading && "animate-spin")}
              />
            </button>
          </div>
        )}

        {activeTab === "records" && (
          <div className="ml-4 flex shrink-0 items-center gap-3">
            <div className="text-text-muted/60 ml-auto flex items-center gap-1.5 px-1 text-[11px] font-medium">
              <span>{records.length}</span>
              <span>rows</span>
              <span className="opacity-40">•</span>
              <span>{fetchDuration}ms</span>
            </div>
            <div className="border-border-subtle bg-bg-main text-text-muted hover:border-border-main flex h-8 items-center overflow-hidden rounded-md border text-[11px] font-medium shadow-sm transition-colors">
              <button
                className="border-border-subtle hover:bg-hover-bg hover:text-text-main h-full shrink-0 border-r px-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                title="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="border-border-subtle bg-bg-card/50 flex h-full items-center gap-1 border-r px-2">
                <input
                  type="text"
                  value={tempLimit}
                  onChange={(e) => setTempLimit(e.target.value)}
                  onBlur={handleLimitBlur}
                  onKeyDown={(e) => e.key === "Enter" && handleLimitBlur()}
                  className="text-text-main focus:text-primary w-8 bg-transparent text-center font-mono transition-colors outline-none"
                  title="Rows per page"
                />
              </div>
              <div className="border-border-subtle bg-bg-card/50 flex h-full items-center gap-1 border-r px-2">
                <input
                  type="text"
                  value={tempPage}
                  onChange={(e) => setTempPage(e.target.value)}
                  onBlur={handlePageBlur}
                  onKeyDown={(e) => e.key === "Enter" && handlePageBlur()}
                  className="text-text-main focus:text-primary w-8 bg-transparent text-center font-mono transition-colors outline-none"
                  title="Current page"
                />
              </div>
              <button
                className="hover:bg-hover-bg hover:text-text-main h-full shrink-0 px-2 transition-colors disabled:opacity-50"
                disabled={!records || records.length < limit}
                onClick={() => setOffset(offset + limit)}
                title="Next Page"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <button
              onClick={() => refetch()}
              className="border-border-subtle bg-bg-card hover:bg-hover-bg text-text-muted hover:text-text-main rounded-md border p-1.5 shadow-sm transition-colors"
              title="Refresh"
            >
              <RefreshCw
                size={14}
                className={cn(isRecordsLoading && "animate-spin")}
              />
            </button>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="border-border-subtle bg-bg-card hover:bg-hover-bg text-text-muted hover:text-text-main rounded-md border p-1.5 shadow-sm transition-colors"
                  title="Options"
                >
                  <MoreHorizontal size={14} />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="bg-bg-card border-border-subtle animate-in fade-in-0 zoom-in-95 w-[180px] rounded-xl p-1 shadow-xl duration-200"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => refetch()}
                    className="text-text-main hover:bg-hover-bg group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors"
                  >
                    <RefreshCw
                      size={14}
                      className={cn(
                        "text-text-muted group-hover:text-primary transition-colors",
                        isRecordsLoading && "animate-spin",
                      )}
                    />
                    Refresh rows
                  </button>
                  <div className="bg-border-subtle mx-1 my-1 h-px" />
                  <button
                    onClick={() => handleExport("json")}
                    className="text-text-main hover:bg-hover-bg group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors"
                  >
                    <Download
                      size={14}
                      className="text-text-muted group-hover:text-primary transition-colors"
                    />
                    Export all to .json
                  </button>
                  <button
                    onClick={() => handleExport("csv")}
                    className="text-text-main hover:bg-hover-bg group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors"
                  >
                    <Download
                      size={14}
                      className="text-text-muted group-hover:text-primary transition-colors"
                    />
                    Export all to .csv
                  </button>
                  <button
                    onClick={() => handleExport("xlsx")}
                    className="text-text-main hover:bg-hover-bg group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors"
                  >
                    <Download
                      size={14}
                      className="text-text-muted group-hover:text-primary transition-colors"
                    />
                    Export all to .xlsx
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Schema tab renders full SchemaView, bypassing records UI */}
      {activeTab === "schema" && (
        <SchemaView
          isAddingField={isAddingField}
          setIsAddingField={setIsAddingField}
        />
      )}

      {activeTab === "records" && isFilterOpen && (
        <div
          className={cn(
            "bg-bg-main/30 border-border-subtle animate-in fade-in slide-in-from-top-2 flex shrink-0 items-start gap-2 border-b p-3 duration-200",
            localFilters.length > 0
              ? "items-start"
              : "items-center self-stretch",
          )}
        >
          {localFilters.length === 0 ? (
            <div className="text-text-muted px-3 py-2 text-xs font-medium">
              No active filters. Click Add filter.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {localFilters.map((filter, index) => (
                <div key={filter.id} className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setLocalFilters((prev) =>
                        prev.filter((f) => f.id !== filter.id),
                      )
                    }
                    className="text-text-muted hover:text-destructive bg-bg-card border-border-subtle hover:border-destructive/30 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors"
                    title="Remove filter"
                  >
                    <X size={12} />
                  </button>
                  <span className="text-text-muted bg-bg-card flex w-12 shrink-0 justify-center rounded-md px-2 py-1 text-[13px] font-medium">
                    {index === 0 ? "where" : "and"}
                  </span>

                  <select
                    value={filter.column}
                    onChange={(e) =>
                      setLocalFilters((prev) =>
                        prev.map((f) =>
                          f.id === filter.id
                            ? { ...f, column: e.target.value }
                            : f,
                        ),
                      )
                    }
                    className="bg-bg-card border-border-subtle text-text-main focus:border-primary/50 h-8 w-[180px] shrink-0 rounded-md border px-3 py-1 text-[13px] font-medium outline-none"
                  >
                    {schema?.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filter.operator}
                    onChange={(e) =>
                      setLocalFilters((prev) =>
                        prev.map((f) =>
                          f.id === filter.id
                            ? { ...f, operator: e.target.value }
                            : f,
                        ),
                      )
                    }
                    className="bg-bg-card border-border-subtle text-text-main focus:border-primary/50 h-8 w-[160px] shrink-0 rounded-md border px-3 py-1 text-[13px] font-medium outline-none"
                  >
                    <option value="eq">equals</option>
                    <option value="neq">not equal</option>
                    <option value="gt">greater than</option>
                    <option value="gte">greater or eq</option>
                    <option value="lt">less</option>
                    <option value="lte">less or eq</option>
                    <option value="like">like</option>
                    <option value="not_like">not like</option>
                    <option value="ilike">ilike</option>
                    <option value="is_null">is null</option>
                    <option value="is_not_null">is not null</option>
                    <option value="in">is in</option>
                  </select>

                  {!["is_null", "is_not_null"].includes(filter.operator) &&
                    renderFilterValueInput(filter)}
                </div>
              ))}
            </div>
          )}

          <div
            className={cn(
              "border-border-subtle flex h-full items-start gap-3 border-l pl-8 transition-all duration-200",
            )}
          >
            <div className="flex h-8 items-center gap-2">
              <button
                onClick={() => {
                  const defaultCol = schema?.[0]?.slug || "";
                  setLocalFilters((prev) => [
                    ...prev,
                    {
                      id: Math.random().toString(36).substring(7),
                      column: defaultCol,
                      operator: "eq",
                      value: "",
                    },
                  ]);
                }}
                className="border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
              >
                <Plus size={12} /> Add filter
              </button>
              <button
                onClick={() => {
                  setLocalFilters([]);
                }}
                className="text-text-muted hover:text-destructive text-xs font-medium transition-colors"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "records" && (
        <div className="flex-1 overflow-auto">
          {isRecordsLoading ? (
            <div className="space-y-4 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  {Array.from({ length: columns.length || 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-8 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={displayRecords}
              isLoading={isRecordsLoading}
              emptyMessage={t("records.noResults")}
              containerClassName="border-none shadow-none"
              tableClassName="min-w-max border-collapse"
              rowClassName={(row: any) =>
                row.__isDraft ? "bg-primary/[0.04] dark:bg-primary/[0.08]" : ""
              }
              className="[&_td]:border-border-subtle [&_th]:border-border-subtle rounded-none border-none [&_td]:border [&_td]:p-1.5 [&_th]:h-8 [&_th]:border [&_th]:p-1.5"
            />
          )}
        </div>
      )}

      {editingRecord && selectedTable && (
        <RecordEditModal
          open={!!editingRecord}
          tableName={selectedTable}
          schema={schema}
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSuccess={() => refetch()}
        />
      )}

      {deleteTarget && selectedTable && (
        <RecordDeleteDialog
          recordLabel={String(
            deleteTarget.guid ?? deleteTarget.id ?? "this record",
          )}
          isLoading={deleteRecordMutation.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            const guid = deleteTarget.guid ?? deleteTarget.id;
            if (!guid) {
              toast.error("Record has no guid — cannot delete");
              return;
            }
            try {
              await deleteRecordMutation.mutateAsync({
                tableName: selectedTable,
                guid,
              });
              toast.success("Record deleted");
              setDeleteTarget(null);
              refetch();
            } catch (err) {
              console.error(err);
              toast.error("Failed to delete record");
            }
          }}
        />
      )}
    </div>
  );
};
