"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Link } from "@/shared/lib/i18n";
import { useIpakPaymentStatus } from "@/entities/billing";

// Ipak Yo'li redirects the customer here after a Visa/Mastercard hosted-page
// payment. The balance is credited server-side by the bank callback + reconcile
// cron regardless of this page; here we just poll the transfer status (stashed in
// sessionStorage before the redirect) to give immediate feedback and refresh the
// balance queries.
export default function IpakTopUpReturnPage() {
  const queryClient = useQueryClient();
  const [transferId, setTransferId] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setTransferId(window.sessionStorage.getItem("ipak_transfer_id"));
  }, []);

  const { data, isError } = useIpakPaymentStatus(transferId, !settled);
  const status = data?.status;

  useEffect(() => {
    if (status !== "accepted" && status !== "cancelled") return;
    setSettled(true);
    if (status === "accepted") {
      queryClient.invalidateQueries({ queryKey: ["billing", "company-project"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "transactions"] });
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("ipak_transfer_id");
      }
    }
  }, [status, queryClient]);

  const accepted = status === "accepted";
  const failed = status === "cancelled" || isError;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="border-border-subtle bg-bg-card w-full max-w-md rounded-2xl border p-8 text-center">
        {accepted ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 size={28} />
            </div>
            <h1 className="text-text-main text-[17px] font-semibold">
              Payment successful
            </h1>
            <p className="text-text-muted mt-2 text-[13px] leading-relaxed">
              Your balance has been topped up.
            </p>
          </>
        ) : failed ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
              <XCircle size={28} />
            </div>
            <h1 className="text-text-main text-[17px] font-semibold">
              Payment not completed
            </h1>
            <p className="text-text-muted mt-2 text-[13px] leading-relaxed">
              The payment was cancelled or failed. No funds were added. You can
              try again from the billing page.
            </p>
          </>
        ) : (
          <>
            <div className="bg-primary/10 text-primary mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
              <Loader2 size={28} className="animate-spin" />
            </div>
            <h1 className="text-text-main text-[17px] font-semibold">
              Confirming your payment…
            </h1>
            <p className="text-text-muted mt-2 text-[13px] leading-relaxed">
              {transferId
                ? "This can take a few seconds."
                : "If your balance is not updated shortly, please refresh this page."}
            </p>
          </>
        )}

        <Link
          href="/dashboard"
          className="bg-primary hover:bg-primary/90 mt-6 inline-flex h-10 items-center justify-center rounded-lg px-5 text-[13px] font-semibold text-white shadow-sm"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
