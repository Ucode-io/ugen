"use client";

import React from "react";
import { Key, Link2 } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import type { SchemaColumn } from "@/entities/database";
import {
  HEADER_HEIGHT,
  NODE_WIDTH,
  ROW_HEIGHT,
  shortenType,
  typePillClass,
} from "../lib/constants";

interface Props {
  label: string;
  slug: string;
  columns: SchemaColumn[];
  position: { x: number; y: number };
  highlighted?: boolean;
  dragging?: boolean;
  faded?: boolean;
  hoveredColumn?: string | null;
  highlightedColumns?: Set<string>;
  onMouseDown: (e: React.MouseEvent, slug: string) => void;
  onColumnEnter?: (column: string) => void;
  onColumnLeave?: () => void;
  onTableClick?: (slug: string) => void;
}

export const TableNode: React.FC<Props> = ({
  label,
  slug,
  columns,
  position,
  highlighted,
  dragging,
  faded,
  hoveredColumn,
  highlightedColumns,
  onMouseDown,
  onColumnEnter,
  onColumnLeave,
  onTableClick,
}) => {
  return (
    <div
      data-slug={slug}
      onMouseDown={(e) => onMouseDown(e, slug)}
      onClick={(e) => {
        // Click without drag → focus table (handled in parent via onMouseUp threshold)
        if (e.detail === 1) onTableClick?.(slug);
      }}
      className={cn(
        "border-border-subtle bg-bg-card absolute overflow-hidden rounded-lg border shadow-sm transition-[box-shadow,opacity,transform] duration-150",
        dragging
          ? "ring-primary/40 cursor-grabbing scale-[1.01] shadow-lg ring-2"
          : "cursor-grab",
        !dragging && highlighted && "ring-primary/40 shadow-md ring-1",
        !dragging && !highlighted && "hover:shadow-md",
        faded && "opacity-40",
      )}
      style={{
        width: NODE_WIDTH,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
    >
      <div
        className="bg-primary text-primary-foreground flex shrink-0 items-center gap-2 px-3"
        style={{ height: HEADER_HEIGHT }}
      >
        <span className="truncate text-[12.5px] font-semibold tracking-tight">
          {label}
        </span>
        <span className="truncate text-[10.5px] font-medium tracking-tight text-white/65">
          {slug}
        </span>
        <span className="bg-primary-foreground/15 ml-auto rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold text-white/85">
          {columns.length}
        </span>
      </div>

      <div onMouseLeave={onColumnLeave}>
        {columns.map((col, i) => {
          const isPK = col.constraints?.some((c) => c.label === "PK") ?? false;
          const isFK = col.constraints?.some((c) => c.label === "FK") ?? false;
          const isUnique =
            col.constraints?.some((c) => c.label === "UNIQUE") ?? false;
          const isNotNull = col.nullable === "NO";
          const isHovered = hoveredColumn === col.name;
          const isHl = highlightedColumns?.has(col.name) ?? false;

          return (
            <div
              key={col.id || `${slug}-${col.name || `col-${i}`}`}
              onMouseEnter={() => onColumnEnter?.(col.name)}
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                "border-border-subtle/60 group/row flex items-center gap-2 border-t px-3 transition-colors",
                i === 0 && "border-t-0",
                isPK && "bg-primary/[0.04]",
                isHovered && "bg-primary/10",
                isHl && !isHovered && "bg-primary/[0.07]",
              )}
              style={{ height: ROW_HEIGHT }}
              title={col.name}
            >
              <span className="flex w-3.5 shrink-0 items-center justify-center">
                {isPK ? (
                  <Key
                    size={11}
                    strokeWidth={2.4}
                    className="text-yellow-500 dark:text-yellow-400"
                  />
                ) : isFK ? (
                  <Link2
                    size={11}
                    strokeWidth={2.4}
                    className="text-blue-500 dark:text-blue-400"
                  />
                ) : (
                  <span className="bg-text-muted/30 h-1 w-1 rounded-full" />
                )}
              </span>

              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[11.5px]",
                  isPK
                    ? "text-text-main font-semibold"
                    : isFK
                      ? "text-text-main/90 font-medium"
                      : "text-text-main/85",
                )}
              >
                {col.name}
              </span>

              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-px font-mono text-[10px] tracking-tight",
                  typePillClass(col.type),
                )}
                title={col.type}
              >
                {shortenType(col.type)}
              </span>

              {isNotNull && (
                <span
                  className="shrink-0 rounded border border-rose-500/20 bg-rose-500/10 px-1 py-px text-[9px] font-bold tracking-wide text-rose-500 dark:text-rose-400"
                  title="NOT NULL"
                >
                  NN
                </span>
              )}
              {isUnique && !isPK && (
                <span
                  className="shrink-0 rounded border border-purple-500/20 bg-purple-500/10 px-1 py-px text-[9px] font-bold tracking-wide text-purple-500 dark:text-purple-400"
                  title="UNIQUE"
                >
                  UQ
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
