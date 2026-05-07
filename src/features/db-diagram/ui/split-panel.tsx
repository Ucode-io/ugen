"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";

interface Props {
  ratio: number;
  onRatioChange: (ratio: number) => void;
  left: React.ReactNode;
  right: React.ReactNode;
  minRatio?: number;
  maxRatio?: number;
}

export const SplitPanel: React.FC<Props> = ({
  ratio,
  onRatioChange,
  left,
  right,
  minRatio = 0.18,
  maxRatio = 0.6,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startRatio: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startRatio: ratio };
      setResizing(true);
    },
    [ratio],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag || !container) return;
      const w = container.clientWidth;
      if (w === 0) return;
      const next = drag.startRatio + (e.clientX - drag.startX) / w;
      onRatioChange(Math.min(maxRatio, Math.max(minRatio, next)));
    };
    const onUp = () => {
      dragRef.current = null;
      setResizing(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onRatioChange, minRatio, maxRatio]);

  const leftPct = `${ratio * 100}%`;

  return (
    <div
      ref={containerRef}
      className={cn("flex h-full w-full overflow-hidden", resizing && "select-none")}
    >
      <div className="min-h-0 overflow-hidden" style={{ width: leftPct }}>
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={handleMouseDown}
        onDoubleClick={() => onRatioChange(0.35)}
        className={cn(
          "group relative flex w-1 shrink-0 cursor-col-resize items-center justify-center transition-colors",
          "before:bg-border-subtle before:absolute before:inset-y-0 before:left-0 before:w-px",
          resizing
            ? "before:bg-primary"
            : "hover:before:bg-primary/60",
        )}
      >
        <span
          className={cn(
            "bg-bg-card border-border-subtle flex h-7 w-3 items-center justify-center rounded-full border opacity-0 shadow-sm transition-opacity",
            "group-hover:opacity-100",
            resizing && "opacity-100",
          )}
        >
          <GripVertical size={10} className="text-text-muted" />
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">{right}</div>
    </div>
  );
};
