"use client";

import { useState } from "react";
import { AlertTriangle, CalendarX2, Crown, X } from "lucide-react";
import { useAuthStore } from "@/entities/session";
import { useCurrentSubscription, useFare } from "@/entities/billing";
import { UpgradePlanDialog } from "./upgrade-plan-dialog";

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const FareFallbackBanner = () => {
  const projectId = useAuthStore((s) => s.project?.project_id ?? null);
  const isUgen = useAuthStore((s) => s.project?.is_ugen ?? false);
  const [dismissed, setDismissed] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const { data: subscription } = useCurrentSubscription(
    projectId,
    Boolean(projectId),
  );

  const isFareFallback =
    !!subscription?.pending_fare_id &&
    subscription?.status !== "pending_downgrade";

  const { data: pendingFare } = useFare(
    isFareFallback ? (subscription?.pending_fare_id ?? null) : null,
    projectId,
  );

  if (!isUgen || !isFareFallback || dismissed) return null;

  const planName = pendingFare?.name
    ? pendingFare.name.charAt(0).toUpperCase() + pendingFare.name.slice(1)
    : "Paid";
  const expiredDate = formatDate(subscription?.end_date);

  return (
    <>
      <div className="mx-3 mt-3 flex items-center gap-3 rounded-xl border border-yellow-500/60 bg-yellow-400/15 px-4 py-2">
        <AlertTriangle size={15} className="shrink-0 text-yellow-600" strokeWidth={2.5} />

        <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] font-semibold text-yellow-700 dark:text-yellow-400">
          {/* Plan name */}
          <span className="flex items-center gap-1">
            <Crown size={11} className="shrink-0" />
            {planName} plan
          </span>

          {/* Expiry date */}
          {expiredDate && (
            <span className="flex items-center gap-1 font-medium opacity-90">
              <CalendarX2 size={11} className="shrink-0" />
              Expired: {expiredDate}
            </span>
          )}

          {/* Current state */}
          <span className="opacity-80">→ now on Free</span>

          {/* CTA */}
          <button
            type="button"
            onClick={() => setUpgradeOpen(true)}
            className="font-bold underline underline-offset-2 transition-opacity hover:opacity-70"
          >
            Top up to restore →
          </button>
        </div>

        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-md p-1 text-yellow-600 transition-colors hover:bg-yellow-400/20"
        >
          <X size={14} />
        </button>
      </div>

      <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
};
