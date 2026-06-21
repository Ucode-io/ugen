"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Database,
  Search,
  Table as TableIcon,
} from "lucide-react";
import { useTables, useTableDetail } from "@/entities/database";
import type { Table } from "@/entities/database";
import { useAuthStore } from "@/entities/session";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";
import { toast } from "sonner";
import {
  googleCalendarIntegrationApi,
  type GoogleCalendarEventField,
  type GoogleCalendarFieldBinding,
} from "../api";

interface CalendarFieldDef {
  key: GoogleCalendarEventField;
  label: string;
  required: boolean;
}

// Google Calendar event properties a table column can be bound to. Order = the
// display order; `required` marks properties an event cannot exist without.
const CALENDAR_FIELDS: CalendarFieldDef[] = [
  { key: "summary", label: "Title", required: true },
  { key: "start", label: "Start", required: true },
  { key: "end", label: "End", required: true },
  { key: "description", label: "Description", required: false },
  { key: "location", label: "Location", required: false },
  { key: "status", label: "Status", required: false },
];

// Google Calendar event property → table column slug.
type Mapping = Partial<Record<GoogleCalendarEventField, string>>;

interface GoogleCalendarFieldMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GoogleCalendarFieldMappingModal = ({
  open,
  onOpenChange,
}: GoogleCalendarFieldMappingModalProps) => {
  const projectId = useAuthStore((s) => s.ucodeProjectId) || "";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  // The API saves by table id (`table_id`); the rest of the UI keys off slug, so
  // we capture the id when a table is picked.
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  // Mapping kept per table slug, so switching tables preserves in-session edits.
  const [mappingByTable, setMappingByTable] = useState<Record<string, Mapping>>(
    {},
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: tables = [], isLoading: tablesLoading } = useTables(
    debouncedSearch,
    200,
    0,
  );

  const { data: tableDetail, isLoading: fieldsLoading } = useTableDetail(
    selectedTable,
    projectId,
  );
  // Bind to the table's uCode fields (what the Calendar mapping API validates
  // against), NOT the raw DB columns: the latter include system fields like
  // created_at / updated_at / deleted_at that the endpoint rejects with
  // "field not found in table".
  const columns = tableDetail?.fields ?? [];

  // Seed a table's saved binding the first time it is opened this session —
  // without clobbering edits made before the user switched away and back.
  useEffect(() => {
    if (!selectedTable || !projectId) return;
    setMappingByTable((prev) => {
      if (prev[selectedTable]) return prev;
      const saved = googleCalendarIntegrationApi.getFieldBinding(
        projectId,
        selectedTable,
      );
      return { ...prev, [selectedTable]: saved?.mapping ?? {} };
    });
  }, [selectedTable, projectId]);

  const mapping: Mapping =
    (selectedTable && mappingByTable[selectedTable]) || {};

  // Which calendar property (if any) a column is currently bound to.
  const propertyForColumn = (
    colSlug: string,
  ): GoogleCalendarEventField | "" =>
    CALENDAR_FIELDS.find((f) => mapping[f.key] === colSlug)?.key ?? "";

  const assignColumn = (
    colSlug: string,
    property: GoogleCalendarEventField | "",
  ) => {
    if (!selectedTable) return;
    setMappingByTable((prev) => {
      const current: Mapping = { ...(prev[selectedTable] ?? {}) };
      // Unbind this column from whatever property it currently held.
      for (const f of CALENDAR_FIELDS) {
        if (current[f.key] === colSlug) delete current[f.key];
      }
      // Bind the chosen property to this column (steals it from another column).
      if (property) current[property] = colSlug;
      return { ...prev, [selectedTable]: current };
    });
  };

  const mappedCount = CALENDAR_FIELDS.filter((f) => mapping[f.key]).length;
  const missingRequired = CALENDAR_FIELDS.filter(
    (f) => f.required && !mapping[f.key],
  );

  const handleSave = async () => {
    if (!selectedTable) return;
    setIsSaving(true);
    try {
      const binding: GoogleCalendarFieldBinding = {
        tableId:
          selectedTableId ||
          tables.find((t) => t.slug === selectedTable)?.id ||
          "",
        tableSlug: selectedTable,
        mapping,
      };
      await googleCalendarIntegrationApi.saveFieldBinding(projectId, binding);
      toast.success("Field mapping saved");
    } catch {
      toast.error("Failed to save field mapping");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTableLabel = useMemo(
    () => tables.find((t) => t.slug === selectedTable)?.label ?? selectedTable,
    [tables, selectedTable],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[940px]">
        <div className="flex max-h-[85vh] flex-col">
          {/* Header */}
          <DialogHeader className="border-border-subtle space-y-1 border-b px-5 py-4 text-left">
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays size={18} className="text-[#4285f4]" />
              Map fields to Google Calendar
            </DialogTitle>
            <DialogDescription>
              Pick a table, then bind its fields to Google Calendar event
              properties.
            </DialogDescription>
          </DialogHeader>

          {/* Body — tables (left) + fields & mapping (right) */}
          <div className="flex min-h-0 flex-1">
            {/* Left — tables */}
            <div className="border-border-subtle flex w-60 shrink-0 flex-col border-r">
              <div className="border-border-subtle border-b p-2">
                <div className="bg-bg-main border-border-subtle flex items-center rounded-md border px-2">
                  <Search size={13} className="text-text-muted shrink-0" />
                  <input
                    placeholder="Search tables..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="placeholder:text-text-muted w-full bg-transparent px-2 py-1.5 text-[12px] outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {tablesLoading ? (
                  <div className="flex flex-col gap-1.5">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-7 w-full rounded-md" />
                    ))}
                  </div>
                ) : tables.length === 0 ? (
                  <div className="text-text-muted px-2 py-6 text-center text-[12px]">
                    No tables found.
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {tables.map((table: Table) => {
                      const isActive = selectedTable === table.slug;
                      const tableMapping = mappingByTable[table.slug];
                      const count = tableMapping
                        ? CALENDAR_FIELDS.filter((f) => tableMapping[f.key])
                            .length
                        : 0;
                      return (
                        <button
                          key={table.id}
                          onClick={() => {
                            setSelectedTable(table.slug);
                            setSelectedTableId(table.id);
                          }}
                          className={cn(
                            "group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
                            isActive
                              ? "bg-[#004eea]/10 font-medium text-[#004eea]"
                              : "text-text-muted hover:bg-bg-sidebar hover:text-text-main",
                          )}
                        >
                          <TableIcon
                            size={12}
                            className={cn(
                              "shrink-0",
                              isActive
                                ? "text-[#004eea]"
                                : "text-text-muted/70",
                            )}
                          />
                          <span className="truncate">
                            {table.label || table.slug}
                          </span>
                          {count > 0 && (
                            <span className="ml-auto shrink-0 rounded-full bg-green-500/15 px-1.5 text-[10px] font-semibold text-green-500">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right — fields + mapping */}
            <div className="flex min-w-0 flex-1 flex-col">
              {!selectedTable ? (
                <div className="text-text-muted flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                  <Database size={26} className="opacity-40" />
                  <p className="text-[13px]">
                    Select a table to view its fields and bind them.
                  </p>
                </div>
              ) : (
                <>
                  <div className="border-border-subtle flex items-center gap-2 border-b px-4 py-2.5">
                    <span className="text-text-main truncate text-[13px] font-semibold">
                      {selectedTableLabel}
                    </span>
                    <span className="text-text-muted shrink-0 text-[11px]">
                      {columns.length} fields
                    </span>
                    <span className="text-text-muted ml-auto shrink-0 text-[11px] font-medium">
                      {mappedCount}/{CALENDAR_FIELDS.length} calendar fields
                      mapped
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {fieldsLoading ? (
                      <div className="flex flex-col gap-2 p-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <Skeleton key={i} className="h-9 w-full rounded-md" />
                        ))}
                      </div>
                    ) : columns.length === 0 ? (
                      <div className="text-text-muted px-4 py-10 text-center text-[13px]">
                        No fields found for this table.
                      </div>
                    ) : (
                      columns.map((col) => {
                        const assigned = propertyForColumn(col.slug);
                        const label = col.label || col.slug;
                        return (
                          <div
                            key={col.id ?? col.slug}
                            className="group border-border-subtle hover:bg-hover-bg/50 flex items-center gap-3 border-b px-4 py-2 transition-colors"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <span className="text-text-main truncate text-[13px] font-medium">
                                {label}
                              </span>
                              {col.label && col.label !== col.slug && (
                                <span className="text-text-muted shrink-0 font-mono text-[11px]">
                                  {col.slug}
                                </span>
                              )}
                              <span className="shrink-0 rounded bg-blue-400/[0.08] px-1.5 py-0.5 font-mono text-[11px] text-blue-400">
                                {col.type}
                              </span>
                            </div>

                            <div className="relative w-52 shrink-0">
                              <select
                                value={assigned}
                                onChange={(e) =>
                                  assignColumn(
                                    col.slug,
                                    e.target
                                      .value as GoogleCalendarEventField | "",
                                  )
                                }
                                className={cn(
                                  "w-full appearance-none rounded border py-1.5 pr-7 pl-2.5 text-[12px] outline-none transition-colors",
                                  assigned
                                    ? "text-text-main border-green-500/40 bg-green-500/5 font-medium"
                                    : "border-border-subtle bg-bg-main text-text-muted focus:border-primary/60",
                                )}
                              >
                                <option value="">Not mapped</option>
                                {CALENDAR_FIELDS.map((f) => (
                                  <option key={f.key} value={f.key}>
                                    {f.label}
                                    {f.required ? " *" : ""}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                size={12}
                                className="text-text-muted pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {missingRequired.length > 0 && columns.length > 0 && (
                    <div className="border-border-subtle text-text-muted border-t px-4 py-2 text-[11px]">
                      Required calendar fields not yet mapped:{" "}
                      <span className="text-text-main font-medium">
                        {missingRequired.map((f) => f.label).join(", ")}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-border-subtle flex items-center justify-between gap-3 border-t px-5 py-3">
            <p className="text-text-muted hidden text-[11px] sm:block">
              Saved locally until the Google Calendar sync API is available.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={isSaving}
                disabled={!selectedTable || mappedCount === 0}
              >
                <Check size={14} />
                Save mapping
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
