"use client";

import { useMemo } from "react";
import { Smartphone, Rocket, X, Link2Off } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";

interface MobilePreviewPanelProps {
  /** Project URL to encode in the QR code. Empty until the app is published. */
  shareUrl?: string;
  /** Fired when the Publish button is clicked. */
  onPublish?: () => void;
  /** Fired when the close (X) button is clicked. */
  onClose?: () => void;
  className?: string;
}

const QR_SIZE = 200;
// Render at 3× for retina-crisp edges (displayed at QR_SIZE). Brand-blue modules
// on white with a small quiet zone look on-brand and still scan reliably.
const QR_RENDER = QR_SIZE * 3;
const QR_COLOR = "1d4ed8"; // blue-700 — strong contrast on white

const buildQrUrl = (value: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${QR_RENDER}x${QR_RENDER}&margin=0&qzone=1&ecc=M&color=${QR_COLOR}&bgcolor=ffffff&format=png&data=${encodeURIComponent(
    value,
  )}`;

/**
 * The "Preview on your phone" side panel shown next to the mobile preview frame.
 * Minimal layout: heading, a QR code wired to the project URL, and a publish
 * call-to-action at the bottom. The actual web app is rendered by
 * ProjectPreviewViewer; this panel is purely presentational.
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
        "bg-bg-card border-border-subtle relative flex w-85 shrink-0 flex-col overflow-y-auto rounded-2xl border p-6 shadow-sm",
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
      <div className="mb-6 flex items-center gap-2.5">
        <Smartphone className="text-text-main h-5 w-5" />
        <h2 className="text-text-main text-lg font-semibold">
          Preview on your phone
        </h2>
      </div>

      {/* QR code (encodes the project URL) */}
      <div className="mb-6 flex justify-center">
        {qrUrl ? (
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open published app"
            title={shareUrl}
            className="group rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition-transform duration-200 hover:scale-[1.02] hover:shadow-md"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="QR code for the published app"
              width={QR_SIZE}
              height={QR_SIZE}
              className="block rounded-lg"
            />
          </a>
        ) : (
          <div
            className="border-border-subtle bg-bg-sidebar/60 text-text-muted flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-center text-xs"
            style={{ width: QR_SIZE + 24, height: QR_SIZE + 24 }}
          >
            <Link2Off className="h-5 w-5 opacity-50" />
            Not published yet
          </div>
        )}
      </div>

      {/* Publish footer */}
      <div className="bg-primary/5 border-primary/15 rounded-xl border p-4">
        <button
          type="button"
          onClick={onPublish}
          className="bg-primary hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Rocket size={14} />
          Publish
        </button>
      </div>
    </div>
  );
};
