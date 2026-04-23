"use client";
import { useState, useRef, useEffect, useMemo } from "react";
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
  const { project } = useAuthStore();
  const ucodeProjectId = useAuthStore((s) => s.ucodeProjectId);
  const projectEnvId = useAuthStore((s) => s.projectEnvId);
  const projectId = project?.project_id || "";
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
    if (
      (visibility !== "workspace" && visibility !== "private") ||
      !role?.client_type_id
    )
      return "";
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
    visibility,
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

  const copyMfUrl = () => {
    if (!mfUrl) return;
    navigator.clipboard.writeText(mfUrl);
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

          {/* Microfrontend URL */}
          {mfUrl && (
            <div className="space-y-1">
              <span className="text-text-muted text-xs font-medium">
                URL
              </span>
              <div className="border-border-subtle bg-bg-main flex items-center gap-1 rounded-lg border px-3 py-2">
                <a
                  href={finalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary flex-1 truncate font-mono text-xs hover:underline"
                >
                  {mfUrl}
                </a>
                <button
                  type="button"
                  onClick={copyMfUrl}
                  className="text-text-muted hover:text-text-main shrink-0 rounded p-1 transition-colors"
                >
                  {isUrlCopied ? <Check size={15} /> : <Copy size={15} />}
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
                      disabled={opt.disabled}
                      onClick={() => {
                        if (!opt.disabled) {
                          setVisibility(opt.value);
                          setDropdownOpen(false);
                        }
                      }}
                      className={[
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-[6px] text-sm transition-colors",
                        opt.disabled
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
