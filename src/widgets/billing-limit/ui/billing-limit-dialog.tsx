"use client";

import { useState } from "react";
import { CreditCard, Ban } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "@/shared/ui";
import { useBillingLimitStore } from "@/entities/billing";
import { UpgradePlanDialog } from "@/widgets/sidebar/ui/components/upgrade-plan-dialog";
import { getLimitCopy, isTokenLimitCode } from "../lib/copy";

const formatNumber = (n?: number) =>
  typeof n === "number" ? n.toLocaleString() : "—";

/**
 * Global popup for any billing limit (HTTP 402 / SSE payment_required).
 * Mounted once at the app root and driven by useBillingLimitStore. The
 * "Upgrade plan" button opens the shared UpgradePlanDialog.
 */
export const BillingLimitDialog = () => {
  const open = useBillingLimitStore((s) => s.open);
  const data = useBillingLimitStore((s) => s.data);
  const close = useBillingLimitStore((s) => s.close);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const code = data?.code;
  const copy = getLimitCopy(code);
  const isTokenLimit = isTokenLimitCode(code);
  const Icon = isTokenLimit ? Ban : CreditCard;

  return (
    <>
      <Dialog open={open && !!data} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-md gap-0 rounded-2xl p-0">
          <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-2 text-center">
            <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
              <Icon className="text-primary h-7 w-7" />
            </div>
            <DialogHeader className="items-center text-center sm:text-center">
              <DialogTitle className="text-text-main text-lg">
                {copy?.title}
              </DialogTitle>
              <DialogDescription className="text-text-muted mt-1 text-[13px] leading-relaxed">
                {copy?.description}
              </DialogDescription>
            </DialogHeader>

            {isTokenLimit && (
              <div className="bg-bg-sidebar border-border-subtle mt-1 w-full rounded-xl border p-3 text-left">
                <div className="flex items-center justify-between py-1 text-[12px]">
                  <span className="text-text-muted">Daily tokens</span>
                  <span className="text-text-main font-mono font-semibold">
                    {formatNumber(data?.day_used)} /{" "}
                    {formatNumber(data?.day_limit)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 text-[12px]">
                  <span className="text-text-muted">Monthly tokens</span>
                  <span className="text-text-main font-mono font-semibold">
                    {formatNumber(data?.month_used)} /{" "}
                    {formatNumber(data?.month_limit)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row justify-center gap-3 px-6 pt-4 pb-6 sm:justify-center">
            <Button
              variant="outline"
              className="border-border-subtle h-10 flex-1 rounded-lg"
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 h-10 flex-1 rounded-lg text-white"
              onClick={() => {
                close();
                setUpgradeOpen(true);
              }}
            >
              Upgrade plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
};
