"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/shared/ui";

export const MetaAdsCallback = () => {
  const searchParams = useSearchParams();
  const [closeFailed, setCloseFailed] = useState(false);

  const facebook = searchParams.get("facebook");
  const success = facebook === "success";
  const reason = searchParams.get("reason");
  const detail = searchParams.get("detail");

  useEffect(() => {
    try {
      window.opener?.postMessage(
        {
          source: "facebook-oauth",
          success,
          reason,
          detail,
        },
        window.location.origin,
      );
    } catch {
      // The opener may have been closed while Meta OAuth was in progress.
    }

    if (!success) return;
    const timer = setTimeout(() => {
      window.close();
      setTimeout(() => setCloseFailed(true), 200);
    }, 400);
    return () => clearTimeout(timer);
  }, [detail, reason, success]);

  const handleClose = () => {
    window.close();
    setTimeout(() => setCloseFailed(true), 200);
  };

  return (
    <div className="bg-bg-main flex min-h-screen items-center justify-center p-4">
      <div className="bg-bg-card border-border-subtle w-full max-w-md space-y-5 rounded-2xl border p-8 text-center shadow-sm">
        <div className="flex justify-center">
          <div className="relative">
            <Image src="/meta.svg" alt="" width={56} height={56} />
            {success ? (
              <CheckCircle2 className="bg-bg-card absolute -right-1 -bottom-1 h-6 w-6 rounded-full text-green-500" />
            ) : (
              <XCircle className="bg-bg-card text-destructive absolute -right-1 -bottom-1 h-6 w-6 rounded-full" />
            )}
          </div>
        </div>
        <div>
          <h1 className="text-text-main mb-2 text-xl font-bold">
            {success ? "Meta connected!" : "Meta connection failed"}
          </h1>
          <p className="text-text-muted text-sm">
            {success
              ? "Your Meta account is now connected."
              : detail ||
                "Meta authorization was not completed. Please return to the integrations page and try again."}
          </p>
        </div>
        <Button
          onClick={handleClose}
          className="bg-primary hover:bg-primary/90 w-full rounded-xl text-white"
        >
          Close window
        </Button>
        {closeFailed && (
          <p className="text-text-muted text-xs">
            You can safely close this tab and return to the app.
          </p>
        )}
      </div>
    </div>
  );
};
