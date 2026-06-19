"use client";

import { useState } from "react";
import {
  AlertCircle,
  Ban,
  ChevronDown,
  Clock,
  Code2,
  CreditCard,
  DraftingCompass,
  ListTree,
  MonitorX,
  RotateCcw,
  Route,
  Server,
  ShieldAlert,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils/cn";
import {
  type AiChatError,
  type AiChatErrorCode,
  isTokenLimitError,
} from "@/entities/chat";

// ─── Error code → icon ────────────────────────────────────────────────────────
// Each failure kind gets a recognizable glyph so users can tell a billing wall
// from a build error at a glance. Unknown codes fall back to a generic alert.
const ERROR_ICON_MAP: Partial<Record<AiChatErrorCode, LucideIcon>> = {
  TOKEN_LIMIT_EXCEEDED: Ban,
  AI_MAX_TOKENS: ListTree,
  TIMEOUT: Clock,
  ROUTER_FAILED: Route,
  ARCHITECT_FAILED: DraftingCompass,
  PROVISIONING_FAILED: Server,
  MANIFEST_FAILED: ListTree,
  CODEGEN_FAILED: Code2,
  PUBLISH_FAILED: UploadCloud,
  VALIDATION_FAILED: ShieldAlert,
  PREVIEW_BUILD_FAILED: MonitorX,
  INTERNAL_ERROR: AlertCircle,
};

const iconFor = (code: AiChatErrorCode): LucideIcon =>
  ERROR_ICON_MAP[code] ?? AlertCircle;

interface ErrorMessageCardProps {
  error: AiChatError;
  onRetry?: () => void;
  onUpgrade?: () => void;
  retryDisabled?: boolean;
  isRetrying?: boolean;
}

export const ErrorMessageCard = ({
  error,
  onRetry,
  onUpgrade,
  retryDisabled,
  isRetrying,
}: ErrorMessageCardProps) => {
  const t = useTranslations("widgets.workspaceChat.error");
  const [showDetails, setShowDetails] = useState(false);

  const isTokenLimit = isTokenLimitError(error.code);
  const Icon = iconFor(error.code);
  const canRetry = error.retryable && !isTokenLimit && !!onRetry;

  return (
    <div className="flex flex-col gap-2 p-4 mt-2 ml-4 mr-4 bg-destructive/5 border border-destructive/25 rounded-xl text-sm shadow-sm max-w-[90%] self-start animate-in fade-in slide-in-from-left-2 duration-300">
      {/* Headline */}
      <div className="flex items-start gap-2.5">
        <div className="bg-destructive/10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
          <Icon size={15} className="text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-text-main leading-snug break-words">
            {error.message}
          </div>
          {error.user_action && (
            <div className="text-xs text-text-muted leading-relaxed mt-1 break-words">
              {error.user_action}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {(canRetry || isTokenLimit) && (
        <div className="flex items-center gap-2 mt-1 pl-9.5">
          {isTokenLimit ? (
            <button
              type="button"
              onClick={onUpgrade}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90 shadow-sm transition-all active:scale-95"
            >
              <CreditCard size={13} />
              {t("upgrade")}
            </button>
          ) : (
            <button
              type="button"
              disabled={retryDisabled || isRetrying}
              onClick={onRetry}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              <RotateCcw size={13} className={isRetrying ? "animate-spin" : ""} />
              {isRetrying ? t("retrying") : t("retry")}
            </button>
          )}
        </div>
      )}

      {/* Technical details (collapsed) */}
      {error.details && (
        <div className="pl-9.5">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-text-main transition-colors"
          >
            <ChevronDown
              size={12}
              className={cn(
                "transition-transform duration-200",
                showDetails && "rotate-180",
              )}
            />
            {showDetails ? t("hideDetails") : t("showDetails")}
          </button>
          {showDetails && (
            <pre className="mt-1.5 max-h-40 overflow-auto rounded-lg bg-bg-sidebar/60 border border-border-subtle/50 p-2 font-mono text-[11px] leading-relaxed text-text-muted whitespace-pre-wrap break-words">
              {error.details}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
