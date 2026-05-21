import type {
  BillingLimitCode,
  KnownBillingLimitCode,
} from "@/entities/billing";

export type LimitCopy = { title: string; description: string };

export const LIMIT_COPY: Record<KnownBillingLimitCode, LimitCopy> = {
  project_limit: {
    title: "Project limit reached",
    description:
      "You've used all the projects included in your current plan. Upgrade to create more projects.",
  },
  table_limit: {
    title: "Table limit reached",
    description:
      "You've reached the maximum number of tables for your plan. Upgrade to add more tables.",
  },
  asset_limit: {
    title: "Storage limit reached",
    description:
      "Uploading this file would exceed your storage quota. Upgrade your plan to get more storage.",
  },
  database_limit: {
    title: "Database limit reached",
    description:
      "Your database has reached its size limit. Upgrade your plan to store more data.",
  },
  api_call_limit: {
    title: "API call limit reached",
    description:
      "You've used all the API calls included in your monthly quota. Upgrade your plan for a higher limit.",
  },
  api_key_limit: {
    title: "API key limit reached",
    description:
      "You've reached the maximum number of API keys for your plan. Upgrade to create more API keys.",
  },
  function_limit: {
    title: "Function limit reached",
    description:
      "You've reached the maximum number of functions for your plan. Upgrade to create more functions.",
  },
  microfrontend_limit: {
    title: "Microfrontend limit reached",
    description:
      "You've reached the maximum number of microfrontends for your plan. Upgrade to create more microfrontends.",
  },
  user_limit: {
    title: "User limit reached",
    description:
      "You've reached the maximum number of users for your plan. Upgrade to invite more users.",
  },
  token_day_limit: {
    title: "Daily token limit reached",
    description: "Достигнут лимит токенов для этого проекта на сегодня.",
  },
  token_month_limit: {
    title: "Monthly token limit reached",
    description: "Достигнут лимит токенов для этого проекта на этот месяц.",
  },
};

/** Fallback copy for any limit code the backend sends that isn't in LIMIT_COPY. */
export const DEFAULT_LIMIT_COPY: LimitCopy = {
  title: "Plan limit reached",
  description:
    "You've reached a limit included in your current plan. Upgrade your plan to continue.",
};

/** Always returns a copy — known code → tailored, unknown code → generic fallback. */
export const getLimitCopy = (code?: BillingLimitCode): LimitCopy =>
  (code && LIMIT_COPY[code as KnownBillingLimitCode]) || DEFAULT_LIMIT_COPY;

export const isTokenLimitCode = (code?: BillingLimitCode) =>
  code === "token_day_limit" || code === "token_month_limit";
