"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Faithful React/Tailwind port of the Claude Design "PhoneShell" (phone-frame.jsx,
// the frame used by Voyagra Dark.html): a realistic titanium iPhone bezel with
// side buttons, a camera island and an iOS status bar. Recreated pixel-for-pixel
// from the prototype's inline styles rather than copied structurally.

// Screen content area (the prototype's defaults), plus the rail + bezel thickness.
const SCREEN_W = 384;
const SCREEN_H = 812;
const RAIL = 4;
const BEZEL = 8;
const FRAME_W = SCREEN_W + 2 * (RAIL + BEZEL); // 418
const FRAME_H = SCREEN_H + 2 * (RAIL + BEZEL); // 846

// Status bar height — also the safe-area we reserve at the top of the screen so
// an arbitrary previewed site never renders under the camera island / clock.
const STATUS_BAR_H = 50;

const STATUS_COLOR = "#ECECEF";

function StatusBar() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: STATUS_BAR_H,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 30px 0",
        pointerEvents: "none",
        fontFamily: '-apple-system,"SF Pro",system-ui',
      }}
    >
      <span
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: STATUS_COLOR,
          letterSpacing: 0.2,
        }}
      >
        9:41
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {/* Cellular */}
        <svg width="18" height="11" viewBox="0 0 18 11" aria-hidden="true">
          <rect x="0" y="6.5" width="3" height="4.5" rx="0.7" fill={STATUS_COLOR} />
          <rect x="4.5" y="4.3" width="3" height="6.7" rx="0.7" fill={STATUS_COLOR} />
          <rect x="9" y="2" width="3" height="9" rx="0.7" fill={STATUS_COLOR} />
          <rect x="13.5" y="0" width="3" height="11" rx="0.7" fill={STATUS_COLOR} />
        </svg>
        {/* Wi-Fi */}
        <svg width="16" height="11" viewBox="0 0 16 11" aria-hidden="true">
          <path
            d="M8 2.8c2.1 0 4 .8 5.4 2.2l1-1A9 9 0 0 0 8 1.2 9 9 0 0 0 1.6 4l1 1A7.5 7.5 0 0 1 8 2.8Z"
            fill={STATUS_COLOR}
          />
          <path
            d="M8 6c1.2 0 2.3.5 3.1 1.3l1-1A6 6 0 0 0 8 4.5 6 6 0 0 0 3.9 6.3l1 1A4.4 4.4 0 0 1 8 6Z"
            fill={STATUS_COLOR}
          />
          <circle cx="8" cy="9.4" r="1.4" fill={STATUS_COLOR} />
        </svg>
        {/* Battery */}
        <svg width="25" height="12" viewBox="0 0 25 12" aria-hidden="true">
          <rect
            x="0.5"
            y="0.5"
            width="21"
            height="11"
            rx="3"
            stroke={STATUS_COLOR}
            strokeOpacity="0.4"
            fill="none"
          />
          <rect x="2" y="2" width="18" height="8" rx="1.8" fill={STATUS_COLOR} />
          <path
            d="M23 4v4c.7-.3 1.3-1.1 1.3-2S23.7 4.3 23 4Z"
            fill={STATUS_COLOR}
            fillOpacity="0.5"
          />
        </svg>
      </div>
    </div>
  );
}

function CameraIsland() {
  return (
    <div
      style={{
        position: "absolute",
        top: 14,
        left: "50%",
        transform: "translateX(-50%)",
        width: 118,
        height: 34,
        borderRadius: 18,
        background: "#000",
        boxShadow: "inset 0 0 1px rgba(255,255,255,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingRight: 8,
        zIndex: 40,
      }}
    >
      {/* Front camera lens, seated near the right end of the island */}
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#040406",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 0 2px rgba(255,255,255,0.12)",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 30%, #2a3f6b, #0a1024 70%)",
            boxShadow: "0 0 2px rgba(80,120,220,0.6)",
          }}
        />
      </div>
    </div>
  );
}

function SideBtn({
  side,
  top,
  h,
}: {
  side: "left" | "right";
  top: number;
  h: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        [side]: -2.5,
        top,
        width: 4.5,
        height: h,
        borderRadius: 3,
        background:
          "linear-gradient(90deg,#2e3542 0%,#7b8596 45%,#97a1b2 55%,#2e3542 100%)",
        boxShadow:
          side === "left"
            ? "-1px 0 2px rgba(0,0,0,0.4)"
            : "1px 0 2px rgba(0,0,0,0.4)",
      }}
    />
  );
}

interface PhoneShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * Titanium iPhone frame. Renders at the prototype's native pixel size and
 * scales down (preserving every proportion — buttons, camera, radii) to fit
 * the available space via a ResizeObserver.
 */
export function PhoneShell({ children, className }: PhoneShellProps) {
  const fitRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      // Fill the available space (grow or shrink) using the smaller ratio so
      // the frame always fits both dimensions — never overflows, never scrolls.
      setScale(Math.min(width / FRAME_W, height / FRAME_H));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={fitRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          width: FRAME_W,
          height: FRAME_H,
          flex: "0 0 auto",
          transform: `scale(${scale})`,
          transformOrigin: "center",
        }}
      >
        {/* Titanium rail */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 58,
            background:
              "linear-gradient(145deg,#39414f 0%,#272d39 13%,#bcc6d6 31%,#69737f 47%,#2e3542 61%,#97a1b2 80%,#363d4b 100%)",
            boxShadow: "0 2px 4px rgba(200,215,235,0.22) inset",
          }}
        />
        {/* Side buttons */}
        <SideBtn side="left" top={150} h={26} />
        <SideBtn side="left" top={206} h={54} />
        <SideBtn side="left" top={272} h={54} />
        <SideBtn side="right" top={232} h={96} />
        {/* Black bezel */}
        <div
          style={{
            position: "absolute",
            inset: RAIL,
            borderRadius: 54,
            background: "#08080a",
          }}
        />
        {/* Screen */}
        <div
          style={{
            position: "absolute",
            inset: RAIL + BEZEL,
            borderRadius: 46,
            overflow: "hidden",
            background: "#141416",
          }}
        >
          {/* Screen content — reserve the status-bar height so the previewed
              site stays clear of the camera island / clock. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              paddingTop: STATUS_BAR_H,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {children}
          </div>
          <CameraIsland />
          <StatusBar />
        </div>
      </div>
    </div>
  );
}
