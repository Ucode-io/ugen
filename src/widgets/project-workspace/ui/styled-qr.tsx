"use client";

import { useEffect, useRef } from "react";
import type QRCodeStyling from "qr-code-styling";

const QR_DARK = "#0a0a0a"; // near-black modules for crisp, high-contrast scanning

/**
 * Styled QR built with `qr-code-styling`: black, rounded modules + rounded finder
 * corners, rendered as a crisp SVG. The library draws into a div on the client;
 * it's loaded lazily (it touches the DOM) so it never runs during SSR.
 *
 * Shared by the webapp "preview on your phone" panel and the Capacitor mobile
 * "test on phone" panel — both encode the published microfrontend URL.
 */
export function StyledQr({
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
