"use client";

import React, { useCallback, useMemo, useRef } from "react";
import { useDiagramStore } from "../model/store";
import { NODE_WIDTH, tableHeight } from "../lib/constants";
import type { DiagramTable } from "../model/types";

interface Props {
  tables: DiagramTable[];
  viewport: { width: number; height: number };
}

const MM_WIDTH = 200;
const MM_HEIGHT = 130;
const PADDING = 16;

export const Minimap: React.FC<Props> = ({ tables, viewport }) => {
  const positions = useDiagramStore((s) => s.positions);
  const zoom = useDiagramStore((s) => s.zoom);
  const pan = useDiagramStore((s) => s.pan);
  const setPan = useDiagramStore((s) => s.setPan);

  const svgRef = useRef<SVGSVGElement>(null);

  const bounds = useMemo(() => {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    tables.forEach((t) => {
      const p = positions[t.slug];
      if (!p) return;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + NODE_WIDTH);
      maxY = Math.max(maxY, p.y + tableHeight(t.columns.length));
    });
    if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    return { minX, minY, maxX, maxY };
  }, [tables, positions]);

  // Include viewport rectangle in bounds so it stays visible when panned
  // outside the table cluster.
  const viewportRectWorld = useMemo(() => {
    return {
      x: -pan.x / zoom,
      y: -pan.y / zoom,
      w: viewport.width / zoom,
      h: viewport.height / zoom,
    };
  }, [pan.x, pan.y, zoom, viewport.width, viewport.height]);

  const fullBounds = useMemo(() => {
    const minX = Math.min(bounds.minX, viewportRectWorld.x);
    const minY = Math.min(bounds.minY, viewportRectWorld.y);
    const maxX = Math.max(
      bounds.maxX,
      viewportRectWorld.x + viewportRectWorld.w,
    );
    const maxY = Math.max(
      bounds.maxY,
      viewportRectWorld.y + viewportRectWorld.h,
    );
    return { minX, minY, maxX, maxY };
  }, [bounds, viewportRectWorld]);

  const contentW = fullBounds.maxX - fullBounds.minX;
  const contentH = fullBounds.maxY - fullBounds.minY;
  const innerW = MM_WIDTH - PADDING * 2;
  const innerH = MM_HEIGHT - PADDING * 2;
  const scale =
    contentW > 0 && contentH > 0
      ? Math.min(innerW / contentW, innerH / contentH)
      : 1;

  const project = useCallback(
    (x: number, y: number) => ({
      x: PADDING + (x - fullBounds.minX) * scale,
      y: PADDING + (y - fullBounds.minY) * scale,
    }),
    [fullBounds.minX, fullBounds.minY, scale],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // World position under click
      const wx = (mx - PADDING) / scale + fullBounds.minX;
      const wy = (my - PADDING) / scale + fullBounds.minY;
      // Center viewport on this point
      setPan({
        x: viewport.width / 2 - wx * zoom,
        y: viewport.height / 2 - wy * zoom,
      });
    },
    [scale, fullBounds.minX, fullBounds.minY, viewport, zoom, setPan],
  );

  const vp = {
    ...project(viewportRectWorld.x, viewportRectWorld.y),
    w: viewportRectWorld.w * scale,
    h: viewportRectWorld.h * scale,
  };

  return (
    <svg
      ref={svgRef}
      width={MM_WIDTH}
      height={MM_HEIGHT}
      onClick={handleClick}
      className="bg-bg-card/95 border-border-subtle cursor-pointer rounded-md border shadow-sm backdrop-blur"
    >
      {tables.map((t, i) => {
        const p = positions[t.slug];
        if (!p) return null;
        const tl = project(p.x, p.y);
        return (
          <rect
            key={t.slug || `mm-${i}`}
            x={tl.x}
            y={tl.y}
            width={NODE_WIDTH * scale}
            height={tableHeight(t.columns.length) * scale}
            rx={1.5}
            className="fill-primary/40 stroke-primary/60"
            strokeWidth={0.6}
          />
        );
      })}
      <rect
        x={vp.x}
        y={vp.y}
        width={vp.w}
        height={vp.h}
        className="fill-primary/15 stroke-primary"
        strokeWidth={1.2}
        rx={2}
        pointerEvents="none"
      />
    </svg>
  );
};
