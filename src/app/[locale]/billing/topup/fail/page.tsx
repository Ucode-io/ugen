"use client";

import { useEffect } from "react";
import { XCircle } from "lucide-react";
import { Link } from "@/shared/lib/i18n";

// Ipak Yo'li redirects here when a Visa/Mastercard payment fails or is abandoned.
// No balance change happens; the pending transaction is closed server-side by the
// reconcile cron once the bank marks the transfer failed/expired.
export default function IpakTopUpFailPage() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("ipak_transfer_id");
    }
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="border-border-subtle bg-bg-card w-full max-w-md rounded-2xl border p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
          <XCircle size={28} />
        </div>
        <h1 className="text-text-main text-[17px] font-semibold">
          Payment not completed
        </h1>
        <p className="text-text-muted mt-2 text-[13px] leading-relaxed">
          The payment was cancelled or could not be processed. No funds were
          added to your balance. You can try again from the billing page.
        </p>
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
