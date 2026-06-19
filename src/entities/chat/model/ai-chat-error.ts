// Structured failure payload carried by assistant messages whose backend
// `content` was prefixed with the `[ERROR]` marker. The gateway strips the
// marker on read and exposes the parsed object as `EnrichedMessage.error`; the
// same payload is delivered live via the SSE `error` event's `data.error`.
// See: frontend docs CHAT_ERROR_MESSAGES.md / CHAT_MESSAGE_MARKERS.md.

// Machine-readable error identity. Stable across releases — safe to switch on.
// `PREVIEW_BUILD_FAILED` is frontend-only (not in the backend catalog) and is
// produced client-side when the in-browser preview fails to compile/run.
export type AiChatErrorCode =
  | "TOKEN_LIMIT_EXCEEDED"
  | "AI_MAX_TOKENS"
  | "TIMEOUT"
  | "ROUTER_FAILED"
  | "ARCHITECT_FAILED"
  | "PROVISIONING_FAILED"
  | "MANIFEST_FAILED"
  | "CODEGEN_FAILED"
  | "PUBLISH_FAILED"
  | "VALIDATION_FAILED"
  | "INTERNAL_ERROR"
  | "PREVIEW_BUILD_FAILED"
  | (string & {});

// Which step of the generation pipeline failed. `preview` is frontend-only.
export type AiChatErrorPhase =
  | "routing"
  | "architect"
  | "provisioning"
  | "manifest"
  | "codegen"
  | "publish"
  | "validation"
  | "preview"
  | "unknown"
  | (string & {});

export interface AiChatError {
  code: AiChatErrorCode; // Machine-readable identity. Switch on this.
  phase: AiChatErrorPhase; // WHERE the failure happened in the pipeline.
  message: string; // User-facing one-liner, already localized by the backend.
  details?: string; // Internal error string — surface behind "Show details".
  retryable: boolean; // If true, render a "Try again" button.
  user_action?: string; // Optional suggested next step, localized.
}

/** Token-budget exhaustion → top-up / upgrade CTA instead of a retry button. */
export const isTokenLimitError = (code?: AiChatErrorCode): boolean =>
  code === "TOKEN_LIMIT_EXCEEDED";

/**
 * Narrows an unknown payload (history field or SSE `data.error`) to an
 * `AiChatError`, filling sane defaults. Returns null when there's nothing
 * error-like to render so callers can simply branch on the result.
 *
 * Defaults: unknown code → `INTERNAL_ERROR`, unknown phase → `unknown`,
 * `retryable` true unless explicitly `false` (token-limit sets it false).
 */
export const normalizeAiChatError = (raw: unknown): AiChatError | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, any>;

  const code: AiChatErrorCode = r.code ?? "INTERNAL_ERROR";
  const message: string =
    (typeof r.message === "string" && r.message.trim()) || "";

  // A bare object with neither a code nor a message isn't an error payload.
  if (!r.code && !message) return null;

  return {
    code,
    phase: r.phase ?? "unknown",
    message: message || "Something went wrong.",
    details:
      typeof r.details === "string" && r.details.trim() ? r.details : undefined,
    retryable: r.retryable !== false,
    user_action:
      typeof r.user_action === "string" && r.user_action.trim()
        ? r.user_action
        : undefined,
  };
};

/**
 * Builds a frontend-only `PREVIEW_BUILD_FAILED` error from a raw esbuild/vite
 * message, so the in-browser preview runtime can surface compile failures as
 * the same error card the backend pipeline uses. See PREVIEW_BUILD_ERRORS.md.
 */
export const createPreviewBuildError = (
  details: string,
  message?: string,
  userAction?: string,
): AiChatError => ({
  code: "PREVIEW_BUILD_FAILED",
  phase: "preview",
  message: message || "Failed to build the project preview.",
  details: details?.trim() || undefined,
  retryable: true,
  user_action: userAction,
});
