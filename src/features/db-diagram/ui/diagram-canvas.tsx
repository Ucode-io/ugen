"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCircle, Database, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import { TableNode } from "./table-node";
import { useDiagramStore } from "../model/store";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  NODE_WIDTH,
  rowYOffset,
  tableHeight,
} from "../lib/constants";
import { dagreLayout } from "../lib/auto-layout";
import type {
  DiagramRelation,
  DiagramTable,
} from "../model/types";
import { useTranslations } from 'next-intl'

export interface DiagramCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  autoLayout: () => void;
  exportRoot: () => HTMLElement | null;
}

interface Props {
  tables: DiagramTable[];
  relations: DiagramRelation[];
  isLoading: boolean;
  isError: boolean;
}

const ZOOM_STEP = 0.15;
const FIT_PADDING = 60;
const CLICK_THRESHOLD = 4; // px — distinguishes click from drag

interface EdgeProps {
  relation: DiagramRelation;
  positions: Record<string, { x: number; y: number }>;
  tables: DiagramTable[];
  highlighted: boolean;
  faded: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string | null) => void;
}

const Edge: React.FC<EdgeProps> = ({
  relation,
  positions,
  tables,
  highlighted,
  faded,
  onHover,
  onClick,
}) => {
  const from = positions[relation.from];
  const to = positions[relation.to];
  if (!from || !to) return null;

  const fromTable = tables.find((t) => t.slug === relation.from);
  const toTable = tables.find((t) => t.slug === relation.to);
  if (!fromTable || !toTable) return null;

  const fromColIdx = Math.max(
    0,
    fromTable.columns.findIndex((c) => c.name === relation.fromColumn),
  );
  const toColIdx = Math.max(
    0,
    toTable.columns.findIndex(
      (c) =>
        c.name === relation.toColumn ||
        c.constraints?.some((cc) => cc.label === "PK"),
    ),
  );

  const fromY = from.y + rowYOffset(fromColIdx);
  const toY = to.y + rowYOffset(toColIdx);

  const fromCenter = from.x + NODE_WIDTH / 2;
  const toCenter = to.x + NODE_WIDTH / 2;
  const fromRight = fromCenter < toCenter;

  const x1 = fromRight ? from.x + NODE_WIDTH : from.x;
  const x2 = fromRight ? to.x : to.x + NODE_WIDTH;
  const dx = Math.abs(x2 - x1);
  const curve = Math.min(180, Math.max(60, dx / 2));
  const cx1 = fromRight ? x1 + curve : x1 - curve;
  const cx2 = fromRight ? x2 - curve : x2 + curve;

  const path = `M ${x1} ${fromY} C ${cx1} ${fromY} ${cx2} ${toY} ${x2} ${toY}`;
  const labelX = (x1 + x2) / 2;
  const labelY = (fromY + toY) / 2 - 6;

  const opacity = faded ? 0.22 : 1;
  const stroke = highlighted
    ? "var(--color-primary)"
    : "currentColor";

  return (
    <g
      onMouseEnter={() => onHover(relation.id)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(relation.id);
      }}
      className={cn(
        "text-blue-500 dark:text-blue-400",
        highlighted && "text-primary cursor-pointer",
      )}
    >
      {/* Hit area */}
      <path
        d={path}
        stroke="transparent"
        strokeWidth={16}
        fill="none"
        style={{ pointerEvents: "stroke" }}
      />
      {/* Visible line */}
      <path
        d={path}
        stroke={stroke}
        strokeWidth={highlighted ? 2.2 : 1.8}
        strokeDasharray={highlighted ? "6 3" : "5 4"}
        fill="none"
        opacity={opacity}
        markerEnd={highlighted ? "url(#arrow-active)" : "url(#arrow)"}
      >
        {highlighted && (
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="-18"
            dur="0.6s"
            repeatCount="indefinite"
          />
        )}
      </path>
      {/* Source endpoint dot (one-side cardinality marker) */}
      <circle cx={x1} cy={fromY} r={4} fill={stroke} opacity={opacity} />
      {/* FK label */}
      {highlighted && (
        <g style={{ pointerEvents: "none" }}>
          <rect
            x={labelX - relation.fromColumn.length * 3.4 - 8}
            y={labelY - 9}
            rx={4}
            ry={4}
            width={relation.fromColumn.length * 6.8 + 16}
            height={16}
            fill="var(--color-bg-card)"
            stroke="var(--color-primary)"
            strokeOpacity={0.45}
            strokeWidth={1}
          />
          <text
            x={labelX}
            y={labelY + 2}
            textAnchor="middle"
            className="fill-primary font-mono"
            fontSize={10}
            fontWeight={600}
          >
            {relation.fromColumn}
          </text>
        </g>
      )}
    </g>
  );
};

export const DiagramCanvas = forwardRef<DiagramCanvasHandle, Props>(
  ({ tables, relations, isLoading, isError }, ref) => {
    const t = useTranslations('features.dbDiagram');
    const positions = useDiagramStore((s) => s.positions);
    const setPosition = useDiagramStore((s) => s.setPosition);
    const setPositions = useDiagramStore((s) => s.setPositions);
    const zoom = useDiagramStore((s) => s.zoom);
    const pan = useDiagramStore((s) => s.pan);
    const setZoom = useDiagramStore((s) => s.setZoom);
    const setPan = useDiagramStore((s) => s.setPan);
    const setViewport = useDiagramStore((s) => s.setViewport);
    const mode = useDiagramStore((s) => s.mode);
    const filter = useDiagramStore((s) => s.filter);
    const focusedTable = useDiagramStore((s) => s.focusedTable);
    const focusedRelation = useDiagramStore((s) => s.focusedRelation);
    const hoveredColumn = useDiagramStore((s) => s.hoveredColumn);
    const setFocusedTable = useDiagramStore((s) => s.setFocusedTable);
    const setFocusedRelation = useDiagramStore((s) => s.setFocusedRelation);
    const setHoveredColumn = useDiagramStore((s) => s.setHoveredColumn);
    const clearFocus = useDiagramStore((s) => s.clearFocus);

    const viewportRef = useRef<HTMLDivElement>(null);
    const exportRootRef = useRef<HTMLDivElement>(null);
    const [draggingSlug, setDraggingSlug] = useState<string | null>(null);
    const [hoveredRelation, setHoveredRelation] = useState<string | null>(null);
    const [hoveredTable, setHoveredTable] = useState<string | null>(null);
    const [panActive, setPanActive] = useState(false);
    const [autoFitDone, setAutoFitDone] = useState(false);
    const tableSignature = useMemo(
      () => tables.map((table) => table.slug).join("|"),
      [tables],
    );

    const dragNode = useRef<{
      slug: string;
      startX: number;
      startY: number;
      origX: number;
      origY: number;
      moved: boolean;
    } | null>(null);
    const dragPan = useRef<{
      startX: number;
      startY: number;
      origX: number;
      origY: number;
      moved: boolean;
    } | null>(null);
    // Last completed drag flag — read by node onClick (which fires after onMouseUp)
    const lastDragMoved = useRef(false);

    const fit = useCallback(() => {
      const viewport = viewportRef.current;
      if (!viewport || tables.length === 0) return;
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
      if (!isFinite(minX)) return;
      const w = viewport.clientWidth;
      const h = viewport.clientHeight;
      if (w === 0 || h === 0) return;
      const contentW = maxX - minX;
      const contentH = maxY - minY;
      const next = Math.min(
        MAX_ZOOM,
        Math.max(
          MIN_ZOOM,
          Math.min(
            (w - FIT_PADDING) / contentW,
            (h - FIT_PADDING) / contentH,
            1,
          ),
        ),
      );
      setViewport(
        {
          x: (w - contentW * next) / 2 - minX * next,
          y: (h - contentH * next) / 2 - minY * next,
        },
        next,
      );
    }, [tables, positions, setViewport]);

    // Auto-fit once positions are populated
    useEffect(() => {
      if (autoFitDone || tables.length === 0) return;
      if (Object.keys(positions).length < tables.length) return;
      const id = requestAnimationFrame(() => {
        fit();
        setAutoFitDone(true);
      });
      return () => cancelAnimationFrame(id);
    }, [tables.length, positions, autoFitDone, fit]);

    const autoLayout = useCallback(() => {
      const next = dagreLayout(tables, relations);
      setPositions(next);
      // Re-fit on next tick
      setAutoFitDone(false);
    }, [tables, relations, setPositions]);

    useEffect(() => {
      setAutoFitDone(false);
    }, [tableSignature]);

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () =>
          setZoom(Math.min(MAX_ZOOM, +(zoom + ZOOM_STEP).toFixed(2))),
        zoomOut: () =>
          setZoom(Math.max(MIN_ZOOM, +(zoom - ZOOM_STEP).toFixed(2))),
        fit,
        autoLayout,
        exportRoot: () => exportRootRef.current,
      }),
      [fit, autoLayout, setZoom, zoom],
    );

    /* ────────  Pan / drag handlers  ──────── */

    const handleNodeMouseDown = useCallback(
      (e: React.MouseEvent, slug: string) => {
        if (e.button !== 0) return;
        if (mode === "pan") return;
        e.preventDefault();
        e.stopPropagation();
        const cur = positions[slug] ?? { x: 0, y: 0 };
        dragNode.current = {
          slug,
          startX: e.clientX,
          startY: e.clientY,
          origX: cur.x,
          origY: cur.y,
          moved: false,
        };
        setDraggingSlug(slug);
      },
      [positions, mode],
    );

    const handleCanvasMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (e.button !== 0 && e.button !== 1) return;
        const target = e.target as HTMLElement;
        if (target.closest("[data-slug]")) return;
        // SVG click on empty area also lands here; allow it.
        e.preventDefault();
        dragPan.current = {
          startX: e.clientX,
          startY: e.clientY,
          origX: pan.x,
          origY: pan.y,
          moved: false,
        };
        setPanActive(true);
      },
      [pan.x, pan.y],
    );

    useEffect(() => {
      const onMove = (e: MouseEvent) => {
        if (dragNode.current) {
          const d = dragNode.current;
          const dx = e.clientX - d.startX;
          const dy = e.clientY - d.startY;
          if (
            !d.moved &&
            Math.abs(dx) + Math.abs(dy) > CLICK_THRESHOLD
          ) {
            d.moved = true;
          }
          if (d.moved) {
            setPosition(d.slug, {
              x: d.origX + dx / zoom,
              y: d.origY + dy / zoom,
            });
          }
        } else if (dragPan.current) {
          const d = dragPan.current;
          const dx = e.clientX - d.startX;
          const dy = e.clientY - d.startY;
          if (
            !d.moved &&
            Math.abs(dx) + Math.abs(dy) > CLICK_THRESHOLD
          ) {
            d.moved = true;
          }
          if (d.moved) {
            setPan({ x: d.origX + dx, y: d.origY + dy });
          }
        }
      };
      const onUp = () => {
        // If user clicked empty canvas without moving — clear focus
        if (dragPan.current && !dragPan.current.moved) {
          clearFocus();
        }
        lastDragMoved.current = !!dragNode.current?.moved;
        dragNode.current = null;
        dragPan.current = null;
        setDraggingSlug(null);
        setPanActive(false);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      return () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
    }, [zoom, setPosition, setPan, clearFocus]);

    const handleWheel = useCallback(
      (e: React.WheelEvent) => {
        e.preventDefault();
        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) return;
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const next = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, zoom * (e.deltaY > 0 ? 0.92 : 1.08)),
        );
        if (next === zoom) return;
        setViewport(
          {
            x: cx - ((cx - pan.x) / zoom) * next,
            y: cy - ((cy - pan.y) / zoom) * next,
          },
          next,
        );
      },
      [zoom, pan.x, pan.y, setViewport],
    );

    /* ────────  Focus / fade derivation  ──────── */

    // Set of relation IDs that should be highlighted.
    const focused = useMemo(() => {
      const edges = new Set<string>();
      const nodes = new Set<string>();

      // Click-locked edge takes priority
      const lockedEdgeId = focusedRelation;
      if (lockedEdgeId) {
        edges.add(lockedEdgeId);
        const r = relations.find((rel) => rel.id === lockedEdgeId);
        if (r) {
          nodes.add(r.from);
          nodes.add(r.to);
        }
        return { edges, nodes, locked: true as const };
      }

      // Click-locked table
      if (focusedTable) {
        nodes.add(focusedTable);
        relations.forEach((r) => {
          if (r.from === focusedTable || r.to === focusedTable) {
            edges.add(r.id);
            nodes.add(r.from);
            nodes.add(r.to);
          }
        });
        return { edges, nodes, locked: true as const };
      }

      // Hovered column
      if (hoveredColumn) {
        const tbl = tables.find((t) => t.slug === hoveredColumn.table);
        const col = tbl?.columns.find((c) => c.name === hoveredColumn.column);
        const isPK = col?.constraints?.some((c) => c.label === "PK") ?? false;
        relations.forEach((r) => {
          const matchesFromCol =
            r.from === hoveredColumn.table &&
            r.fromColumn === hoveredColumn.column;
          const matchesPK = isPK && r.to === hoveredColumn.table;
          if (matchesFromCol || matchesPK) {
            edges.add(r.id);
            nodes.add(r.from);
            nodes.add(r.to);
          }
        });
        if (edges.size > 0) {
          return { edges, nodes, locked: false as const };
        }
      }

      // Hovered edge
      if (hoveredRelation) {
        edges.add(hoveredRelation);
        const r = relations.find((rel) => rel.id === hoveredRelation);
        if (r) {
          nodes.add(r.from);
          nodes.add(r.to);
        }
        return { edges, nodes, locked: false as const };
      }

      // Hovered table
      if (hoveredTable) {
        nodes.add(hoveredTable);
        relations.forEach((r) => {
          if (r.from === hoveredTable || r.to === hoveredTable) {
            edges.add(r.id);
            nodes.add(r.from);
            nodes.add(r.to);
          }
        });
        return { edges, nodes, locked: false as const };
      }

      return null;
    }, [
      focusedRelation,
      focusedTable,
      hoveredColumn,
      hoveredRelation,
      hoveredTable,
      relations,
      tables,
    ]);

    // Highlighted columns per table (from focus/hover state)
    const highlightedColumnsByTable = useMemo(() => {
      const map = new Map<string, Set<string>>();
      const add = (table: string, column: string) => {
        if (!map.has(table)) map.set(table, new Set());
        map.get(table)!.add(column);
      };
      const rels = focused?.edges ?? new Set<string>();
      rels.forEach((id) => {
        const r = relations.find((x) => x.id === id);
        if (!r) return;
        add(r.from, r.fromColumn);
        add(r.to, r.toColumn);
      });
      return map;
    }, [focused, relations]);

    // Filter visibility
    const showRelations = filter !== "tables";
    const tablesFadedByFilter = filter === "relations" && !focused;

    /* ────────  Render  ──────── */

    if (isLoading && tables.length === 0) {
      return (
        <div className="text-text-muted bg-bg-main flex h-full w-full items-center justify-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading diagram…
        </div>
      );
    }

    if (isError) {
      return (
        <div className="text-destructive bg-bg-main flex h-full w-full items-center justify-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4" />
          {t('loadDiagramFailed')}
        </div>
      );
    }

    if (tables.length === 0) {
      return (
        <div className="text-text-muted bg-bg-main flex h-full w-full flex-col items-center justify-center gap-3">
          <Database size={28} className="opacity-50" />
          <p className="text-sm">{t('noTablesToVisualise')}</p>
        </div>
      );
    }

    const cursorClass = panActive
      ? "cursor-grabbing"
      : mode === "pan"
        ? "cursor-grab"
        : "cursor-default";

    return (
      <div
        ref={viewportRef}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        className={cn(
          "bg-bg-main relative h-full w-full overflow-hidden",
          cursorClass,
        )}
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--color-border-subtle) 1px, transparent 1px)",
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        <div
          ref={exportRootRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            width: 1,
            height: 1,
            willChange: "transform",
          }}
        >
          {showRelations && (
            <svg
              className="absolute left-0 top-0 overflow-visible"
              style={{ pointerEvents: "none" }}
              width={1}
              height={1}
            >
              <defs>
                <marker
                  id="arrow"
                  markerWidth="10"
                  markerHeight="8"
                  refX="9"
                  refY="4"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 4, 0 8"
                    className="fill-blue-500 dark:fill-blue-400"
                  />
                </marker>
                <marker
                  id="arrow-active"
                  markerWidth="10"
                  markerHeight="8"
                  refX="9"
                  refY="4"
                  orient="auto"
                >
                  <polygon points="0 0, 10 4, 0 8" className="fill-primary" />
                </marker>
              </defs>
              <g style={{ pointerEvents: "auto" }}>
                {relations.map((rel, i) => {
                  const isHi = focused?.edges.has(rel.id) ?? false;
                  const isFaded = !!focused && !isHi;
                  return (
                    <Edge
                      key={rel.id || `rel-${i}`}
                      relation={rel}
                      positions={positions}
                      tables={tables}
                      highlighted={isHi}
                      faded={isFaded}
                      onHover={setHoveredRelation}
                      onClick={(id) =>
                        setFocusedRelation(
                          focusedRelation === id ? null : id,
                        )
                      }
                    />
                  );
                })}
              </g>
            </svg>
          )}

          {tables.map((t, i) => {
            const inFocus = focused?.nodes.has(t.slug) ?? false;
            const isFaded =
              tablesFadedByFilter || (!!focused && !inFocus);
            return (
              <div
                key={t.slug || `table-${i}`}
                onMouseEnter={() => setHoveredTable(t.slug)}
                onMouseLeave={() => setHoveredTable(null)}
              >
                <TableNode
                  label={t.label}
                  slug={t.slug}
                  columns={t.columns}
                  position={positions[t.slug] ?? { x: 0, y: 0 }}
                  highlighted={inFocus}
                  dragging={draggingSlug === t.slug}
                  faded={isFaded}
                  hoveredColumn={
                    hoveredColumn?.table === t.slug
                      ? hoveredColumn.column
                      : null
                  }
                  highlightedColumns={highlightedColumnsByTable.get(t.slug)}
                  onMouseDown={handleNodeMouseDown}
                  onColumnEnter={(column) =>
                    setHoveredColumn({ table: t.slug, column })
                  }
                  onColumnLeave={() => setHoveredColumn(null)}
                  onTableClick={(slug) => {
                    if (lastDragMoved.current) {
                      lastDragMoved.current = false;
                      return;
                    }
                    setFocusedTable(focusedTable === slug ? null : slug);
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Locked-focus banner */}
        {focused?.locked && (
          <div className="bg-bg-card/95 border-border-subtle pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] shadow-sm backdrop-blur">
            <span className="bg-primary inline-block h-1.5 w-1.5 rounded-full" />
            <span className="text-text-main font-medium">
              {focusedRelation
                ? (() => {
                    const r = relations.find(
                      (x) => x.id === focusedRelation,
                    );
                    return r
                      ? `FK: ${r.from}.${r.fromColumn} → ${r.to}.${r.toColumn}`
                      : "Relation locked";
                  })()
                : focusedTable
                  ? `Focus: ${focusedTable}`
                  : ""}
            </span>
            <span className="text-text-muted">· click empty area to clear</span>
          </div>
        )}
      </div>
    );
  },
);

DiagramCanvas.displayName = "DiagramCanvas";
