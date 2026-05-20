"use client";

import { useState } from "react";
import { CreditCard, Ban } from "lucide-react";
import { Button } from "@/shared/ui";
import type { PaymentRequiredData } from "@/entities/billing";
import { cn } from "@/shared/lib/utils/cn";
import { UpgradePlanDialog } from "@/widgets/sidebar/ui/components/upgrade-plan-dialog";
import { LIMIT_COPY, isTokenLimitCode } from "../lib/copy";

interface BillingLimitStateProps {
  data: PaymentRequiredData;
  className?: string;
}

/**
 * Inline "limit reached" state, rendered in place of content when a GET query
 * fails with HTTP 402. Mirrors the copy of the global popup but stays embedded
 * in the view instead of interrupting with a modal. "Upgrade plan" opens the
 * shared UpgradePlanDialog.
 */
export const BillingLimitState = ({ data, className }: BillingLimitStateProps) => {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const copy = LIMIT_COPY[data.code];
  const isTokenLimit = isTokenLimitCode(data.code);
  const Icon = isTokenLimit ? Ban : CreditCard;

  return (
    <div
      className={cn(
        "flex h-full min-h-[320px] w-full flex-col items-center justify-center gap-4 p-8 text-center",
        className,
      )}
    >
      <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
        <Icon className="text-primary h-7 w-7" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-text-main text-lg font-bold">{copy?.title}</h3>
        <p className="text-text-muted mx-auto max-w-[360px] text-[13px] leading-relaxed">
          {copy?.description}
        </p>
      </div>
      <Button
        className="bg-primary hover:bg-primary/90 mt-2 h-10 rounded-lg px-6 text-white"
        onClick={() => setUpgradeOpen(true)}
      >
        Upgrade plan
      </Button>

      <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
};
