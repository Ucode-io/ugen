"use client";

import { useEffect, useRef } from "react";
import type QRCodeStyling from "qr-code-styling";
import { Smartphone, Rocket, X, Link2Off, Download } from "lucide-react";
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
const QR_DARK = "#0a0a0a"; // near-black modules for crisp, high-contrast scanning

/**
 * Styled QR built with `qr-code-styling`: black, rounded modules + rounded finder
 * corners, rendered as a crisp SVG. The library draws into a div on the client;
 * it's loaded lazily (it touches the DOM) so it never runs during SSR.
 */
function StyledQr({
  value,
  size,
  instanceRef,
}: {
  value: string;
  size: number;
  /** Receives the live QR instance so the parent can trigger a download. */
  instanceRef?: { current: QRCodeStyling | null };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { default: QRCodeStylingCtor } = await import("qr-code-styling");
      if (cancelled || !containerRef.current) return;
      if (!qrRef.current) {
        qrRef.current = new QRCodeStylingCtor({
          width: size,
          height: size,
          type: "svg",
          margin: 0, // no built-in quiet zone — the card's padding is the quiet zone
          data: value,
          qrOptions: { errorCorrectionLevel: "M" },
          dotsOptions: { color: QR_DARK, type: "rounded" },
          cornersSquareOptions: { color: QR_DARK, type: "extra-rounded" },
          cornersDotOptions: { color: QR_DARK, type: "dot" },
          backgroundOptions: { color: "transparent" },
        });
      } else {
        qrRef.current.update({ data: value });
      }
      if (containerRef.current.childElementCount === 0) {
        qrRef.current.append(containerRef.current);
      }
      if (instanceRef) instanceRef.current = qrRef.current;
    })();
    return () => {
      cancelled = true;
    };
  }, [value, size, instanceRef]);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size }}
      className="[&>svg]:block [&>svg]:h-full [&>svg]:w-full"
    />
  );
}

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
  // Holds the live QR instance so the Download button can export it as a PNG.
  const qrInstanceRef = useRef<QRCodeStyling | null>(null);

  const handleDownload = () => {
    void qrInstanceRef.current?.download({
      name: "app-qr",
      extension: "png",
    });
  };

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
      <div className="mb-2 flex items-center gap-2.5">
        <Smartphone className="text-text-main h-5 w-5" />
        <h2 className="text-text-main text-lg font-semibold">
          Preview on your phone
        </h2>
      </div>
      <p className="text-text-muted mb-6 text-sm leading-relaxed">
        Publish your app, then scan the QR code with your phone&apos;s camera to
        open the live web app on your device — no install needed.
      </p>

      {/* QR code (encodes the project URL) */}
      <div className="mb-6 flex flex-col items-center gap-3">
        {shareUrl ? (
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open published app"
            title={shareUrl}
            className="group hover:ring-primary/30 rounded-xl bg-white p-1 shadow-md ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <StyledQr
              value={shareUrl}
              size={QR_SIZE}
              instanceRef={qrInstanceRef}
            />
          </a>
        ) : (
          <div
            className="border-border-subtle bg-bg-sidebar/60 text-text-muted flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center text-xs"
            style={{ width: QR_SIZE + 8, height: QR_SIZE + 8 }}
          >
            <Link2Off className="h-5 w-5 opacity-50" />
            Not published yet
          </div>
        )}
        <p className="text-text-muted max-w-60 text-center text-xs leading-relaxed">
          {shareUrl
            ? "Point your phone's camera at the code — it opens the published app in your browser."
            : "Publish your app to activate this QR code for scanning."}
        </p>
      </div>

      {/* Publish + Download actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleDownload}
          disabled={!shareUrl}
          className="border-primary/40 text-text-main hover:bg-primary/5 hover:border-primary/60 flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={14} />
          Download
        </button>
        <button
          type="button"
          onClick={onPublish}
          className="bg-primary hover:bg-primary/90 flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-transparent px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Rocket size={14} />
          Publish
        </button>
      </div>
    </div>
  );
};
