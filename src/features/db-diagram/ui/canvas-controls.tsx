"use client";

import React from "react";
import { Map, Maximize2, Minus, Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import { useDiagramStore } from "../model/store";

interface Props {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

const IconBtn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
> = ({ className, active, children, ...props }) => (
  <button
    {...props}
    className={cn(
      "flex h-7 w-7 items-center justify-center rounded transition-colors",
      active
        ? "bg-primary/10 text-primary"
        : "text-text-muted hover:text-text-main hover:bg-hover-bg",
      className,
    )}
  >
    {children}
  </button>
);

export const CanvasControls: React.FC<Props> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
}) => {
  const showMinimap = useDiagramStore((s) => s.showMinimap);
  const toggleMinimap = useDiagramStore((s) => s.toggleMinimap);

  return (
    <div className="bg-bg-card/95 border-border-subtle pointer-events-auto flex items-center gap-0.5 rounded-md border p-0.5 shadow-sm backdrop-blur">
      <IconBtn onClick={onZoomOut} title="Zoom out">
        <Minus size={13} />
      </IconBtn>
      <span className="text-text-muted min-w-[42px] text-center font-mono text-[11px] tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <IconBtn onClick={onZoomIn} title="Zoom in">
        <Plus size={13} />
      </IconBtn>
      <span className="bg-border-subtle/70 mx-0.5 h-4 w-px" />
      <IconBtn onClick={onFit} title="Fit to screen">
        <Maximize2 size={12} />
      </IconBtn>
      <IconBtn
        onClick={toggleMinimap}
        title={showMinimap ? "Hide minimap" : "Show minimap"}
        active={showMinimap}
      >
        <Map size={12} />
      </IconBtn>
    </div>
  );
};
