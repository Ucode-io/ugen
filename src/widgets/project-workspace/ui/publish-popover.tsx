"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Copy,
  Check,
  Pencil,
  Gem,
  Eye,
  Globe,
  Users,
  Lock,
  ChevronDown,
  Loader2,
  XCircle,
  AlertTriangle,
  Rocket,
  ExternalLink,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
} from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";
import { useRoles, useClientTypes, useUsers } from "../api/users";
import { AddTemplateDialog } from "./add-template-dialog";
import { useAuthStore } from "@/entities/session";
import { useCodeSelectionStore } from "@/entities/project/model/code-selection-store";
import { api } from "@/shared/api";

interface PublishPopoverProps {
  projectTitle: string;
  projectUrl?: string;
}

type Visibility = "public" | "public-login" | "workspace" | "private";
type PublishStatus =
  | "idle"
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "canceled";

const POLL_INTERVAL_MS = 5000;

export const PublishPopover = ({
  projectTitle,
  projectUrl,
}: PublishPopoverProps) => {
  const t = useTranslations("features.project");
  const params = useParams();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id || "";
  const { project } = useAuthStore();
  const ucodeProjectId = useAuthStore((s) => s.ucodeProjectId);
  const projectEnvId = useAuthStore((s) => s.projectEnvId);
  const companyName = project?.title || "";

  const [visibility, setVisibility] = useState<Visibility>("public");
  const [role, setRole] = useState<{
    value: string;
    label: string;
    client_type_id: string;
  } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isUrlCopied, setIsUrlCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const apiKey = useAuthStore((s) => s.apiKey);
  const activeCodeSelection = useCodeSelectionStore((s) => s.activeCodeSelection);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishDone, setPublishDone] = useState(false);
  const [isLoadingVisibility, setIsLoadingVisibility] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  const [publishStatusOpen, setPublishStatusOpen] = useState(false);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("idle");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCancelledRef = useRef(false);

  const [hasChanges, setHasChanges] = useState<boolean | null>(null);
  const [isCheckingChanges, setIsCheckingChanges] = useState(false);
  const [everPromoted, setEverPromoted] = useState<boolean | null>(null);

  const loadChanges = async () => {
    const repoId = activeCodeSelection?.repoId
    if (!repoId) return
    setIsCheckingChanges(true)
    try {
      const headers = apiKey ? { Authorization: 'API-KEY', 'x-api-key': apiKey } : {}
      const { data } = await api.get(
        `/v2/functions/micro-frontend/promote/check-changes?repo_id=${repoId}`,
        { headers }
      )
      setHasChanges(data?.data?.hasChanges ?? true)
      setEverPromoted(data?.data?.everPromoted ?? true)
    } catch {
      setHasChanges(true)
      setEverPromoted(true)
    } finally {
      setIsCheckingChanges(false)
    }
  }


  const loadVisibility = async () => {
    if (!projectId) return
    setIsLoadingVisibility(true)
    try {
      const token = useAuthStore.getState().accessToken
      const { data } = await api.get(`/v1/mcp_project/${projectId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const appVisibility = data?.data?.app_visibility || 'public'
      setVisibility(appVisibility === 'private' ? 'private' : 'public')
    } catch (err) {
      console.error('Failed to load visibility', err)
    } finally {
      setIsLoadingVisibility(false)
    }
  }

  const handleVisibilityChange = async (newVisibility: Visibility) => {
    if (!projectId) return
    setVisibility(newVisibility)
    setIsUpdatingVisibility(true)
    try {
      const token = useAuthStore.getState().accessToken
      await api.put(`/v1/mcp_project/${projectId}`, {
        app_visibility: newVisibility
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
    } catch (err) {
      console.error('Failed to update visibility', err)
      await loadVisibility()
    } finally {
      setIsUpdatingVisibility(false)
    }
  }

  const stopPolling = () => {
    pollCancelledRef.current = true
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  const stopLiveLoading = () => {
    if (liveTimerRef.current) {
      clearTimeout(liveTimerRef.current)
      liveTimerRef.current = null
    }
    setIsLiveLoading(false)
  }

  const startLiveLoading = () => {
    if (liveTimerRef.current) clearTimeout(liveTimerRef.current)
    setIsLiveLoading(true)
    const duration = 7000 + Math.random() * 3000
    liveTimerRef.current = setTimeout(() => {
      setIsLiveLoading(false)
      liveTimerRef.current = null
    }, duration)
  }

  const pollPipelineStatus = async (pipelineId: number, repoId: number) => {
    if (pollCancelledRef.current) return
    try {
      const headers = apiKey ? { Authorization: 'API-KEY', 'x-api-key': apiKey } : {}
      const { data } = await api.get(
        `/v2/functions/micro-frontend/promote/pipeline-status/${pipelineId}?repo_id=${repoId}`,
        { headers }
      )
      if (pollCancelledRef.current) return
      const status = (data?.data?.status as PublishStatus) || 'pending'
      setPublishStatus(status)
      if (status === 'pending' || status === 'running') {
        pollTimerRef.current = setTimeout(
          () => pollPipelineStatus(pipelineId, repoId),
          POLL_INTERVAL_MS
        )
      } else {
        setIsPublishing(false)
        if (status === 'success') {
          setPublishDone(true)
          setTimeout(() => setPublishDone(false), 3000)
          startLiveLoading()
          loadChanges()
        }
      }
    } catch (err) {
      console.error('Failed to fetch pipeline status', err)
      if (pollCancelledRef.current) return
      setPublishStatus('failed')
      setPublishError(t('publishStatusError'))
      setIsPublishing(false)
    }
  }

  const handlePublish = async () => {
    const repoId = activeCodeSelection?.repoId
    if (!repoId) return
    stopPolling()
    pollCancelledRef.current = false
    setIsPublishing(true)
    setPublishDone(false)
    setPublishError(null)
    setPublishStatus('pending')
    setIsOpen(false)
    try {
      const headers = apiKey ? { Authorization: 'API-KEY', 'x-api-key': apiKey } : {}
      const { data } = await api.post(
        '/v2/functions/micro-frontend/promote',
        { repo_id: Number(repoId), mcp_project_id: projectId },
        { headers }
      )
      const pipelineId = data?.data?.pipeline_id as number | undefined
      const initialStatus = (data?.data?.status as PublishStatus) || 'pending'
      if (!pipelineId) {
        setPublishStatus('failed')
        setPublishError(t('publishStatusError'))
        setIsPublishing(false)
        return
      }
      setPublishStatus(initialStatus)
      if (initialStatus === 'pending' || initialStatus === 'running') {
        pollTimerRef.current = setTimeout(
          () => pollPipelineStatus(pipelineId, Number(repoId)),
          POLL_INTERVAL_MS
        )
      } else {
        setIsPublishing(false)
        if (initialStatus === 'success') {
          setPublishDone(true)
          setTimeout(() => setPublishDone(false), 3000)
          startLiveLoading()
        }
      }
    } catch (err) {
      console.error('Failed to publish', err)
      setPublishStatus('failed')
      setPublishError(t('publishStatusError'))
      setIsPublishing(false)
    }
  }

  const handleClosePublishStatus = (open: boolean) => {
    setPublishStatusOpen(open)
    if (!open) {
      stopPolling()
      stopLiveLoading()
      // reset only when terminal so user doesn't lose in-progress info
      if (
        publishStatus === 'success' ||
        publishStatus === 'failed' ||
        publishStatus === 'canceled'
      ) {
        setPublishStatus('idle')
        setPublishError(null)
      }
    }
  }

  useEffect(() => {
    return () => {
      stopPolling()
      stopLiveLoading()
    }
  }, [])



  const { data: roleOptions = [] } = useRoles({ projectId });

  useEffect(() => {
    if (roleOptions.length > 0 && !role) {
      const admin = roleOptions.find((r) =>
        r.label.toLowerCase().includes("admin"),
      );
      const opt = admin || roleOptions[0];
      setRole({
        value: opt.value,
        label: opt.label,
        client_type_id: opt.client_type_id || "",
      });
    }
  }, [roleOptions, role]);

  useEffect(() => {
    if (isOpen) {
      loadVisibility()
    }
  }, [isOpen, projectId])

  // Re-check when repo appears mid-open (first generation completes while popover is open).
  useEffect(() => {
    if (isOpen) loadChanges()
  }, [isOpen, activeCodeSelection?.repoId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const appUrl = projectUrl || "";
  const displayHost = appUrl.replace(/^https?:\/\//, "");

  const inviteLink = useMemo(() => {
    if (!role?.client_type_id) return "";
    const domain = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams({
      "project-id": ucodeProjectId || projectId,
      env_id: projectEnvId || "",
      role_id: role.value,
      client_type_id: role.client_type_id,
      name: projectTitle,
      companyName,
    });
    return `${domain}/workspace?${params.toString()}`;
  }, [
    ucodeProjectId,
    projectId,
    projectEnvId,
    role,
    projectTitle,
    companyName,
  ]);

  const copyUrl = () => {
    if (!appUrl) return;
    navigator.clipboard.writeText(appUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const mfUrl = activeCodeSelection?.kind === 'microfrontend' ? activeCodeSelection.url : undefined;
  const finalUrl = mfUrl?.startsWith('http') ? mfUrl : `https://${mfUrl}`;
  const displayMfUrl = mfUrl?.replace(
    /^(?:https?:\/\/)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
    (m) => (m.startsWith('http') ? m.split('//')[0] + '//' : '')
  );

  // function_id of the active microfrontend — the short link is keyed by it on the BE.
  const functionId =
    activeCodeSelection?.kind === 'microfrontend' ? activeCodeSelection.id : undefined;

  const shortUrlCacheRef = useRef<Map<string, string>>(new Map());
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [isShortening, setIsShortening] = useState(false);

  // Stripped of the protocol for a cleaner display; `shortUrl` keeps the full
  // absolute URL for the href / clipboard.
  const displayShortUrl = shortUrl?.replace(/^https?:\/\//, '');

  // BE returns short_url without a protocol (e.g. "app.ucode.co/p/slug").
  // Normalize to an absolute https URL so it works as an href / clipboard value.
  const pickShortUrl = (data: any): string | null => {
    const short = data?.data?.short_url;
    if (typeof short !== 'string' || !short.trim()) return null;
    return /^https?:\/\//.test(short) ? short : `https://${short}`;
  };

  // The endpoint keys off function_id (not a project in the path), so the BE
  // can't infer the project — it needs project_id + environment_id explicitly.
  // Mirror the app-wide convention: `project-id` query param + `Environment-Id` header.
  const shortLinkRequestConfig = {
    params: { 'project-id': ucodeProjectId || projectId },
    headers: { 'Environment-Id': projectEnvId ?? '' },
  };

  // Resolve the short link for the active microfrontend:
  //  1. GET by function_id — works for new projects (BE creates it at generation
  //     time; it also arrives in the SSE `done` event's project_data.short_url).
  //  2. On 404 (old project, created before this feature) → POST to create it.
  //     The POST is idempotent, so retrying always returns the same link.
  const fetchShortLink = async (fnId: string): Promise<string | null> => {
    try {
      const { data } = await api.get(`/v1/mcp_project/short-link/${fnId}`, shortLinkRequestConfig);
      const short = pickShortUrl(data);
      if (short) return short;
    } catch (err: any) {
      // 404 is expected for old projects → fall through to create.
      if (err?.response?.status !== 404) {
        console.error('Failed to fetch short link', err);
      }
    }

    if (!mfUrl) return null;
    try {
      const { data } = await api.post(
        '/v1/mcp_project/short-link',
        {
          function_id: fnId,
          mcp_project_id: projectId,
          ...(ucodeProjectId ? { project_id: ucodeProjectId } : {}),
          url: finalUrl,
          name: projectTitle,
        },
        shortLinkRequestConfig,
      );
      return pickShortUrl(data);
    } catch (err) {
      console.error('Failed to create short link', err);
      return null;
    }
  };

  // Reset / restore from in-memory cache when the active microfrontend changes.
  useEffect(() => {
    if (!functionId) {
      setShortUrl(null);
      return;
    }
    setShortUrl(shortUrlCacheRef.current.get(functionId) ?? null);
  }, [functionId]);

  useEffect(() => {
    if (!isOpen || !functionId || visibility !== 'public') return;
    if (shortUrlCacheRef.current.has(functionId)) return;

    let cancelled = false;
    setIsShortening(true);
    (async () => {
      const short = await fetchShortLink(functionId);
      if (cancelled) return;
      if (short) {
        shortUrlCacheRef.current.set(functionId, short);
        setShortUrl(short);
      }
      setIsShortening(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, functionId, visibility]);

  const copyMfUrl = async () => {
    if (!mfUrl) return;

    const cached = functionId ? shortUrlCacheRef.current.get(functionId) : undefined;
    let toCopy = cached ?? mfUrl;

    if (!cached && functionId) {
      setIsShortening(true);
      const short = await fetchShortLink(functionId);
      setIsShortening(false);
      if (short) {
        shortUrlCacheRef.current.set(functionId, short);
        setShortUrl(short);
        toCopy = short;
      }
    }

    try {
      await navigator.clipboard.writeText(toCopy);
    } catch {
      navigator.clipboard.writeText(mfUrl);
    }
    setIsUrlCopied(true);
    setTimeout(() => setIsUrlCopied(false), 2000);
  };

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setIsLinkCopied(true);
    setTimeout(() => setIsLinkCopied(false), 2000);
  };

  const visibilityOptions: {
    value: Visibility;
    icon: React.ReactNode;
    label: string;
    disabled?: boolean;
  }[] = [
    {
      value: "public",
      icon: <Globe size={15} />,
      label: t("visibilityPublic"),
    },
    {
      value: "private",
      icon: <Lock size={15} />,
      label: t("visibilityPrivate"),
    },
  ];

  const allOptions = visibilityOptions;
  const selected =
    allOptions.find((o) => o.value === visibility) ?? allOptions[0];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild >
        <button className="bg-primary hover:bg-primary-hover rounded-lg px-4 py-1.5 text-[13px] font-medium text-white transition-colors">
          {t("publish")}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="bg-bg-card border-border-subtle w-100 rounded-xl border p-0 shadow-xl"
      >
        {/* Header + URL + custom domain */}
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-text-main text-base font-semibold">
              {t("publishTitle")}
            </h2>
            <AddTemplateDialog
              projectTitle={projectTitle}
              projectId={projectId}
              projectUrl={projectUrl}
            />
          </div>

          {/* Public URL */}
          {visibility === "public" && mfUrl && (
            <div className="space-y-1">
              <span className="text-text-muted text-xs font-medium flex items-center gap-1">
                <Globe size={12} />
                {t("visibilityPublic")}
              </span>
              <div className={cn(
                "border-bg-main flex items-center gap-1 rounded-lg border px-3 py-2",
                everPromoted === false
                  ? "border-border-subtle bg-bg-sidebar opacity-60"
                  : "border-border-subtle bg-bg-main"
              )}>
                {everPromoted === false ? (
                  <span
                    title="Deploy the project first to get a live URL"
                    className="text-text-muted flex-1 truncate font-mono text-xs cursor-not-allowed"
                  >
                    {displayShortUrl ?? displayMfUrl}
                  </span>
                ) : (
                  <a
                    href={shortUrl ?? finalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={mfUrl}
                    className="text-primary flex-1 truncate font-mono text-xs hover:underline"
                  >
                    {displayShortUrl ?? displayMfUrl}
                  </a>
                )}
                <button
                  type="button"
                  onClick={copyMfUrl}
                  disabled={isShortening || everPromoted === false}
                  className="text-text-muted hover:text-text-main shrink-0 rounded p-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isShortening ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : isUrlCopied ? (
                    <Check size={15} />
                  ) : (
                    <Copy size={15} />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Private invite link */}
          {visibility === "private" && inviteLink && (
            <div className="space-y-1">
              <span className="text-text-muted text-xs font-medium flex items-center gap-1">
                <Lock size={12} />
                {t("visibilityPrivate")}
              </span>
              <div className="border-border-subtle bg-bg-main flex items-center gap-1 rounded-lg border px-3 py-2">
                <span className="text-text-main flex-1 truncate font-mono text-xs">
                  {inviteLink}
                </span>
                <button
                  type="button"
                  onClick={copyLink}
                  className="text-text-muted hover:text-text-main shrink-0 rounded p-1 transition-colors"
                >
                  {isLinkCopied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
            </div>
          )}

        </div>

        <div className="border-border-subtle border-t" />

        {/* App Visibility */}
        <div className="flex items-center justify-between gap-3 px-5 py-2">
          <div className="text-text-main flex items-center gap-2 text-sm">
            <Eye size={16} className="text-text-muted" />
            {t("appVisibility")}
          </div>

          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="border-border-subtle bg-bg-main text-text-main hover:bg-hover-bg flex h-9 w-52 items-center gap-2 rounded-lg border px-3 text-sm transition-colors"
            >
              <span className="text-text-muted shrink-0">{selected.icon}</span>
              <span className="flex-1 truncate text-left">
                {selected.label}
              </span>
              <ChevronDown
                size={14}
                className={`text-text-muted shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div className="border-border-subtle bg-bg-card absolute top-full right-0 z-50 mt-1 w-64 rounded-xl border shadow-xl">
                <div className="p-1.5">
                  {allOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={opt.disabled || isUpdatingVisibility}
                      onClick={() => {
                        if (!opt.disabled && !isUpdatingVisibility) {
                          handleVisibilityChange(opt.value);
                          setDropdownOpen(false);
                        }
                      }}
                      className={[
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-[6px] text-sm transition-colors",
                        opt.disabled || isUpdatingVisibility
                          ? "cursor-not-allowed"
                          : "hover:bg-hover-bg cursor-pointer",
                      ].join(" ")}
                    >
                      <span
                        className={
                          opt.disabled
                            ? "text-text-muted shrink-0 opacity-40"
                            : "text-text-muted shrink-0"
                        }
                      >
                        {opt.icon}
                      </span>
                      <span
                        className={
                          opt.disabled
                            ? "text-text-muted flex-1 text-left opacity-40"
                            : "text-text-main flex-1 text-left"
                        }
                      >
                        {opt.label}
                      </span>
                      {opt.disabled ? (
                        <span className="text-text-muted ml-auto flex items-center gap-1 text-xs">
                          {t("availableFor")}
                          <span className="rounded-full border border-orange-300 px-1.5 py-0.5 text-[10px] font-medium text-orange-500">
                            {t("starterPlus")}
                          </span>
                        </span>
                      ) : opt.value === visibility ? (
                        <Check
                          size={14}
                          className="text-primary ml-auto shrink-0"
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Private: role select only (invite link shown above) */}
        {visibility === "private" && roleOptions.length > 0 && (
          <>
            <div className="border-border-subtle border-t" />
            <div className="flex items-center justify-between gap-3 px-5 py-[6px]">
              <span className="text-text-main text-sm">{t("role")}</span>
              <Select
                value={role?.value || ""}
                onValueChange={(v) => {
                  const opt = roleOptions.find((o) => o.value === v);
                  if (opt)
                    setRole({
                      value: opt.value,
                      label: opt.label,
                      client_type_id: opt.client_type_id || "",
                    });
                }}
              >
                <SelectTrigger className="bg-bg-main h-9 w-52 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="border-border-subtle border-t" />

        {/* Publish button */}
        <div className="p-5 pt-4">
          <button
            onClick={handlePublish}
            disabled={isPublishing || !activeCodeSelection?.repoId || isCheckingChanges || hasChanges === false}
            className="bg-primary hover:bg-primary-hover w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPublishing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t("publishStatusRunningTitle")}
              </>
            ) : publishDone ? (
              <>
                <Check size={14} />
                {t("publishStatusSuccessTitle")}
              </>
            ) : (
              t("publishApp")
            )}
          </button>
        </div>

      </PopoverContent>

      <Dialog open={publishStatusOpen} onOpenChange={handleClosePublishStatus}>
        <DialogContent className="max-w-sm p-0 overflow-hidden gap-0 [&>button]:hidden">
          {/* Accent bar */}
          <div
            className={cn("h-0.5 w-full", {
              "bg-yellow-500": publishStatus === "pending",
              "bg-primary": publishStatus === "running",
              "bg-green-500": publishStatus === "success",
              "bg-red-500": publishStatus === "failed",
              "bg-amber-400": publishStatus === "canceled",
            })}
          />

          <div className="px-5 pt-5 pb-4 space-y-4">
            {/* Icon + title row */}
            <div className="flex items-center gap-3.5">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  {
                    "bg-yellow-500/10": publishStatus === "pending",
                    "bg-primary/10": publishStatus === "running",
                    "bg-green-500/10": publishStatus === "success",
                    "bg-red-500/10": publishStatus === "failed",
                    "bg-amber-400/10": publishStatus === "canceled",
                  }
                )}
              >
                {(publishStatus === "pending" || publishStatus === "running") && (
                  <Loader2
                    size={20}
                    className={cn("animate-spin", {
                      "text-yellow-500": publishStatus === "pending",
                      "text-primary": publishStatus === "running",
                    })}
                  />
                )}
                {publishStatus === "success" && (
                  <Rocket size={20} className="text-green-500" />
                )}
                {publishStatus === "failed" && (
                  <XCircle size={20} className="text-red-500" />
                )}
                {publishStatus === "canceled" && (
                  <AlertTriangle size={20} className="text-amber-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-text-main text-sm font-semibold leading-tight">
                  {publishStatus === "pending" && t("publishStatusPendingTitle")}
                  {publishStatus === "running" && t("publishStatusRunningTitle")}
                  {publishStatus === "success" && t("publishStatusSuccessTitle")}
                  {publishStatus === "failed" && t("publishStatusFailedTitle")}
                  {publishStatus === "canceled" && t("publishStatusCanceledTitle")}
                </p>
                <p className="text-text-muted text-xs mt-0.5 leading-snug">
                  {publishStatus === "pending" && t("publishStatusPendingDesc")}
                  {publishStatus === "running" && t("publishStatusRunningDesc")}
                  {publishStatus === "success" && t("publishStatusSuccessDesc")}
                  {publishStatus === "failed" && (publishError || t("publishStatusFailedDesc"))}
                  {publishStatus === "canceled" && t("publishStatusCanceledDesc")}
                </p>
              </div>
            </div>

            {/* Pipeline steps */}
            <div className="border-border-subtle rounded-lg border bg-bg-main px-3.5 py-3 space-y-2.5">
              {(
                [
                  {
                    label: "Queued",
                    done: true,
                    active: publishStatus === "pending",
                  },
                  {
                    label: "Deploying",
                    done: publishStatus === "success",
                    active: publishStatus === "running",
                    running: publishStatus === "running",
                  },
                  {
                    label: "Live",
                    done: publishStatus === "success" && !isLiveLoading,
                    active: false,
                    running: publishStatus === "success" && isLiveLoading,
                    failed: publishStatus === "failed",
                    canceled: publishStatus === "canceled",
                  },
                ] as {
                  label: string;
                  done: boolean;
                  active?: boolean;
                  running?: boolean;
                  failed?: boolean;
                  canceled?: boolean;
                }[]
              ).map((step, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold transition-colors",
                      step.failed
                        ? "border-red-500/50 bg-red-500/10 text-red-500"
                        : step.canceled
                          ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                          : step.done
                            ? "border-green-500/50 bg-green-500/10 text-green-500"
                            : step.running
                              ? "border-primary/50 bg-primary/10 text-primary"
                              : step.active
                                ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-500"
                                : "border-border-subtle bg-transparent text-text-muted/30"
                    )}
                  >
                    {step.failed ? (
                      <XCircle size={9} />
                    ) : step.canceled ? (
                      <AlertTriangle size={9} />
                    ) : step.done ? (
                      <Check size={9} />
                    ) : step.running ? (
                      <Loader2 size={9} className="animate-spin" />
                    ) : (
                      String(i + 1)
                    )}
                  </div>
                  <span
                    className={cn("text-xs font-mono", {
                      "text-red-500": step.failed,
                      "text-amber-400": step.canceled,
                      "text-green-500": step.done && !step.failed && !step.canceled,
                      "text-primary": step.running,
                      "text-yellow-500": step.active && !step.running,
                      "text-text-muted/40":
                        !step.done &&
                        !step.active &&
                        !step.running &&
                        !step.failed &&
                        !step.canceled,
                    })}
                  >
                    {step.label}
                  </span>
                  {step.done && !step.failed && !step.canceled && (
                    <span className="ml-auto text-[10px] text-green-500/70 font-mono">
                      done
                    </span>
                  )}
                  {step.running && (
                    <span className="ml-auto text-[10px] text-primary/70 font-mono animate-pulse">
                      in progress
                    </span>
                  )}
                  {step.failed && (
                    <span className="ml-auto text-[10px] text-red-500/70 font-mono">
                      failed
                    </span>
                  )}
                  {step.canceled && (
                    <span className="ml-auto text-[10px] text-amber-400/70 font-mono">
                      canceled
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Success: show deploy URL */}
            {publishStatus === "success" && mfUrl && (
              isLiveLoading ? (
                <div
                  title="Waiting for live deployment…"
                  className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-main px-3 py-2 cursor-not-allowed opacity-60 select-none"
                >
                  <Loader2 size={13} className="text-text-muted shrink-0 animate-spin" />
                  <span className="text-text-muted flex-1 truncate font-mono text-xs">
                    {displayShortUrl ?? displayMfUrl}
                  </span>
                  <span className="text-[10px] text-text-muted/70 font-mono">
                    going live…
                  </span>
                </div>
              ) : (
                <a
                  href={shortUrl ?? finalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2 group transition-colors hover:border-green-500/40"
                >
                  <Globe size={13} className="text-green-500 shrink-0" />
                  <span className="text-primary flex-1 truncate font-mono text-xs group-hover:underline">
                    {displayShortUrl ?? displayMfUrl}
                  </span>
                  <ExternalLink size={12} className="text-green-500/50 shrink-0" />
                </a>
              )
            )}
          </div>

          {/* Footer */}
          <div className="border-border-subtle border-t px-5 py-3 flex justify-end">
            {publishStatus === "pending" || publishStatus === "running" ? (
              <button
                type="button"
                onClick={() => handleClosePublishStatus(false)}
                className="text-text-muted hover:text-text-main text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                {t("hide")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleClosePublishStatus(false)}
                className="bg-primary hover:bg-primary-hover rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-colors"
              >
                {t("close")}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating publish indicator — visible while the pipeline is in progress */}
      {isPublishing && (
        <button
          type="button"
          onClick={() => setPublishStatusOpen(true)}
          title={t("publishStatusRunningTitle")}
          className="fixed bottom-6 right-6 z-60 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-xl transition-transform hover:scale-105 active:scale-95"
        >
          <Loader2 size={22} className="animate-spin" />
        </button>
      )}
    </Popover>
  );
};
