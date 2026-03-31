"use client"

import React, { useMemo, useState, useCallback } from "react";

// ─── INTERFACES ──────────────────────────────────────────────────────────────
export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

interface LayoutNode {
  col: number;
  row: number;
  rowCount: number;
}

interface ComputeLayoutResult {
  layout: Map<string, LayoutNode>;
  colCount: number;
  byCol: Map<number, string[]>;
}

// ─── LAYOUT ENGINE ────────────────────────────────────────────────────────────
// Assigns (col, row) to each node via topological sort (Kahn's algorithm)
function computeLayout(edges: FlowEdge[]): ComputeLayoutResult {
  const nodes = new Map<string, { id: string }>();   // name → { id, col, row }
  const adj = new Map<string, Set<string>>();   // name → Set<name>  (outgoing)
  const inDeg = new Map<string, number>();  // name → number

  edges.forEach(({ from, to }) => {
    if (!nodes.has(from)) { nodes.set(from, { id: from }); inDeg.set(from, 0); adj.set(from, new Set()); }
    if (!nodes.has(to)) { nodes.set(to, { id: to }); inDeg.set(to, 0); adj.set(to, new Set()); }
    adj.get(from)?.add(to);
    inDeg.set(to, (inDeg.get(to) ?? 0) + 1);
  });

  // Kahn's BFS → column = longest path from any source
  const col = new Map<string, number>();
  const queue = [...nodes.keys()].filter((n) => inDeg.get(n) === 0);
  queue.forEach((n) => col.set(n, 0));
  const order: string[] = [];

  while (queue.length) {
    const cur = queue.shift();
    if (cur === undefined) continue;
    order.push(cur);
    for (const nb of adj.get(cur) ?? []) {
      col.set(nb, Math.max(col.get(nb) ?? 0, (col.get(cur) ?? 0) + 1));
      inDeg.set(nb, (inDeg.get(nb) ?? 1) - 1);
      if (inDeg.get(nb) === 0) queue.push(nb);
    }
  }

  // Group by column, assign row within column
  const byCol = new Map<number, string[]>();
  for (const [name, c] of col) {
    if (!byCol.has(c)) byCol.set(c, []);
    byCol.get(c)?.push(name);
  }

  const layout = new Map<string, LayoutNode>();
  for (const [c, names] of byCol) {
    names.forEach((name, r) => layout.set(name, { col: c, row: r, rowCount: names.length }));
  }

  const colValues = Array.from(col.values());
  const colCount = colValues.length > 0 ? Math.max(...colValues) + 1 : 0;
  return { layout, colCount, byCol };
}

// ─── GEOMETRY ─────────────────────────────────────────────────────────────────
const NODE_W = 148;
const NODE_H = 48;
const COL_GAP = 100;
const ROW_GAP = 70;
const PAD_X = 32;
const PAD_Y = 40;

function nodeCenter(col: number, row: number, rowCount: number, totalRows: number) {
  const x = PAD_X + col * (NODE_W + COL_GAP) + NODE_W / 2;
  // vertically center the column relative to max rows
  const colHeight = rowCount * NODE_H + (rowCount - 1) * ROW_GAP;
  const totalH = totalRows * NODE_H + (totalRows - 1) * ROW_GAP;
  const offsetY = (totalH - colHeight) / 2;
  const y = PAD_Y + offsetY + row * (NODE_H + ROW_GAP) + NODE_H / 2;
  return { x, y };
}

// Smart edge: exits right side of source, enters left side of target
// If same column (back-edges), arc below
function edgePath(sx: number, sy: number, tx: number, ty: number) {
  if (Math.abs(sx - tx) < 10) {
    // same-column — arc
    const mx = sx + 60;
    return `M${sx} ${sy} C${mx} ${sy} ${mx} ${ty} ${tx} ${ty}`;
  }
  const cpx = (sx + tx) / 2;
  return `M${sx} ${sy} C${cpx} ${sy} ${cpx} ${ty} ${tx} ${ty}`;
}

// ─── PALETTE (cycles by column) ───────────────────────────────────────────────
const COLORS = ["#4F6EF7", "#0BA97D", "#E07B23", "#9B4CF0", "#D63B6B", "#1E9FBB", "#E5B800"];
const nodeColor = (col: number) => COLORS[col % COLORS.length];

export interface FlowDiagramProps {
  edges?: FlowEdge[];
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export const FlowDiagram = ({ edges = [] }: FlowDiagramProps) => {
  const [active, setActive] = useState<string | null>(null);   // hovered node name

  const { layout, colCount, byCol } = useMemo(() => computeLayout(edges), [edges]);

  const maxRows = useMemo(
    () => {
      const lengths = Array.from(byCol.values()).map((a) => a.length);
      return lengths.length > 0 ? Math.max(...lengths) : 1;
    },
    [byCol]
  );

  const svgW = PAD_X * 2 + colCount * NODE_W + (colCount - 1) * COL_GAP;
  const svgH = PAD_Y * 2 + maxRows * NODE_H + (maxRows - 1) * ROW_GAP;

  // Precompute node positions
  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const [name, { col, row, rowCount }] of layout) {
      map.set(name, nodeCenter(col, row, rowCount, maxRows));
    }
    return map;
  }, [layout, maxRows]);

  const isActiveEdge = useCallback(
    ({ from, to }: FlowEdge) => active === from || active === to,
    [active]
  );

  if (!edges.length) return (
    <div style={emptyStyle}>No edges provided</div>
  );

  return (
    <div className="flow-diagram-wrapper ai-card w-full p-6 overflow-auto custom-scrollbar">
      <style>{css}</style>

      <svg
        width="100%"
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ overflow: "visible", display: "block" }}
      >
        <defs>
          {/* Arrow markers per color */}
          {COLORS.map((c, i) => (
            <marker key={i} id={`arr-${i}`} viewBox="0 0 10 10"
              refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke={c}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          ))}
          <marker id="arr-muted" viewBox="0 0 10 10"
            refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="var(--border, #bbb)"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>

        {/* ── Edges ── */}
        {edges.map((edge, i) => {
          const sp = positions.get(edge.from);
          const tp = positions.get(edge.to);
          if (!sp || !tp) return null;

          const srcCol = layout.get(edge.from)?.col ?? 0;
          const color = nodeColor(srcCol);
          const colorIdx = srcCol % COLORS.length;
          const lit = isActiveEdge(edge);
          const dimmed = active && !lit;

          // exit right of source node, enter left of target node
          const sx = sp.x + NODE_W / 2;
          const tx = tp.x - NODE_W / 2;
          const d = edgePath(sx, sp.y, tx, tp.y);
          const mx = (sx + tx) / 2;
          const my = (sp.y + tp.y) / 2;

          return (
            <g key={i} style={{ transition: "opacity 0.2s" }} opacity={dimmed ? 0.15 : 1}>
              <path
                d={d}
                fill="none"
                stroke={lit ? color : "var(--border, #d0cfc8)"}
                strokeWidth={lit ? 2 : 1.5}
                strokeDasharray={lit ? "none" : "5 3"}
                markerEnd={`url(#${lit ? `arr-${colorIdx}` : "arr-muted"})`}
                style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
              />
              {/* Edge label */}
              {edge.label && (
                <text
                  x={mx} y={my - 7}
                  textAnchor="middle"
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--font-mono, monospace)",
                    fontWeight: 600,
                    fill: lit ? color : "var(--text-muted, #aaa)",
                    transition: "fill 0.2s",
                  }}
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Nodes ── */}
        {[...layout.entries()].map(([name, { col }]) => {
          const pos = positions.get(name);
          if (!pos) return null;

          const color = nodeColor(col);
          const isAct = active === name;
          const dimmed = active && !isAct;

          // check if this node has any active edge
          const connected = active && edges.some(
            (e) => (e.from === active && e.to === name) ||
              (e.to === active && e.from === name)
          );

          return (
            <g
              key={name}
              className="flow-node"
              style={{ cursor: "pointer", transition: "opacity 0.2s" }}
              opacity={dimmed && !connected ? 0.25 : 1}
              onMouseEnter={() => setActive(name)}
              onMouseLeave={() => setActive(null)}
            >
              <rect
                x={pos.x - NODE_W / 2}
                y={pos.y - NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill={isAct || connected ? color : "var(--bg-card, #fff)"}
                stroke={isAct || connected ? color : "var(--border-subtle, #e2e0db)"}
                strokeWidth={isAct ? 2 : 1.5}
                style={{
                  filter: isAct ? `drop-shadow(0 4px 12px ${color}55)` : "none",
                  transition: "fill 0.18s, stroke 0.18s, filter 0.18s",
                }}
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans, sans-serif)",
                  fill: isAct || connected ? "#fff" : "var(--text-main, #1a1a18)",
                  transition: "fill 0.18s",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                {name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={legendStyle}>
        <span style={legendItem}>
          <svg width="24" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="var(--border, #bbb)" strokeWidth="1.5" strokeDasharray="5 3" /></svg>
          idle
        </span>
        <span style={legendItem}>
          <svg width="24" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="#4F6EF7" strokeWidth="2" /></svg>
          hover active
        </span>
        <span style={{ ...legendItem, color: "var(--text-muted, #999)", marginLeft: "auto" }}>
          Hover a node to highlight its connections
        </span>
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const emptyStyle: React.CSSProperties = {
  padding: 40, textAlign: "center",
  color: "var(--text-muted, #999)", fontSize: 14,
};
const legendStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
  marginTop: 18, fontSize: 11,
  color: "var(--text-muted, #888)", fontFamily: "var(--font-mono, monospace)",
};
const legendItem: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6, fontWeight: 500,
};

const css = `
  .flow-node rect { transition: all .25s cubic-bezier(0.4, 0, 0.2, 1); }
  .flow-node:hover rect { transform: translateY(-2px); }
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }
`;