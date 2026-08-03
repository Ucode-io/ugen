"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  FileQuestion,
  Link2,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Table as TableIcon,
  Trash2,
  Unplug,
} from "lucide-react";
import { useTables, useTableDetail } from "@/entities/database";
import type { Table as DatabaseTable } from "@/entities/database";
import { useAuthStore } from "@/entities/session";
import {
  Button,
  Checkbox,
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
  metaAdsIntegrationApi,
  type MetaAdsIntegration,
  type MetaAdsIntegrationFormMapping,
  type MetaAdsLeadForm,
} from "../api";

const NONE_VALUE = "__none__";

interface MetaAdsLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: () => void;
  isConnecting: boolean;
  projectId: string;
}

interface FormDraft {
  formId: string;
  formName: string;
  tableSlug: string;
  fields: Record<string, string>;
  required: Record<string, boolean>;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  const data = (error as any)?.response?.data?.data;
  return typeof data === "string" && data ? data : fallback;
};

const formatDateTime = (value?: string) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatExpiry = (expiresAt?: number) => {
  if (!expiresAt) return "No expiry reported";
  return new Date(expiresAt * 1000).toLocaleDateString();
};

const savedFormsToDrafts = (
  forms: MetaAdsIntegrationFormMapping[] = [],
): Record<string, FormDraft> => {
  const drafts: Record<string, FormDraft> = {};
  forms.forEach((form) => {
    drafts[form.form_id] = {
      formId: form.form_id,
      formName: form.form_name || form.form_id,
      tableSlug: form.table_slug || "",
      fields: Object.fromEntries(
        (form.fields || []).map((field) => [
          field.lead_field,
          field.table_field,
        ]),
      ),
      required: Object.fromEntries(
        (form.fields || []).map((field) => [
          field.lead_field,
          field.required === true,
        ]),
      ),
    };
  });
  return drafts;
};

const draftsToPayloadForms = (drafts: Record<string, FormDraft>) =>
  Object.values(drafts)
    .map((draft) => ({
      form_id: draft.formId,
      form_name: draft.formName,
      table_slug: draft.tableSlug,
      fields: Object.entries(draft.fields)
        .filter(([, tableField]) => !!tableField)
        .map(([leadField, tableField]) => ({
          lead_field: leadField,
          table_field: tableField,
          required: draft.required[leadField] === true,
        })),
    }))
    .filter((form) => form.table_slug && form.fields.length > 0);

export const MetaAdsLeadsModal = ({
  open,
  onOpenChange,
  onConnect,
  isConnecting,
  projectId,
}: MetaAdsLeadsModalProps) => {
  const queryClient = useQueryClient();
  const tableProjectId =
    useAuthStore((state) => state.ucodeProjectId) || projectId;

  const [selectedPageId, setSelectedPageId] = useState("");
  const [mappingPage, setMappingPage] = useState<MetaAdsIntegration | null>(
    null,
  );
  const [selectedFormId, setSelectedFormId] = useState("");
  const [formDrafts, setFormDrafts] = useState<Record<string, FormDraft>>({});
  const [pendingTableSlug, setPendingTableSlug] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [debouncedTableSearch, setDebouncedTableSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedTableSearch(tableSearch), 250);
    return () => clearTimeout(timeout);
  }, [tableSearch]);

  const {
    data: status,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ["meta-ads-status", projectId],
    queryFn: () => metaAdsIntegrationApi.getStatus(),
    enabled: open,
    retry: false,
    staleTime: 0,
  });

  const isMetaReady = status?.connected === true && status?.active === true;

  const {
    data: integrationData,
    isLoading: integrationsLoading,
    refetch: refetchIntegration,
  } = useQuery({
    queryKey: ["meta-ads-integration", projectId],
    queryFn: () => metaAdsIntegrationApi.getIntegration(),
    enabled: open && status?.connected === true,
    retry: false,
    staleTime: 0,
  });

  const integrations = useMemo(
    () => integrationData?.integrations ?? [],
    [integrationData],
  );

  const {
    data: pages = [],
    isLoading: pagesLoading,
    refetch: refetchPages,
  } = useQuery({
    queryKey: ["meta-ads-pages", projectId],
    queryFn: () => metaAdsIntegrationApi.getPages(),
    enabled: open && isMetaReady,
    retry: false,
  });

  const subscribedPageIds = useMemo(
    () => new Set(integrations.map((item) => item.page_id)),
    [integrations],
  );

  const availablePages = useMemo(
    () => pages.filter((page) => !subscribedPageIds.has(page.id)),
    [pages, subscribedPageIds],
  );

  useEffect(() => {
    if (!selectedPageId) return;
    if (!availablePages.some((page) => page.id === selectedPageId)) {
      setSelectedPageId("");
    }
  }, [availablePages, selectedPageId]);

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const page = pages.find((item) => item.id === selectedPageId);
      if (!page) throw new Error("Select a Meta page first");
      return metaAdsIntegrationApi.subscribePage({
        page_id: page.id,
        page_name: page.name,
      });
    },
    onSuccess: async () => {
      setSelectedPageId("");
      await Promise.all([
        refetchIntegration(),
        refetchPages(),
        refetchStatus(),
        queryClient.invalidateQueries({ queryKey: ["resources-v2", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["resources-v1", projectId] }),
        queryClient.invalidateQueries({
          queryKey: ["resources-clickhouse", projectId],
        }),
      ]);
      toast.success("Meta page subscribed");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to subscribe Meta page"));
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (resourceId: string) =>
      metaAdsIntegrationApi.disconnect(resourceId),
    onSuccess: async () => {
      setMappingPage(null);
      await Promise.all([
        refetchIntegration(),
        refetchPages(),
        refetchStatus(),
        queryClient.invalidateQueries({ queryKey: ["resources-v2", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["resources-v1", projectId] }),
        queryClient.invalidateQueries({
          queryKey: ["resources-clickhouse", projectId],
        }),
      ]);
      toast.success("Meta page disconnected");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to disconnect Meta page"));
    },
  });

  const { data: pageForms = [], isLoading: formsLoading } = useQuery({
    queryKey: ["meta-ads-page-forms", projectId, mappingPage?.page_id],
    queryFn: () => metaAdsIntegrationApi.getPageForms(mappingPage!.page_id),
    enabled: open && !!mappingPage?.page_id,
    retry: false,
  });

  useEffect(() => {
    if (!mappingPage) {
      setSelectedFormId("");
      setFormDrafts({});
      setPendingTableSlug("");
      return;
    }
    const drafts = savedFormsToDrafts(mappingPage.forms);
    setFormDrafts(drafts);
    setPendingTableSlug(
      Object.values(drafts).find((draft) => draft.tableSlug)?.tableSlug ?? "",
    );
    setSelectedFormId(Object.keys(drafts)[0] ?? "");
  }, [mappingPage]);

  useEffect(() => {
    if (!mappingPage || pageForms.length === 0) return;
    if (
      !selectedFormId ||
      !pageForms.some((form) => form.id === selectedFormId)
    ) {
      setSelectedFormId(pageForms[0].id);
    }
  }, [mappingPage, pageForms, selectedFormId]);

  const selectedForm = useMemo<MetaAdsLeadForm | undefined>(
    () => pageForms.find((form) => form.id === selectedFormId),
    [pageForms, selectedFormId],
  );

  useEffect(() => {
    if (!selectedFormId || !selectedForm) return;
    setFormDrafts((prev) => {
      if (prev[selectedFormId]) return prev;
      return {
        ...prev,
        [selectedFormId]: {
          formId: selectedFormId,
          formName: selectedForm.name,
          tableSlug: pendingTableSlug,
          fields: {},
          required: {},
        },
      };
    });
  }, [pendingTableSlug, selectedForm, selectedFormId]);

  const selectedDraft = selectedFormId ? formDrafts[selectedFormId] : undefined;

  const { data: questionData, isLoading: questionsLoading } = useQuery({
    queryKey: [
      "meta-ads-form-questions",
      projectId,
      mappingPage?.page_id,
      selectedFormId,
    ],
    queryFn: () =>
      metaAdsIntegrationApi.getFormQuestions(
        mappingPage!.page_id,
        selectedFormId,
      ),
    enabled: open && !!mappingPage?.page_id && !!selectedFormId,
    retry: false,
  });

  const questions = questionData?.questions ?? [];

  const { data: tables = [], isLoading: tablesLoading } = useTables(
    debouncedTableSearch,
    200,
    0,
  );

  const selectedTableSlug = selectedDraft?.tableSlug || pendingTableSlug;
  const { data: tableDetail, isLoading: tableFieldsLoading } = useTableDetail(
    selectedTableSlug || null,
    tableProjectId,
  );
  const columns = tableDetail?.fields ?? [];

  const selectedTableLabel = useMemo(
    () =>
      tables.find((table) => table.slug === selectedTableSlug)?.label ||
      selectedTableSlug,
    [tables, selectedTableSlug],
  );

  const updateSelectedDraft = (updater: (draft: FormDraft) => FormDraft) => {
    if (!selectedFormId || !selectedDraft) return;
    setFormDrafts((prev) => {
      const current = prev[selectedFormId];
      if (!current) return prev;
      return {
        ...prev,
        [selectedFormId]: updater(current),
      };
    });
  };

  const setDraftTable = (tableSlug: string) => {
    setPendingTableSlug(tableSlug);

    if (!selectedFormId) return;
    setFormDrafts((prev) => {
      const current = prev[selectedFormId] ?? {
        formId: selectedFormId,
        formName: selectedForm?.name || selectedFormId,
        tableSlug: "",
        fields: {},
        required: {},
      };

      return {
        ...prev,
        [selectedFormId]: {
          ...current,
          tableSlug,
        },
      };
    });
  };

  const setDraftField = (leadField: string, tableField: string) => {
    updateSelectedDraft((draft) => {
      const fields = { ...draft.fields };
      if (tableField) fields[leadField] = tableField;
      else delete fields[leadField];
      return { ...draft, fields };
    });
  };

  const setDraftRequired = (leadField: string, required: boolean) => {
    updateSelectedDraft((draft) => ({
      ...draft,
      required: { ...draft.required, [leadField]: required },
    }));
  };

  const currentMappedCount = questions.filter(
    (question) => !!selectedDraft?.fields[question.key],
  ).length;
  const payloadForms = draftsToPayloadForms(formDrafts);
  const canSaveMapping =
    !!mappingPage &&
    !!selectedDraft?.tableSlug &&
    currentMappedCount > 0 &&
    payloadForms.length > 0;

  const saveMappingMutation = useMutation({
    mutationFn: () => {
      if (!mappingPage) throw new Error("Select a Meta page first");
      return metaAdsIntegrationApi.saveMapping({
        page_id: mappingPage.page_id,
        forms: payloadForms,
      });
    },
    onSuccess: async () => {
      await refetchIntegration();
      queryClient.invalidateQueries({
        queryKey: ["meta-ads-integration", projectId],
      });
      toast.success("Meta lead mapping saved");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to save Meta lead mapping"));
    },
  });

  const expiresSoon =
    status?.active &&
    !!status.expires_at &&
    status.expires_at * 1000 - Date.now() < 7 * 24 * 60 * 60 * 1000;

  const renderTableRow = (table: DatabaseTable) => {
    const active = table.slug === selectedTableSlug;
    return (
      <button
        key={table.id}
        type="button"
        onClick={() => setDraftTable(table.slug)}
        className={cn(
          "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
          active
            ? "bg-[#1877f2]/10 font-medium text-[#1877f2]"
            : "text-text-muted hover:bg-bg-sidebar hover:text-text-main",
        )}
      >
        <TableIcon size={12} className="shrink-0" />
        <span className="truncate">{table.label || table.slug}</span>
        {active && <Check size={12} className="ml-auto shrink-0" />}
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[1040px]">
        <div className="flex max-h-[86vh] flex-col">
          <DialogHeader className="border-border-subtle space-y-1 border-b px-5 py-4 text-left">
            <DialogTitle className="flex items-center gap-2">
              <Image src="/meta.svg" alt="" width={20} height={20} />
              Meta Lead Ads
            </DialogTitle>
            <DialogDescription>
              Subscribe Facebook pages and map lead form fields into project
              tables.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="border-border-subtle flex flex-wrap items-center gap-3 border-b px-5 py-3">
              {statusLoading ? (
                <>
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-8 w-28" />
                </>
              ) : !status?.connected ? (
                <>
                  <div className="text-text-muted flex min-w-0 flex-1 items-center gap-2 text-sm">
                    <AlertTriangle size={15} className="text-amber-500" />
                    Meta account is not connected.
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onConnect}
                    loading={isConnecting}
                  >
                    <ExternalLink size={14} />
                    Connect Meta
                  </Button>
                </>
              ) : !status.active ? (
                <>
                  <div className="text-text-muted flex min-w-0 flex-1 items-center gap-2 text-sm">
                    <AlertTriangle size={15} className="text-destructive" />
                    <span className="truncate">
                      {status.reason || "Meta token is inactive."}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onConnect}
                    loading={isConnecting}
                  >
                    <RefreshCw size={14} />
                    Reconnect
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="rounded-md border border-green-500/20 bg-green-500/10 px-2 py-1 text-[11px] font-bold tracking-wide text-green-600 uppercase dark:text-green-400">
                      Connected
                    </span>
                    <span className="text-text-muted truncate text-xs">
                      Token expires: {formatExpiry(status.expires_at)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onConnect}
                    loading={isConnecting}
                  >
                    <RefreshCw size={14} />
                    Reconnect
                  </Button>
                </>
              )}
            </div>

            {expiresSoon && (
              <div className="border-border-subtle border-b bg-amber-500/[0.08] px-5 py-2 text-[12px] text-amber-700 dark:text-amber-400">
                Meta token expires soon. Reconnect to avoid missed leads.
              </div>
            )}

            {!isMetaReady ? (
              <div className="text-text-muted flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                <Megaphone size={30} className="opacity-40" />
                <p className="max-w-md text-sm">
                  Connect Meta first, then you can subscribe pages and map lead
                  forms into tables.
                </p>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1">
                <div className="border-border-subtle flex w-80 shrink-0 flex-col border-r">
                  <div className="border-border-subtle border-b p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-text-main text-[13px] font-semibold">
                        Subscribed pages
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => {
                          void refetchIntegration();
                          void refetchPages();
                        }}
                        disabled={integrationsLoading || pagesLoading}
                      >
                        {integrationsLoading || pagesLoading ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <RefreshCw size={13} />
                        )}
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Select
                        value={selectedPageId || NONE_VALUE}
                        onValueChange={(value) =>
                          setSelectedPageId(value === NONE_VALUE ? "" : value)
                        }
                        disabled={pagesLoading || availablePages.length === 0}
                      >
                        <SelectTrigger className="h-8 flex-1 text-[12px]">
                          <SelectValue
                            placeholder={
                              pagesLoading ? "Loading pages..." : "Add page"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>
                            Select a page
                          </SelectItem>
                          {availablePages.length === 0 ? (
                            <SelectItem value="__no_pages__" disabled>
                              No available pages
                            </SelectItem>
                          ) : (
                            availablePages.map((page) => (
                              <SelectItem key={page.id} value={page.id}>
                                {page.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => subscribeMutation.mutate()}
                        disabled={!selectedPageId}
                        loading={subscribeMutation.isPending}
                      >
                        <Plus size={13} />
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3">
                    {integrationsLoading ? (
                      <div className="flex flex-col gap-2">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton key={index} className="h-28 rounded-lg" />
                        ))}
                      </div>
                    ) : integrations.length === 0 ? (
                      <div className="text-text-muted px-2 py-8 text-center text-[12px]">
                        No pages subscribed yet.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {integrations.map((integration) => {
                          const active = mappingPage?.page_id === integration.page_id;
                          const isDisconnecting =
                            disconnectMutation.isPending &&
                            disconnectMutation.variables ===
                              integration.resource_id;
                          return (
                            <div
                              key={integration.resource_id}
                              className={cn(
                                "border-border-subtle bg-bg-card rounded-lg border p-3 transition-colors",
                                active && "border-[#1877f2]/40 bg-[#1877f2]/[0.04]",
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1877f2]/10 text-[#1877f2]">
                                  <Link2 size={15} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-text-main truncate text-[13px] font-semibold">
                                    {integration.page_name || integration.page_id}
                                  </p>
                                  <p className="text-text-muted mt-0.5 text-[11px]">
                                    {integration.forms?.length ?? 0} forms mapped
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                                    integration.status === "active"
                                      ? "bg-green-500/15 text-green-600 dark:text-green-400"
                                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                                  )}
                                >
                                  {integration.status || "active"}
                                </span>
                              </div>
                              <p className="text-text-muted mt-2 text-[11px]">
                                Connected {formatDateTime(integration.connected_at)}
                              </p>
                              <div className="mt-3 flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 flex-1 text-[12px]"
                                  onClick={() => setMappingPage(integration)}
                                >
                                  <Settings2 size={13} />
                                  Mapping
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/5 hover:text-destructive h-8 min-w-28 px-2"
                                  onClick={() => {
                                    const ok = window.confirm(
                                      "Leads from this page will stop being received. Disconnect it?",
                                    );
                                    if (ok)
                                      disconnectMutation.mutate(
                                        integration.resource_id,
                                      );
                                  }}
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
                    )}
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  {!mappingPage ? (
                    <div className="text-text-muted flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
                      <FileQuestion size={30} className="opacity-40" />
                      <p className="max-w-md text-sm">
                        Choose a subscribed page to map its lead forms into a
                        project table.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="border-border-subtle flex flex-wrap items-center gap-3 border-b px-5 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-text-main truncate text-[13px] font-semibold">
                            {mappingPage.page_name || mappingPage.page_id}
                          </p>
                          <p className="text-text-muted text-[11px]">
                            Page ID {mappingPage.page_id}
                          </p>
                        </div>
                        <Select
                          value={selectedFormId || NONE_VALUE}
                          onValueChange={(value) =>
                            setSelectedFormId(value === NONE_VALUE ? "" : value)
                          }
                          disabled={formsLoading || pageForms.length === 0}
                        >
                          <SelectTrigger className="h-8 w-64 text-[12px]">
                            <SelectValue
                              placeholder={
                                formsLoading ? "Loading forms..." : "Select form"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_VALUE}>Select form</SelectItem>
                            {pageForms.length === 0 ? (
                              <SelectItem value="__no_forms__" disabled>
                                No lead forms
                              </SelectItem>
                            ) : (
                              pageForms.map((form) => (
                                <SelectItem key={form.id} value={form.id}>
                                  {form.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex min-h-0 flex-1">
                        <div className="border-border-subtle flex w-60 shrink-0 flex-col border-r">
                          <div className="border-border-subtle border-b p-2">
                            <div className="bg-bg-main border-border-subtle focus-within:border-[#1877f2]/60 flex items-center rounded-md border px-2 transition-colors">
                              <Search
                                size={13}
                                className="text-text-muted shrink-0"
                              />
                              <input
                                placeholder="Search tables..."
                                value={tableSearch}
                                onChange={(event) =>
                                  setTableSearch(event.target.value)
                                }
                                className="placeholder:text-text-muted w-full bg-transparent px-2 py-1.5 text-[12px] outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto p-2">
                            {tablesLoading ? (
                              <div className="flex flex-col gap-1.5">
                                {Array.from({ length: 8 }).map((_, index) => (
                                  <Skeleton
                                    key={index}
                                    className="h-7 rounded-md"
                                  />
                                ))}
                              </div>
                            ) : tables.length === 0 ? (
                              <div className="text-text-muted px-2 py-6 text-center text-[12px]">
                                No tables found.
                              </div>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {tables.map(renderTableRow)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="border-border-subtle flex items-center gap-3 border-b px-5 py-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-text-main truncate text-[13px] font-semibold">
                                {selectedTableLabel || "Select a target table"}
                              </p>
                              <p className="text-text-muted text-[11px]">
                                {selectedTableSlug
                                  ? `${columns.length} table fields available`
                                  : "Pick a table on the left before mapping fields"}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                currentMappedCount > 0
                                  ? "bg-green-500/15 text-green-600 dark:text-green-400"
                                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                              )}
                            >
                              {currentMappedCount} mapped
                            </span>
                          </div>

                          <div className="flex-1 overflow-y-auto">
                            {!selectedFormId &&
                            !formsLoading &&
                            pageForms.length === 0 ? (
                              <div className="text-text-muted px-6 py-12 text-center text-[13px]">
                                No lead forms were found for this page. Create or
                                activate a Meta lead form, then refresh this
                                page.
                              </div>
                            ) : !selectedFormId ? (
                              <div className="text-text-muted px-6 py-12 text-center text-[13px]">
                                Select a lead form to configure mapping.
                              </div>
                            ) : questionsLoading || tableFieldsLoading ? (
                              <div className="flex flex-col gap-3 p-5">
                                {Array.from({ length: 6 }).map((_, index) => (
                                  <Skeleton
                                    key={index}
                                    className="h-16 rounded-lg"
                                  />
                                ))}
                              </div>
                            ) : questions.length === 0 ? (
                              <div className="text-text-muted px-6 py-12 text-center text-[13px]">
                                No fields found for this form.
                              </div>
                            ) : (
                              questions.map((question) => {
                                const selectedField =
                                  selectedDraft?.fields[question.key] ?? "";
                                return (
                                  <div
                                    key={question.key}
                                    className="border-border-subtle flex items-start gap-4 border-b px-5 py-3.5 hover:bg-hover-bg/40"
                                  >
                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                      <div
                                        className={cn(
                                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                                          selectedField
                                            ? "border-green-500/30 bg-green-500/10 text-green-500"
                                            : "border-border-subtle bg-bg-sidebar text-text-muted",
                                        )}
                                      >
                                        <FileQuestion size={15} />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-text-main text-[13px] font-semibold">
                                            {question.label || question.key}
                                          </span>
                                          <span className="bg-bg-sidebar text-text-muted rounded px-1.5 py-px font-mono text-[10px]">
                                            {question.type || "FIELD"}
                                          </span>
                                        </div>
                                        <p className="text-text-muted mt-0.5 truncate font-mono text-[11px]">
                                          {question.key}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex w-72 shrink-0 items-center gap-2">
                                      <Select
                                        value={selectedField || NONE_VALUE}
                                        onValueChange={(value) =>
                                          setDraftField(
                                            question.key,
                                            value === NONE_VALUE ? "" : value,
                                          )
                                        }
                                        disabled={!selectedTableSlug}
                                      >
                                        <SelectTrigger className="h-9 text-[12px]">
                                          <SelectValue placeholder="Choose field" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-64">
                                          <SelectItem value={NONE_VALUE}>
                                            Not mapped
                                          </SelectItem>
                                          {columns.map((column) => (
                                            <SelectItem
                                              key={column.id ?? column.slug}
                                              value={column.slug}
                                            >
                                              <span className="flex items-center gap-2">
                                                <span className="truncate">
                                                  {column.label || column.slug}
                                                </span>
                                                <span className="bg-bg-sidebar text-text-muted shrink-0 rounded px-1 py-px font-mono text-[10px]">
                                                  {column.type}
                                                </span>
                                              </span>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Checkbox
                                        aria-label={`Require ${question.label || question.key}`}
                                        checked={
                                          selectedDraft?.required[question.key] ===
                                          true
                                        }
                                        onCheckedChange={(checked) =>
                                          setDraftRequired(question.key, checked)
                                        }
                                        disabled={!selectedField}
                                        className="h-4 w-4"
                                      />
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-border-subtle flex items-center justify-between gap-3 border-t px-5 py-3">
            <div className="text-text-muted flex min-w-0 items-center gap-2 text-[11px]">
              {mappingPage ? (
                <>
                  <Unplug size={13} className="shrink-0" />
                  <span className="truncate">
                    Forms not included in saved mapping will be skipped.
                  </span>
                </>
              ) : (
                <span>Subscribe a page, then map each form you want to receive.</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {mappingPage && (
                <Button
                  variant="primary"
                  onClick={() => saveMappingMutation.mutate()}
                  disabled={!canSaveMapping}
                  loading={saveMappingMutation.isPending}
                >
                  <Check size={14} />
                  Save mapping
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
