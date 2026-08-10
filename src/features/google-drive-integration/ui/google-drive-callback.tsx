"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Cloud, XCircle } from "lucide-react";
import { Button } from "@/shared/ui";
import { useTranslations } from 'next-intl'

interface GoogleDriveCallbackProps {
  status: "success" | "error";
}

export const GoogleDriveCallback = ({ status }: GoogleDriveCallbackProps) => {
  const t = useTranslations('features.oauthCallback')
  const [closeFailed, setCloseFailed] = useState(false);
  const isSuccess = status === "success";

  useEffect(() => {
    try {
      window.opener?.postMessage(
        {
          source: "ucode-oauth",
          provider: "google-drive",
          status,
        },
        window.location.origin,
      );
    } catch {
      // The workspace may have been closed while OAuth was in progress.
    }

    // On success, auto-close the popup once the opener has been notified so the
    // flow ends cleanly (the opener shows a toast and refetches resources) —
    // matching the GitHub/Bitbucket behaviour. On error we keep the window open
    // so the user can read what went wrong.
    if (!isSuccess) return;
    const timer = setTimeout(() => {
      window.close();
      setTimeout(() => setCloseFailed(true), 200);
    }, 400);
    return () => clearTimeout(timer);
  }, [status, isSuccess]);

  const handleClose = () => {
    window.close();
    setTimeout(() => setCloseFailed(true), 200);
  };

  return (
    <div className="bg-bg-main flex min-h-screen items-center justify-center p-4">
      <div className="bg-bg-card border-border-subtle w-full max-w-md space-y-5 rounded-2xl border p-8 text-center shadow-sm">
        <div className="flex justify-center">
          <div className="relative">
            <Cloud className="text-text-main h-14 w-14" />
            {isSuccess ? (
              <CheckCircle2 className="bg-bg-card absolute -right-1 -bottom-1 h-6 w-6 rounded-full text-green-500" />
            ) : (
              <XCircle className="bg-bg-card text-destructive absolute -right-1 -bottom-1 h-6 w-6 rounded-full" />
            )}
          </div>
        </div>
        <div>
          <h1 className="text-text-main mb-2 text-xl font-bold">
            {isSuccess
              ? "Google Drive connected!"
              : "Google Drive connection failed"}
          </h1>
          <p className="text-text-muted text-sm">
            {isSuccess
              ? "Your Google Drive account is now connected."
              : "Google Drive authorization was not completed. Please return to the integrations page and try again."}
          </p>
        </div>
        <Button
          onClick={handleClose}
          className="bg-primary hover:bg-primary/90 w-full rounded-xl text-white"
        >
          {t('closeWindow')}
        </Button>
        {closeFailed && (
          <p className="text-text-muted text-xs">
            {t('safelyClose')}
          </p>
        )}
      </div>
    </div>
  );
};
