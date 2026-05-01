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
} from "@/shared/ui";
import { useRoles, useClientTypes, useUsers } from "../api/users";
import { useAuthStore } from "@/entities/session";
import { useCodeSelectionStore } from "@/entities/project/model/code-selection-store";
import { api } from "@/shared/api";

interface PublishPopoverProps {
  projectTitle: string;
  projectUrl?: string;
}

type Visibility = "public" | "public-login" | "workspace" | "private";

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

  const handlePublish = async () => {
    const repoId = activeCodeSelection?.repoId
    if (!repoId) return
    setIsPublishing(true)
    setPublishDone(false)
    try {
      const headers = apiKey ? { Authorization: 'API-KEY', 'x-api-key': apiKey } : {}
      await api.post('/v2/functions/micro-frontend/promote', { repo_id: Number(repoId) }, { headers })
      setPublishDone(true)
      setTimeout(() => setPublishDone(false), 3000)
    } catch (err) {
      console.error('Failed to publish', err)
    } finally {
      setIsPublishing(false)
    }
  }



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

  const shortUrlCacheRef = useRef<Map<string, string>>(new Map());
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [isShortening, setIsShortening] = useState(false);

  const SHORT_URL_STORAGE_PREFIX = 'ugen:tinyurl:';

  const readShortFromStorage = (key: string): string | null => {
    try {
      return typeof window !== 'undefined'
        ? window.localStorage.getItem(SHORT_URL_STORAGE_PREFIX + key)
        : null;
    } catch {
      return null;
    }
  };

  const writeShortToStorage = (key: string, value: string) => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SHORT_URL_STORAGE_PREFIX + key, value);
      }
    } catch {
      // storage full / blocked — ignore
    }
  };

  const shortenUrl = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch('https://ugen-jade.vercel.app/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const short = data?.short_url;
      return typeof short === 'string' && short.startsWith('http') ? short : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!mfUrl) {
      setShortUrl(null);
      return;
    }
    const cached =
      shortUrlCacheRef.current.get(mfUrl) ?? readShortFromStorage(mfUrl);
    if (cached) {
      shortUrlCacheRef.current.set(mfUrl, cached);
      setShortUrl(cached);
    } else {
      setShortUrl(null);
    }
  }, [mfUrl]);

  useEffect(() => {
    if (!isOpen || !mfUrl || visibility !== 'public') return;
    if (shortUrlCacheRef.current.has(mfUrl)) return;
    const stored = readShortFromStorage(mfUrl);
    if (stored) {
      shortUrlCacheRef.current.set(mfUrl, stored);
      setShortUrl(stored);
      return;
    }

    let cancelled = false;
    setIsShortening(true);
    (async () => {
      const target = mfUrl.startsWith('http') ? mfUrl : `https://${mfUrl}`;
      const short = await shortenUrl(target);
      if (cancelled) return;
      if (short) {
        shortUrlCacheRef.current.set(mfUrl, short);
        writeShortToStorage(mfUrl, short);
        setShortUrl(short);
      }
      setIsShortening(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mfUrl, visibility]);

  const copyMfUrl = async () => {
    if (!mfUrl) return;

    const cached =
      shortUrlCacheRef.current.get(mfUrl) ?? readShortFromStorage(mfUrl);
    let toCopy = cached ?? mfUrl;

    if (!cached) {
      setIsShortening(true);
      const target = finalUrl || mfUrl;
      const short = await shortenUrl(target);
      setIsShortening(false);
      if (short) {
        shortUrlCacheRef.current.set(mfUrl, short);
        writeShortToStorage(mfUrl, short);
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
          <h2 className="text-text-main text-base font-semibold">
            {t("publishTitle")}
          </h2>

          {/* Public URL */}
          {visibility === "public" && mfUrl && (
            <div className="space-y-1">
              <span className="text-text-muted text-xs font-medium flex items-center gap-1">
                <Globe size={12} />
                {t("visibilityPublic")}
              </span>
              <div className="border-border-subtle bg-bg-main flex items-center gap-1 rounded-lg border px-3 py-2">
                <a
                  href={shortUrl ?? finalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={mfUrl}
                  className="text-primary flex-1 truncate font-mono text-xs hover:underline"
                >
                  {shortUrl ?? displayMfUrl}
                </a>
                <button
                  type="button"
                  onClick={copyMfUrl}
                  disabled={isShortening}
                  className="text-text-muted hover:text-text-main shrink-0 rounded p-1 transition-colors disabled:opacity-50"
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
            disabled={isPublishing || !activeCodeSelection?.repoId}
            className="bg-primary hover:bg-primary-hover w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPublishing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Publishing...
              </>
            ) : publishDone ? (
              <>
                <Check size={14} />
                Published!
              </>
            ) : (
              t("publishApp")
            )}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
