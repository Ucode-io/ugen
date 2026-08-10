"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useFreePlan } from "@/entities/billing";
import { cn } from "@/shared/lib/utils/cn";
import { UpgradePlanDialog } from "./upgrade-plan-dialog";
import { useTranslations } from 'next-intl'

interface UpgradePlanButtonProps {
  /**
   * "solid" — prominent pill for dashboards / page headers.
   * "compact" — smaller pill that fits dense toolbars (e.g. project header).
   */
  variant?: "solid" | "compact";
  className?: string;
  /** Override the visible label (defaults per variant). */
  label?: string;
}

/**
 * Self-contained "Upgrade plan" CTA. Renders only while the current project is
 * on the free (ugen) plan, and owns its own dialog so it can be dropped into any
 * surface and let the user upgrade at any moment.
 */
export const UpgradePlanButton = ({
  variant = "solid",
  className,
  label,
}: UpgradePlanButtonProps) => {
  const t = useTranslations('widgets.sidebar')
  const [open, setOpen] = useState(false);
  const { canUpgrade } = useFreePlan();

  if (!canUpgrade) return null;

  const text = label ?? (variant === "compact" ? "Upgrade" : "Upgrade plan");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('upgradePlan')}
        title={t('freePlanHint')}
        className={cn(
          "group focus-visible:ring-primary/40 relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-full bg-linear-to-r from-primary to-[#8b5cf6] font-semibold text-white shadow-sm transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 active:scale-[0.98]",
          variant === "solid" ? "px-4 py-2 text-sm" : "h-7 px-3 text-xs",
          className,
        )}
      >
        {/* Sweeping sheen on hover */}
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
        <Sparkles
          size={variant === "compact" ? 14 : 16}
          className="relative shrink-0"
        />
        <span className="relative whitespace-nowrap">{text}</span>
      </button>
      <UpgradePlanDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
