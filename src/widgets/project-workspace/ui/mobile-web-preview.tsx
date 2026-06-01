"use client";

import { useMemo } from "react";
import {
  Apple,
  Play,
  Smartphone,
  Lightbulb,
  Rocket,
  X,
  Link2Off,
} from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";

interface MobilePreviewPanelProps {
  /** Hosted URL to encode in the QR code. Empty until the app is published. */
  shareUrl?: string;
  /** Fired when the Publish button is clicked. */
  onPublish?: () => void;
  /** Fired when the close (X) button is clicked. */
  onClose?: () => void;
  className?: string;
}

const QR_SIZE = 200;

const buildQrUrl = (value: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${QR_SIZE}x${QR_SIZE}&margin=0&data=${encodeURIComponent(
    value,
  )}`;

/**
 * The "Preview on your phone" side panel shown next to the mobile preview frame.
 * Purely presentational — the actual web app is rendered by ProjectPreviewViewer,
 * which owns the local build, type auto-detection, and error handling. This panel
 * only adds the QR / Expo Go instructions and the publish call-to-action.
 */
export const MobilePreviewPanel = ({
  shareUrl,
  onPublish,
  onClose,
  className,
}: MobilePreviewPanelProps) => {
  const qrUrl = useMemo(
    () => (shareUrl ? buildQrUrl(shareUrl) : null),
    [shareUrl],
  );

  return (
    <div
      className={cn(
        "bg-bg-card border-border-subtle relative flex w-[340px] shrink-0 flex-col overflow-y-auto rounded-2xl border p-6 shadow-sm",
        className,
      )}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-text-muted hover:bg-hover-bg hover:text-text-main absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      )}

      {/* Header */}
      <div className="mb-2 flex items-center gap-2.5">
        <Smartphone className="text-text-main h-5 w-5" />
        <h2 className="text-text-main text-lg font-semibold">
          Preview on your phone
        </h2>
      </div>
      <p className="text-text-muted mb-6 text-sm leading-relaxed">
        Test on a mobile device to experience touch gestures and native
        features.
      </p>

      {/* Step 1 — Download Expo Go */}
      <div className="mb-6 flex gap-3">
        <span className="text-text-muted mt-0.5 text-sm font-semibold tabular-nums">
          1
        </span>
        <div className="flex-1">
          <p className="text-text-main text-sm font-medium">Download Expo Go</p>
          <p className="text-text-muted mt-1 text-sm leading-relaxed">
            A free app that lets you run your project instantly.
          </p>
          <div className="mt-3 flex gap-2">
            <a
              href="https://apps.apple.com/app/expo-go/id982107779"
              target="_blank"
              rel="noopener noreferrer"
              className="border-border-subtle bg-bg-sidebar text-text-main hover:border-primary/40 hover:bg-primary/5 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <Apple size={14} />
              iOS
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=host.exp.exponent"
              target="_blank"
              rel="noopener noreferrer"
              className="border-border-subtle bg-bg-sidebar text-text-main hover:border-primary/40 hover:bg-primary/5 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <Play size={14} />
              Android
            </a>
          </div>
        </div>
      </div>

      {/* Step 2 — Scan the QR code */}
      <div className="mb-6 flex gap-3">
        <span className="text-text-muted mt-0.5 text-sm font-semibold tabular-nums">
          2
        </span>
        <div className="flex-1">
          <p className="text-text-main text-sm font-medium">Scan the QR code</p>
          <p className="text-text-muted mt-1 text-sm leading-relaxed">
            {qrUrl
              ? "Use your camera to scan the code and launch Expo Go."
              : "Publish your app to generate a shareable preview link and QR code."}
          </p>
          <div className="mt-3 flex justify-center">
            {qrUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qrUrl}
                alt="Preview QR code"
                width={QR_SIZE}
                height={QR_SIZE}
                className="rounded-lg"
              />
            ) : (
              <div
                className="bg-bg-sidebar text-text-muted flex flex-col items-center justify-center gap-2 rounded-lg text-center text-xs"
                style={{ width: QR_SIZE, height: QR_SIZE }}
              >
                <Link2Off className="h-5 w-5 opacity-50" />
                Not published yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="border-border-subtle bg-bg-sidebar/50 text-text-muted mb-6 flex gap-2.5 rounded-xl border p-3 text-sm leading-relaxed">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Shake your device to open Expo Go's menu, then tap Reload to see your
          changes.
        </span>
      </div>

      {/* Publish footer */}
      <div className="bg-primary/5 border-primary/15 mt-auto rounded-xl border p-4">
        <p className="text-text-main text-sm font-medium">
          Ready to publish to App Store?
        </p>
        <p className="text-text-muted mt-1 text-sm leading-relaxed">
          Go live with your app and landing page, then submit to App Store.
        </p>
        <button
          type="button"
          onClick={onPublish}
          className="bg-primary hover:bg-primary/90 mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Rocket size={14} />
          Publish
        </button>
      </div>
    </div>
  );
};
