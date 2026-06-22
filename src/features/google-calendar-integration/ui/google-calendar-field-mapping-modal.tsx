"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlignLeft,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  CircleDot,
  Database,
  MapPin,
  Search,
  Table as TableIcon,
  TriangleAlert,
  Type,
  type LucideIcon,
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
  googleCalendarIntegrationApi,
  type GoogleCalendarEventField,
  type GoogleCalendarFieldBinding,
} from "../api";

interface CalendarFieldDef {
  key: GoogleCalendarEventField;
  label: string;
  required: boolean;
  icon: LucideIcon;
  hint: string;
  /** Start/End read best from a date field — used for a soft type hint. */
  expectsDate?: boolean;
}

// The Google Calendar event properties, in display order. These are the fixed
// targets the user maps table fields onto; `required` marks the ones an event
// cannot exist without.
const CALENDAR_FIELDS: CalendarFieldDef[] = [
  {
    key: "summary",
    label: "Title",
    required: true,
    icon: Type,
    hint: "Short title shown on the calendar event.",
  },
  {
    key: "start",
    label: "Start",
    required: true,
    icon: CalendarClock,
    hint: "When the event begins. Choose a date / date-time field.",
    expectsDate: true,
  },
  {
    key: "end",
    label: "End",
    required: true,
    icon: CalendarCheck,
    hint: "When the event ends. Choose a date / date-time field.",
    expectsDate: true,
  },
  {
    key: "description",
    label: "Description",
    required: false,
    icon: AlignLeft,
    hint: "Longer details shown in the event body.",
  },
  {
    key: "location",
    label: "Location",
    required: false,
    icon: MapPin,
    hint: "Where the event takes place.",
  },
  {
    key: "status",
    label: "Status",
    required: false,
    icon: CircleDot,
    hint: "Event status: confirmed, tentative or cancelled.",
  },
];

// uCode field types that carry a date — used for the Start/End soft hint.
const DATE_FIELD_TYPES = new Set([
  "DATE",
  "DATE_TIME",
  "DATETIME",
  "TIME",
  "TIMESTAMP",
]);
const isDateField = (type?: string) =>
  !!type && DATE_FIELD_TYPES.has(type.toUpperCase());

// Radix Select forbids an empty-string item value, so the "clear" option uses
// this sentinel and is translated back to "" (unmapped) on change.
const NONE_VALUE = "__none__";

// Google Calendar event property → table field slug.
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
  // "field not found in table". Memoised so it stays a stable effect dep.
  const columns = useMemo(() => tableDetail?.fields ?? [], [tableDetail]);

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

  // Once the real fields load, drop any mapped slug that no longer exists on the
  // table (e.g. a stale `created_at` from an older cache) so it can't be shown
  // as a blank dropdown or re-sent to the API.
  useEffect(() => {
    if (!selectedTable || columns.length === 0) return;
    const valid = new Set(columns.map((c) => c.slug));
    setMappingByTable((prev) => {
      const current = prev[selectedTable];
      if (!current) return prev;
      let changed = false;
      const next: Mapping = {};
      for (const [key, slug] of Object.entries(current)) {
        if (slug && valid.has(slug))
          next[key as GoogleCalendarEventField] = slug;
        else changed = true;
      }
      return changed ? { ...prev, [selectedTable]: next } : prev;
    });
  }, [selectedTable, columns]);

  const mapping: Mapping =
    (selectedTable && mappingByTable[selectedTable]) || {};

  const setProperty = (key: GoogleCalendarEventField, slug: string) => {
    if (!selectedTable) return;
    setMappingByTable((prev) => {
      const current: Mapping = { ...(prev[selectedTable] ?? {}) };
      if (slug) current[key] = slug;
      else delete current[key];
      return { ...prev, [selectedTable]: current };
    });
  };

  const fieldType = (slug: string) =>
    columns.find((c) => c.slug === slug)?.type;

  const requiredFields = CALENDAR_FIELDS.filter((f) => f.required);
  const missingRequired = requiredFields.filter((f) => !mapping[f.key]);
  const requiredMapped = requiredFields.length - missingRequired.length;
  const mappedCount = CALENDAR_FIELDS.filter((f) => mapping[f.key]).length;
  const canSave = !!selectedTable && missingRequired.length === 0;

  const handleSave = async () => {
    if (!selectedTable || !canSave) return;
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
      onOpenChange(false);
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
              Pick a table, then choose which of its fields fills each Google
              Calendar event property.
            </DialogDescription>
          </DialogHeader>

          {/* Body — tables (left) + properties & mapping (right) */}
          <div className="flex min-h-0 flex-1">
            {/* Left — tables */}
            <div className="border-border-subtle flex w-60 shrink-0 flex-col border-r">
              <div className="border-border-subtle border-b p-2">
                <div className="bg-bg-main border-border-subtle focus-within:border-primary/60 flex items-center rounded-md border px-2 transition-colors">
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

            {/* Right — properties + mapping */}
            <div className="flex min-w-0 flex-1 flex-col">
              {!selectedTable ? (
                <div className="text-text-muted flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                  <Database size={26} className="opacity-40" />
                  <p className="text-[13px]">
                    Select a table on the left to map its fields to calendar
                    events.
                  </p>
                </div>
              ) : (
                <>
                  {/* Selected-table bar with required progress */}
                  <div className="border-border-subtle flex items-center gap-3 border-b px-5 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <TableIcon
                          size={13}
                          className="text-text-muted shrink-0"
                        />
                        <span className="text-text-main truncate text-[13px] font-semibold">
                          {selectedTableLabel}
                        </span>
                      </div>
                      <p className="text-text-muted mt-0.5 text-[11px]">
                        {columns.length} fields available
                      </p>
                    </div>
                    <span
                      className={cn(
                        "ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        missingRequired.length === 0
                          ? "bg-green-500/15 text-green-600 dark:text-green-400"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {requiredMapped}/{requiredFields.length} required mapped
                    </span>
                  </div>

                  {/* Guidance banner */}
                  <div className="bg-bg-sidebar/40 border-border-subtle text-text-muted border-b px-5 py-2 text-[12px]">
                    Choose which field fills each property.{" "}
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      Required
                    </span>{" "}
                    properties must be mapped before saving.
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {fieldsLoading ? (
                      <div className="flex flex-col gap-3 p-5">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <Skeleton key={i} className="h-14 w-full rounded-lg" />
                        ))}
                      </div>
                    ) : columns.length === 0 ? (
                      <div className="text-text-muted px-4 py-10 text-center text-[13px]">
                        No fields found for this table.
                      </div>
                    ) : (
                      CALENDAR_FIELDS.map((f) => {
                        const Icon = f.icon;
                        const selected = mapping[f.key] ?? "";
                        const isMissing = f.required && !selected;
                        const showDateHint =
                          !!selected &&
                          f.expectsDate &&
                          !isDateField(fieldType(selected));
                        return (
                          <div
                            key={f.key}
                            className={cn(
                              "border-border-subtle flex items-start gap-4 border-b px-5 py-3.5 transition-colors",
                              isMissing
                                ? "bg-amber-500/[0.03]"
                                : "hover:bg-hover-bg/40",
                            )}
                          >
                            {/* Property identity */}
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div
                                className={cn(
                                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                                  selected
                                    ? "border-green-500/30 bg-green-500/10 text-green-500"
                                    : isMissing
                                      ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                                      : "border-border-subtle bg-bg-sidebar text-text-muted",
                                )}
                              >
                                <Icon size={15} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-text-main text-[13px] font-semibold">
                                    {f.label}
                                  </span>
                                  {f.required ? (
                                    <span className="rounded-full bg-amber-500/15 px-1.5 py-px text-[10px] font-semibold tracking-wide text-amber-600 uppercase dark:text-amber-400">
                                      Required
                                    </span>
                                  ) : (
                                    <span className="text-text-muted/60 text-[10px] font-medium tracking-wide uppercase">
                                      Optional
                                    </span>
                                  )}
                                </div>
                                <p className="text-text-muted mt-0.5 text-[12px] leading-snug">
                                  {f.hint}
                                </p>
                              </div>
                            </div>

                            {/* Field picker */}
                            <div className="w-56 shrink-0">
                              <Select
                                value={selected || NONE_VALUE}
                                onValueChange={(v) =>
                                  setProperty(f.key, v === NONE_VALUE ? "" : v)
                                }
                              >
                                <SelectTrigger
                                  className={cn(
                                    "h-9 text-[13px]",
                                    selected
                                      ? "border-green-500/40"
                                      : isMissing
                                        ? "border-amber-500/50"
                                        : "",
                                  )}
                                >
                                  <SelectValue placeholder="Choose a field…" />
                                </SelectTrigger>
                                <SelectContent className="max-h-64">
                                  <SelectItem value={NONE_VALUE}>
                                    <span className="text-text-muted">
                                      — Not mapped —
                                    </span>
                                  </SelectItem>
                                  {columns.map((col) => (
                                    <SelectItem
                                      key={col.id ?? col.slug}
                                      value={col.slug}
                                    >
                                      <span className="flex items-center gap-2">
                                        <span className="truncate">
                                          {col.label || col.slug}
                                        </span>
                                        <span className="bg-bg-sidebar text-text-muted shrink-0 rounded px-1 py-px font-mono text-[10px]">
                                          {col.type}
                                        </span>
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {showDateHint && (
                                <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                                  <TriangleAlert size={11} className="shrink-0" />
                                  Works best with a date / date-time field
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-border-subtle flex items-center justify-between gap-3 border-t px-5 py-3">
            <p className="text-text-muted hidden text-[11px] sm:block">
              {!selectedTable
                ? "Select a table to begin mapping."
                : missingRequired.length > 0
                  ? `Map all required fields to save: ${missingRequired
                      .map((f) => f.label)
                      .join(", ")}`
                  : `All required fields mapped${
                      mappedCount > requiredFields.length
                        ? ` · ${mappedCount} fields total`
                        : ""
                    } — ready to save.`}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={isSaving}
                disabled={!canSave}
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
