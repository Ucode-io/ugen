"use client";

import { Sparkles } from "lucide-react";
import { useFreePlan } from "@/entities/billing";
import { cn } from "@/shared/lib/utils/cn";
import { useTranslations } from 'next-intl'

interface UpgradePlanCardProps {
  /** Opens the upgrade dialog. The card is presentational and owns no dialog. */
  onUpgrade: () => void;
  /** Spacing around the card (it renders nothing when not on the free plan). */
  className?: string;
}

const PERKS = ["More projects", "More builders", "Higher credit limit"];

/**
 * Compact "Upgrade plan" card for the sidebar. Renders only while the project is
 * on the free (ugen) plan and delegates opening the dialog to the parent, so the
 * sidebar can reuse its single UpgradePlanDialog instance.
 */
export const UpgradePlanCard = ({ onUpgrade, className }: UpgradePlanCardProps) => {
  const t = useTranslations('widgets.sidebar')
  const { canUpgrade } = useFreePlan();

  if (!canUpgrade) return null;

  return (
    <div
      className={cn(
        "border-primary/20 from-primary/10 relative overflow-hidden rounded-xl border bg-linear-to-br via-primary/5 to-transparent p-3",
        className,
      )}
    >
      {/* Decorative glow */}
      <div className="bg-primary/20 pointer-events-none absolute -top-8 -right-6 h-20 w-20 rounded-full blur-2xl" />

      <div className="relative">
        <div className="flex items-center gap-1.5">
          <span className="bg-primary/15 text-primary flex h-5 w-5 items-center justify-center rounded-md">
            <Sparkles size={12} />
          </span>
          <span className="text-text-main text-xs font-semibold">{t('freePlanLabel')}</span>
        </div>

        <p className="text-text-muted mt-1.5 text-[11px] leading-snug">
          {t('upgradeUnlock')}
        </p>

        <ul className="mt-2 space-y-1">
          {PERKS.map((perk) => (
            <li
              key={perk}
              className="text-text-muted flex items-center gap-1.5 text-[11px]"
            >
              <span className="bg-primary h-1 w-1 shrink-0 rounded-full" />
              {perk}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onUpgrade}
          className="group from-primary relative mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-linear-to-r to-[#8b5cf6] px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
        >
          {/* Sweeping sheen on hover */}
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
          <Sparkles size={13} className="relative shrink-0" />
          <span className="relative">{t('upgradePlan')}</span>
        </button>
      </div>
    </div>
  );
};
