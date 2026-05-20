import type { BillingLimitCode } from "@/entities/billing";

export type LimitCopy = { title: string; description: string };

export const LIMIT_COPY: Record<BillingLimitCode, LimitCopy> = {
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
  token_day_limit: {
    title: "Daily token limit reached",
    description: "Достигнут лимит токенов для этого проекта на сегодня.",
  },
  token_month_limit: {
    title: "Monthly token limit reached",
    description: "Достигнут лимит токенов для этого проекта на этот месяц.",
  },
};

export const isTokenLimitCode = (code?: BillingLimitCode) =>
  code === "token_day_limit" || code === "token_month_limit";
