"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  ChevronLeft,
  Loader2,
  PlusCircle,
  Zap,
  Trash2,
  Search,
  RefreshCw,
  ScrollText,
  Code2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { api } from "@/shared/api";
import { Button } from "@/shared/ui";
import { Input } from "@/shared/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui";
import { WorkspaceDataTable } from "./workspace-data-table";
import { ReusableTabs } from "@/shared/ui";
import { DataLoadingState } from "@/shared/ui";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { cn } from "@/shared/lib/utils/cn";
import { GitlabCodeEditor } from "./gitlab-code-view";
import { PipelineStatus } from "./pipeline-status";
import { useTables, type Table } from "@/entities/database";
import { useTranslations } from 'next-intl'

interface CustomEvent {
  id?: string;
  table_slug?: string;
  action_type?: string;
  method?: string;
  event_path?: string;
  disabled?: boolean;
}

interface FunctionItem {
  id: string;
  name: string;
  description: string;
  type: string; // e.g. "WORKFLOW"
  max_scale: number; // replica count
  status?: string;
  path?: string;
  branch?: string;
  resource_id?: string;
  project_id?: string;
  environment_id?: string;
  url?: string;
  is_public?: boolean;
  repo_id?: string;
  custom_events?: CustomEvent[];
}

interface FunctionPageProps {
  projectId: string;
  onEditCode?: (fn: FunctionItem) => void;
}

type View = "list" | "create" | "detail";
type FunctionTiming = "default" | "before" | "after";
type FunctionMethod =
  | "GETLIST"
  | "UPDATE"
  | "CREATE"
  | "DELETE"
  | "EXCEL_IMPORT"
  | "MULTIPLE_UPDATE";

type FunctionTriggerConfig = {
  timing: FunctionTiming;
  tableSlug?: string;
  method?: FunctionMethod;
  automationId?: string;
};

const methodOptions: FunctionMethod[] = [
  "GETLIST",
  "UPDATE",
  "CREATE",
  "DELETE",
  "EXCEL_IMPORT",
  "MULTIPLE_UPDATE",
];

const DEFAULT_METHOD: FunctionMethod = "UPDATE";

const timeData = [
  { label: "5 minutes", value: 300000 },
  { label: "15 minutes", value: 900000 },
  { label: "30 minutes", value: 1800000 },
  { label: "1 hour", value: 3600000 },
  { label: "6 hours", value: 21600000 },
  { label: "12 hours", value: 43200000 },
];

const timingOptions: { label: string; value: FunctionTiming }[] = [
  { label: "Default", value: "default" },
  { label: "Before", value: "before" },
  { label: "After", value: "after" },
];

export const FunctionsPage = ({ projectId, onEditCode }: FunctionPageProps) => {
  const t = useTranslations('widgets.projectWorkspace')
  const [view, setView] = useState<View>("list");
  const [selectedFn, setSelectedFn] = useState<FunctionItem | null>(null);
  const [detailTab, setDetailTab] = useState<"details" | "logs">("details");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [fnToDelete, setFnToDelete] = useState<FunctionItem | null>(null);
  const [timeFrame, setTimeFrame] = useState(3600000);
  const [lastPublish, setLastPublish] = useState(0);
  const [triggerConfigs, setTriggerConfigs] = useState<
    Record<string, FunctionTriggerConfig>
  >({});

  const debouncedSearch = useDebounce(search, 400);
  const queryClient = useQueryClient();

  // API Functions
  const fetchFunctions = async (
    projectId: string,
    search: string,
    limit: number,
    pageNum: number,
  ) => {
    const offset = (pageNum - 1) * limit;
    const { data } = await api.get("/v1/function", {
      params: {
        search,
        limit,
        offset,
        "project-id": projectId,
        include_custom_events: true,
      },
    });
    return {
      functions: (data.data?.functions ?? []) as FunctionItem[],
      total: data.data?.count ?? 0,
    };
  };

  const fetchFunctionDetail = async (id: string, projectId: string) => {
    const { data } = await api.get(`/v2/function/${id}`, {
      params: { "project-id": projectId },
    });
    return data.data as FunctionItem;
  };

  const fetchGitResources = async (projectId: string) => {
    const { data } = await api.get("/v2/company/project/resource", {
      params: { type: "GIT", "project-id": projectId },
    });
    const resources = data.data?.resources ?? [];
    return resources.map((item: any) => ({
      label: item.name ?? item.id,
      value: item.id,
    }));
  };

  // Queries
  const { data: functionsData, isLoading: isListLoading } = useQuery({
    queryKey: ["functions", projectId, debouncedSearch, page],
    queryFn: () => fetchFunctions(projectId, debouncedSearch, pageSize, page),
    enabled: !!projectId,
    refetchOnMount: "always",
    staleTime: 0,
  });

  console.log({ functionsData });

  useEffect(() => {
    const fns = functionsData?.functions ?? [];
    if (fns.length === 0) return;

    setTriggerConfigs((prev) => {
      const next = { ...prev };
      for (const fn of fns) {
        const event = fn.custom_events?.[0];
        if (!event) continue;
        const timing = (
          event.action_type === "before" || event.action_type === "after"
            ? event.action_type
            : "default"
        ) as FunctionTiming;
        next[fn.id] = {
          timing,
          tableSlug: event.table_slug,
          method: (event.method as FunctionMethod) ?? DEFAULT_METHOD,
          automationId: event.id,
        };
      }
      return next;
    });
  }, [functionsData]);

  const { data: fnDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["function-detail", selectedFn?.id],
    queryFn: () => fetchFunctionDetail(selectedFn!.id, projectId),
    enabled: view === "detail" && !!selectedFn?.id,
  });

  const { data: gitResources = [], isLoading: isResourcesLoading } = useQuery({
    queryKey: ["git-resources", projectId],
    queryFn: () => fetchGitResources(projectId),
    enabled: view === "create",
  });

  const { data: tables = [], isLoading: isTablesLoading } = useTables(
    "",
    200,
    0,
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      description: string;
      type: string;
      max_scale: number;
      resource_id: string;
      path: string;
    }) =>
      api.post("/v2/function", payload, {
        params: { "project-id": projectId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["functions", projectId] });
      setView("list");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v2/function/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["functions", projectId] });
      setFnToDelete(null);
    },
  });

  const fetchLogsMutation = useMutation({
    mutationFn: (payload: {
      From: string;
      To: string;
      Namespace: string;
      Function: string;
    }) =>
      api
        .post("/v2/grafana/loki", payload, {
          params: { "project-id": projectId },
        })
        .then((r) => (Array.isArray(r.data.data) ? r.data.data : [])),
  });

  const createAutomationMutation = useMutation({
    mutationFn: async ({
      tableSlug,
      body,
    }: {
      tableSlug: string;
      body: Record<string, unknown>;
    }) => {
      const { data } = await api.post(
        `/v2/collections/${tableSlug}/automation`,
        body,
      );
      return data?.data ?? data;
    },
  });

  const updateAutomationMutation = useMutation({
    mutationFn: async ({
      tableSlug,
      body,
    }: {
      tableSlug: string;
      body: Record<string, unknown>;
    }) => {
      const { data } = await api.put(
        `/v2/collections/${tableSlug}/automation`,
        body,
      );
      return data?.data ?? data;
    },
  });

  // Handlers
  const handleShowLogs = () => {
    const now = Date.now();
    fetchLogsMutation.mutate({
      From: String(now - timeFrame),
      To: String(now),
      Namespace: "",
      Function: selectedFn?.name || "",
    });
  };

  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    type: "KNATIVE",
    max_scale: 1,
    resource_id: "",
    path: "",
  });

  const hasTriggerColumns = Object.values(triggerConfigs).some(
    (config) => config.timing === "before" || config.timing === "after",
  );

  const getTriggerConfig = useCallback(
    (functionId: string): FunctionTriggerConfig =>
      triggerConfigs[functionId] ?? { timing: "default" },
    [triggerConfigs],
  );

  const buildAutomationBody = useCallback(
    (
      fn: FunctionItem,
      config: FunctionTriggerConfig,
      includeId: boolean,
    ): Record<string, unknown> => {
      const base: Record<string, unknown> = {
        table_slug: config.tableSlug,
        event_path: fn.id,
        action_type: config.timing,
        method: config.method ?? DEFAULT_METHOD,
        attributes: { use_no_limit: false, additional_parameters: [] },
        disabled: false,
      };

      if (includeId && config.automationId) {
        return {
          ...base,
          id: config.automationId,
          functions: [
            {
              id: fn.id,
              path: fn.path,
              name: fn.name,
              project_id: fn.project_id ?? projectId,
              type: fn.type,
              request_type: "ASYNC",
            },
          ],
        };
      }

      return base;
    },
    [projectId],
  );

  const updateAutomation = useCallback(
    (fn: FunctionItem, config: FunctionTriggerConfig) => {
      if (!config.automationId || !config.tableSlug) return;
      updateAutomationMutation.mutate({
        tableSlug: config.tableSlug,
        body: buildAutomationBody(fn, config, true),
      });
    },
    [buildAutomationBody, updateAutomationMutation],
  );

  const createAutomation = useCallback(
    (fn: FunctionItem, config: FunctionTriggerConfig) => {
      if (!config.tableSlug) return;
      createAutomationMutation.mutate(
        {
          tableSlug: config.tableSlug,
          body: buildAutomationBody(fn, config, false),
        },
        {
          onSuccess: (data: any) => {
            const newId =
              data?.id ??
              data?.automation?.id ??
              data?.data?.id ??
              data?.response?.id;
            if (!newId) return;
            setTriggerConfigs((prev) => ({
              ...prev,
              [fn.id]: { ...prev[fn.id], automationId: newId },
            }));
          },
        },
      );
    },
    [buildAutomationBody, createAutomationMutation],
  );

  const handleTimingChange = useCallback(
    (fn: FunctionItem, timing: FunctionTiming) => {
      const current = triggerConfigs[fn.id] ?? { timing: "default" };
      const next: FunctionTriggerConfig = { ...current, timing };

      setTriggerConfigs((prev) => ({ ...prev, [fn.id]: next }));

      if (next.tableSlug) {
        if (current.automationId) {
          updateAutomation(fn, next);
        } else {
          createAutomation(fn, next);
        }
      }
    },
    [createAutomation, triggerConfigs, updateAutomation],
  );

  const handleTableChange = useCallback(
    (fn: FunctionItem, tableSlug: string) => {
      const current = triggerConfigs[fn.id] ?? {
        timing: "before" as FunctionTiming,
      };
      const next: FunctionTriggerConfig = {
        timing: current.timing === "default" ? "before" : current.timing,
        tableSlug,
        method: current.method ?? DEFAULT_METHOD,
        automationId: current.automationId,
      };

      setTriggerConfigs((prev) => ({ ...prev, [fn.id]: next }));

      if (current.automationId) {
        updateAutomation(fn, next);
      } else {
        createAutomation(fn, next);
      }
    },
    [createAutomation, triggerConfigs, updateAutomation],
  );

  const handleMethodChange = useCallback(
    (fn: FunctionItem, method: FunctionMethod) => {
      const current = triggerConfigs[fn.id] ?? { timing: "default" };
      const next: FunctionTriggerConfig = { ...current, method };

      setTriggerConfigs((prev) => ({ ...prev, [fn.id]: next }));

      if (next.tableSlug) {
        if (current.automationId) {
          updateAutomation(fn, next);
        } else {
          createAutomation(fn, next);
        }
      }
    },
    [createAutomation, triggerConfigs, updateAutomation],
  );

  // DataTable Columns
  const columns: ColumnDef<FunctionItem>[] = useMemo(() => {
    const baseColumns: ColumnDef<FunctionItem>[] = [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="text-text-main font-bold whitespace-nowrap">
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const isActive =
            row.original.status === "ACTIVE" || !row.original.status;
          return (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold uppercase",
                isActive
                  ? "bg-green-500/10 text-green-600"
                  : "bg-text-muted/10 text-text-muted",
              )}
            >
              {row.original.status || "ACTIVE"}
            </span>
          );
        },
      },
      {
        accessorKey: "path",
        header: "Path",
        cell: ({ row }) => (
          <span className="text-text-muted font-mono text-xs whitespace-nowrap">
            {row.original.path ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-bold uppercase">
            {row.original.type}
          </span>
        ),
      },
      {
        accessorKey: "max_scale",
        header: "Replica Count",
        cell: ({ row }) => (
          <div className="text-center">{row.original.max_scale}</div>
        ),
      },
      {
        id: "timing",
        header: "Timing",
        cell: ({ row }) => {
          const activeTiming = getTriggerConfig(row.original.id).timing;

          return (
            <div
              className="border-border-subtle bg-bg-sidebar inline-flex h-8 overflow-hidden rounded-lg border p-1"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {timingOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTimingChange(row.original, option.value)}
                  className={cn(
                    "h-6 min-w-[58px] rounded-md px-2 text-[11px] font-semibold transition-colors",
                    activeTiming === option.value
                      ? "bg-bg-card text-primary shadow-sm"
                      : "text-text-muted hover:text-text-main",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          );
        },
      },
    ];

    if (hasTriggerColumns) {
      baseColumns.push({
        id: "method",
        header: "Method",
        cell: ({ row }) => {
          const config = getTriggerConfig(row.original.id);
          const needsTrigger =
            config.timing === "before" || config.timing === "after";

          if (!needsTrigger) {
            return <span className="text-text-muted">—</span>;
          }

          return (
            <div
              className="min-w-40"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Select
                value={config.method ?? DEFAULT_METHOD}
                onValueChange={(value) =>
                  handleMethodChange(row.original, value as FunctionMethod)
                }
              >
                <SelectTrigger className="bg-bg-sidebar border-border-subtle h-8 w-40 text-xs">
                  <SelectValue placeholder={t('selectMethod')} />
                </SelectTrigger>
                <SelectContent
                  className="max-h-[260px]"
                  position="popper"
                  side="bottom"
                  sideOffset={4}
                  avoidCollisions
                >
                  {methodOptions.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        },
      });

      baseColumns.push({
        id: "table",
        header: "Tables",
        cell: ({ row }) => {
          const config = getTriggerConfig(row.original.id);
          const needsTable =
            config.timing === "before" || config.timing === "after";

          if (!needsTable) {
            return <span className="text-text-muted">—</span>;
          }

          return (
            <div
              className="min-w-[180px]"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Select
                value={config.tableSlug}
                onValueChange={(value) =>
                  handleTableChange(row.original, value)
                }
                disabled={isTablesLoading || tables.length === 0}
              >
                <SelectTrigger className="bg-bg-sidebar border-border-subtle h-8 w-[180px] text-xs">
                  <SelectValue
                    placeholder={
                      isTablesLoading ? "Loading..." : "Select table"
                    }
                  />
                </SelectTrigger>
                <SelectContent
                  className="max-h-[260px]"
                  position="popper"
                  side="bottom"
                  sideOffset={4}
                  avoidCollisions
                >
                  {tables.length === 0 ? (
                    <SelectItem value="__no_tables__" disabled>
                      {t('noTablesFoundShort')}
                    </SelectItem>
                  ) : (
                    tables.map((table: Table) => (
                      <SelectItem
                        key={table.id ?? table.slug}
                        value={table.slug}
                      >
                        {table.label || table.slug}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          );
        },
      });
    }

    baseColumns.push({
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {onEditCode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEditCode(row.original);
              }}
              className="text-primary hover:bg-primary/10 h-7 gap-1 rounded-lg px-2 text-[11px] font-semibold"
            >
              <Code2 size={13} />
              {t('editWithAi')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setFnToDelete(row.original);
            }}
            className="text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    });

    return baseColumns;
  }, [
    getTriggerConfig,
    handleMethodChange,
    handleTableChange,
    handleTimingChange,
    hasTriggerColumns,
    isTablesLoading,
    onEditCode,
    tables,
  ]);

  if (view === "list") {
    return (
      <div className="animate-in fade-in w-full min-w-0 space-y-6 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-text-main text-2xl font-bold tracking-tight">
              {t('functions')}
            </h1>
            <p className="text-text-muted mt-1 text-sm">
              {t('functionsSubtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <input
                placeholder={t('searchFunctions')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-bg-sidebar border-border-subtle text-text-main placeholder:text-text-muted focus:border-primary/50 focus:ring-primary/20 h-8 w-[280px] rounded-lg border pr-4 pl-9 text-sm transition-all outline-none focus:ring-1"
              />
            </div>
            <Button
              onClick={() => setView("create")}
              className="bg-primary hover:bg-primary/90 h-8 rounded-lg px-3 text-[13px] font-medium text-white"
            >
              <PlusCircle size={14} className="mr-1.5" />
              {t('addFunction')}
            </Button>
          </div>
        </div>

        {isListLoading ? (
          <DataLoadingState message="Connecting to functions library..." />
        ) : functionsData?.functions.length === 0 ? (
          <div className="bg-bg-card border-border-subtle flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
            <div className="bg-primary/5 mb-4 rounded-full p-4">
              <Zap size={32} className="text-primary/40" />
            </div>
            <p className="text-text-main font-medium">{t('noFunctions')}</p>
            <p className="text-text-muted mt-1 text-sm">
              {t('createFirstFunction')}
            </p>
          </div>
        ) : (
          <WorkspaceDataTable
            columns={columns}
            data={(functionsData?.functions ?? []).filter(
              (fn) => fn.id !== "b90d8ad8-553a-4494-8031-660b85a79b45",
            )}
            tableClassName="min-w-max"
            totalCount={functionsData?.total}
            page={page}
            onPageChange={setPage}
            limit={pageSize}
            onRowClick={(row) => {
              setSelectedFn(row);
              setDetailTab("details");
              setView("detail");
            }}
          />
        )}

        <Dialog
          open={!!fnToDelete}
          onOpenChange={(open) => !open && setFnToDelete(null)}
        >
          <DialogContent className="max-w-[400px]">
            <DialogHeader>
              <DialogTitle>{t('deleteFunction')}</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="text-text-main font-semibold">
                  {fnToDelete?.name}
                </span>
                ? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 gap-2">
              <Button
                variant="ghost"
                onClick={() => setFnToDelete(null)}
                disabled={deleteMutation.isPending}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(fnToDelete!.id)}
                className="rounded-xl px-6"
              >
                {deleteMutation.isPending && (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                )}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (view === "create") {
    return (
      <div className="animate-in fade-in slide-in-from-right-4 space-y-6 duration-300">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView("list")}
            className="h-8 w-8 rounded-lg"
          >
            <ChevronLeft size={16} />
          </Button>
          <h1 className="text-text-main text-xl leading-tight font-bold">
            {t('newFunction')}
          </h1>
        </div>

        <div className="bg-bg-card border-border-subtle max-w-lg rounded-2xl border p-6 shadow-sm">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-text-main text-sm font-medium">{t('name')}</label>
              <Input
                placeholder={t('functionName')}
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, name: e.target.value }))
                }
                className="bg-bg-sidebar border-border-subtle"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-text-main text-sm font-medium">
                {t('descriptionLabel')}
              </label>
              <Input
                placeholder={t('shortDescription')}
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, description: e.target.value }))
                }
                className="bg-bg-sidebar border-border-subtle"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-text-main text-sm font-medium">{t('path')}</label>
              <Input
                placeholder="e.g. my-function-path"
                value={createForm.path}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, path: e.target.value }))
                }
                className="bg-bg-sidebar border-border-subtle font-mono"
              />
            </div>

            <div className="border-border-subtle/50 flex justify-end gap-3 border-t pt-4">
              <Button
                variant="ghost"
                onClick={() => setView("list")}
                className="rounded-xl px-4"
              >
                {t('cancel')}
              </Button>
              <Button
                disabled={!createForm.name || createMutation.isPending}
                onClick={() => {
                  const formData = {
                    ...createForm,
                    type: "KNATIVE",
                    max_scale: 1,
                    resource_id: "ucode_gitlab",
                  };
                  createMutation.mutate(formData);
                }}
                className="bg-primary hover:bg-primary/90 rounded-xl px-8 text-white shadow-sm"
              >
                {createMutation.isPending && (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                )}
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "detail" && selectedFn) {
    const detail = fnDetail || selectedFn;
    const logsList = fetchLogsMutation.data || [];

    return (
      <div className="animate-in fade-in slide-in-from-right-4 space-y-6 duration-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView("list")}
              className="h-8 w-8 rounded-lg"
            >
              <ChevronLeft size={16} />
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-text-main text-xl leading-tight font-bold">
                {selectedFn.name}
              </h1>
              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-bold uppercase">
                {selectedFn.type}
              </span>
            </div>
          </div>
          <ReusableTabs
            options={[
              { id: "details", label: "Details" },
              { id: "logs", label: "Logs" },
              { id: "code", label: "Code" },
            ]}
            activeId={detailTab}
            onTabChange={(id) => setDetailTab(id as any)}
            className="max-w-fit"
          />
        </div>

        {detailTab === "details" ? (
          <div className="bg-bg-card border-border-subtle max-w-lg rounded-2xl border p-6 shadow-sm">
            <div className="space-y-5">
              {[
                { label: "Name", value: detail.name },
                { label: "Function Type", value: detail.type },
                {
                  label: "Link / Path",
                  value: detail.path ?? "—",
                  font: "font-mono",
                },
                { label: "Replica Count", value: detail.max_scale },
                { label: "Description", value: detail.description },
              ].map((field, idx) => (
                <div key={idx} className="space-y-1.5">
                  <label className="text-text-muted text-[11px] font-bold tracking-wider uppercase">
                    {field.label}
                  </label>
                  <div
                    className={cn(
                      "bg-bg-sidebar border-border-subtle text-text-main rounded-xl border px-4 py-2.5 text-sm",
                      field.font,
                    )}
                  >
                    {field.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : detailTab === "logs" ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-bg-sidebar border-border-subtle text-text-muted rounded-xl border px-3 py-2 font-mono text-sm whitespace-nowrap">
                namespace
              </div>
              <div className="bg-bg-sidebar border-border-subtle text-text-muted rounded-xl border px-3 py-2 font-mono text-sm whitespace-nowrap">
                {selectedFn.type?.toLowerCase() ?? "function"}
              </div>
              <div className="bg-bg-sidebar border-border-subtle text-text-muted rounded-xl border px-3 py-2 font-mono text-sm whitespace-nowrap">
                app
              </div>
              <div className="bg-bg-sidebar border-border-subtle text-text-muted max-w-[200px] truncate rounded-xl border px-3 py-2 font-mono text-sm">
                {selectedFn.path ?? selectedFn.name}
              </div>

              <div className="min-w-[200px] flex-1">
                <Select
                  value={String(timeFrame)}
                  onValueChange={(v) => setTimeFrame(Number(v))}
                >
                  <SelectTrigger className="bg-bg-sidebar border-border-subtle h-10">
                    <SelectValue placeholder={t('selectTimeFrame')} />
                  </SelectTrigger>
                  <SelectContent>
                    {timeData.map((t) => (
                      <SelectItem key={t.value} value={String(t.value)}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleShowLogs}
                disabled={fetchLogsMutation.isPending}
                className="bg-primary hover:bg-primary/90 rounded-xl px-5 text-white shadow-sm"
              >
                {fetchLogsMutation.isPending ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <RefreshCw size={16} className="mr-2" />
                )}
                Show Logs
              </Button>
            </div>

            <div className="bg-bg-card border-border-subtle overflow-hidden rounded-2xl border shadow-sm">
              <div className="bg-bg-sidebar/50 border-border-subtle flex items-center gap-2 border-b p-4">
                <ScrollText size={14} className="text-text-muted" />
                <span className="text-text-muted text-[11px] font-bold tracking-wider uppercase">
                  {t('logStream')}
                </span>
              </div>
              <div className="scrollbar-thumb-border-subtle max-h-[600px] scrollbar-thin scrollbar-track-transparent overflow-y-auto p-4">
                {fetchLogsMutation.isPending ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-20">
                    <Loader2
                      size={32}
                      className="text-primary/40 animate-spin"
                    />
                    <p className="text-text-muted animate-pulse text-sm font-medium">
                      {t('streamingLogs')}
                    </p>
                  </div>
                ) : logsList.length > 0 ? (
                  <div className="space-y-2">
                    {logsList.map((log: any, index: number) => {
                      const raw =
                        typeof log === "string" ? log : JSON.stringify(log);
                      const isJson =
                        raw.trim().startsWith("{") ||
                        raw.trim().startsWith("[");
                      let formatted = raw;
                      if (isJson) {
                        try {
                          formatted = JSON.stringify(JSON.parse(raw), null, 2);
                        } catch {}
                      }
                      return (
                        <div
                          key={index}
                          className={cn(
                            "border-border-subtle text-text-main rounded-xl border px-4 py-3 font-mono text-[13px]",
                            index % 2 === 0 ? "bg-bg-card" : "bg-bg-sidebar",
                          )}
                        >
                          {isJson ? (
                            <pre className="break-words whitespace-pre-wrap">
                              {formatted}
                            </pre>
                          ) : (
                            <span>{raw}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <ScrollText
                      size={36}
                      className="text-text-muted/30 mb-3"
                      strokeWidth={1.5}
                    />
                    <p className="text-text-main text-sm font-medium">
                      {t('noLogs')}
                    </p>
                    <p className="text-text-muted mt-1 text-xs opacity-80">
                      Select a time range and click "Show Logs" to retrieve
                      activity.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3"></div>

            <div className="bg-bg-card border-border-subtle overflow-hidden rounded-2xl border shadow-sm">
              <div className="bg-bg-sidebar/50 border-border-subtle flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                  <ScrollText size={14} className="text-text-muted" />
                  <span className="text-text-muted text-[11px] font-bold tracking-wider uppercase">
                    {t('code')}
                  </span>
                </div>
                <PipelineStatus
                  repoId={selectedFn.repo_id}
                  branch={selectedFn.branch || "master"}
                  lastPublish={lastPublish}
                />
              </div>
              <GitlabCodeEditor
                path={selectedFn.path!}
                branch={selectedFn.branch || "master"}
                name={selectedFn.name}
                type={selectedFn.type}
                repoId={selectedFn.repo_id}
                onPublish={() => {
                  setLastPublish(Date.now());
                  queryClient.invalidateQueries({
                    queryKey: ["gitlab-pipeline"],
                  });
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};
