import React, { useState, useMemo } from "react";

// ─── INTERFACES ──────────────────────────────────────────────────────────────
interface BpmnNode {
  id: string;
  name: string;
  type: "task" | "start" | "end" | "event" | "gateway";
}

interface BpmnLane {
  id: string;
  name: string;
  nodeIds: string[];
}

interface BpmnFlow {
  id: string;
  source: string;
  target: string;
  name: string;
}

interface BpmnParsedData {
  lanes: (BpmnLane & { nodes: BpmnNode[] })[];
  flows: BpmnFlow[];
  crossFlows: BpmnFlow[];
  nodeMap: Record<string, BpmnNode>;
}

interface BpmnViewerProps {
  bpmnXml?: string;
}

// ─── BPMN XML PARSER ──────────────────────────────────────────────────────────
function parseBpmn(xmlString: string): BpmnParsedData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  const ns = {
    bpmn: "http://www.omg.org/spec/BPMN/20100524/MODEL",
    di: "http://www.omg.org/spec/BPMN/20100524/DI",
    dc: "http://www.omg.org/spec/DD/20100524/DC",
  };

  const q = (el: Element | Document, tag: string, nsUri = ns.bpmn): Element[] =>
    [...el.getElementsByTagNameNS(nsUri, tag)];

  // Parse lanes
  const lanes: BpmnLane[] = q(doc, "lane").map((lane) => ({
    id: lane.getAttribute("id") || "",
    name: lane.getAttribute("name") ?? lane.getAttribute("id") ?? "Unnamed Lane",
    nodeIds: q(lane, "flowNodeRef").map((r) => r.textContent?.trim() || ""),
  }));

  // Parse all flow nodes (tasks, start/end events, gateways)
  const nodeMap: Record<string, BpmnNode> = {};
  const taskTags = [
    "task", "serviceTask", "userTask", "sendTask",
    "receiveTask", "manualTask", "scriptTask",
    "businessRuleTask", "callActivity", "subProcess"
  ];

  taskTags.forEach((tag) => {
    q(doc, tag).forEach((el) => {
      const id = el.getAttribute("id") || "";
      nodeMap[id] = {
        id,
        name: el.getAttribute("name") ?? el.getAttribute("id") ?? "Task",
        type: "task",
      };
    });
  });

  ["startEvent", "endEvent", "intermediateThrowEvent",
    "intermediateCatchEvent", "boundaryEvent"].forEach((tag) => {
      q(doc, tag).forEach((el) => {
        const id = el.getAttribute("id") || "";
        nodeMap[id] = {
          id,
          name: el.getAttribute("name") ?? tag.replace("Event", ""),
          type: tag.toLowerCase().includes("start") ? "start" : tag.toLowerCase().includes("end") ? "end" : "event",
        };
      });
    });

  ["exclusiveGateway", "inclusiveGateway", "parallelGateway",
    "eventBasedGateway", "complexGateway"].forEach((tag) => {
      q(doc, tag).forEach((el) => {
        const id = el.getAttribute("id") || "";
        nodeMap[id] = {
          id,
          name: el.getAttribute("name") ?? "Gateway",
          type: "gateway",
        };
      });
    });

  // Parse sequence flows (edges)
  const flows: BpmnFlow[] = q(doc, "sequenceFlow").map((f) => ({
    id: f.getAttribute("id") || "",
    source: f.getAttribute("sourceRef") || "",
    target: f.getAttribute("targetRef") || "",
    name: f.getAttribute("name") ?? "",
  }));

  // Build adjacency: which node comes after which
  const nextMap: Record<string, string[]> = {};   // nodeId → [nodeId]
  const prevMap: Record<string, string[]> = {};
  flows.forEach(({ source, target }) => {
    if (!nextMap[source]) nextMap[source] = [];
    if (!prevMap[target]) prevMap[target] = [];
    nextMap[source].push(target);
    prevMap[target].push(source);
  });

  // For each lane, order nodes by sequence flow (BFS from start nodes)
  const lanesWithNodes = lanes.map((lane) => {
    const nodeSet = new Set(lane.nodeIds);
    // Find start nodes in this lane (no predecessor inside same lane)
    const startNodes = lane.nodeIds.filter((id) => {
      const preds = prevMap[id] ?? [];
      return preds.filter((p) => nodeSet.has(p)).length === 0;
    });

    // BFS within lane
    const ordered: string[] = [];
    const visited = new Set<string>();
    const queue = [...startNodes];
    while (queue.length) {
      const cur = queue.shift();
      if (!cur || visited.has(cur) || !nodeSet.has(cur)) continue;
      visited.add(cur);
      ordered.push(cur);
      (nextMap[cur] ?? []).forEach((n) => {
        if (nodeSet.has(n) && !visited.has(n)) queue.push(n);
      });
    }
    // Append any nodes not reached (disconnected)
    lane.nodeIds.forEach((id) => { if (!visited.has(id)) ordered.push(id); });

    return {
      ...lane,
      nodes: ordered.map((id) => nodeMap[id]).filter((n): n is BpmnNode => Boolean(n)),
    };
  });

  // Identify cross-lane flows
  const laneOfNode: Record<string, string> = {};
  lanesWithNodes.forEach((lane) => {
    lane.nodes.forEach((n: BpmnNode) => { laneOfNode[n.id] = lane.id; });
  });

  const crossFlows = flows.filter(
    ({ source, target }) =>
      source && target &&
      laneOfNode[source] &&
      laneOfNode[target] &&
      laneOfNode[source] !== laneOfNode[target]
  );

  return { lanes: lanesWithNodes, flows, crossFlows, nodeMap };
}

// ─── COLOR PALETTE (cycles across lanes) ─────────────────────────────────────
const PALETTE = [
  { color: "#4F6EF7", bg: "#EEF1FF" },
  { color: "#0BA97D", bg: "#E6F9F4" },
  { color: "#E07B23", bg: "#FEF4EA" },
  { color: "#9B4CF0", bg: "#F5EEFF" },
  { color: "#D63B6B", bg: "#FEE8F0" },
  { color: "#1E9FBB", bg: "#E4F6FA" },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export const BpmnViewer = ({ bpmnXml }: BpmnViewerProps) => {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [hoveredLane, setHoveredLane] = useState<string | null>(null);

  const { lanes, crossFlows } = useMemo(() => {
    if (!bpmnXml) return { lanes: [], crossFlows: [] };
    try {
      const parsed = parseBpmn(bpmnXml);
      return { lanes: parsed.lanes, crossFlows: parsed.crossFlows };
    } catch (e) {
      console.error("BPMN parse error", e);
      return { lanes: [], crossFlows: [] };
    }
  }, [bpmnXml]);

  if (!bpmnXml) return (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>⬡</div>
      <p style={{ color: "var(--muted)", margin: 0 }}>No BPMN XML provided</p>
    </div>
  );

  if (!lanes.length) return (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>⚠</div>
      <p style={{ color: "var(--muted)", margin: 0 }}>Could not parse BPMN XML</p>
    </div>
  );

  // Max steps across all lanes (for grid columns)
  const maxSteps = Math.max(...lanes.map((l) => l.nodes.length), 0);

  // Cross-flow lookup: source nodeId → target nodeId
  const crossSet = new Set(crossFlows.map((f) => `${f.source}→${f.target}`));
  const crossTargets = new Set(crossFlows.map((f) => f.target));
  const crossSources = new Set(crossFlows.map((f) => f.source));

  const isConnected = (nodeId: string) => {
    if (!activeNode) return false;
    return (
      crossSet.has(`${activeNode}→${nodeId}`) ||
      crossSet.has(`${nodeId}→${activeNode}`)
    );
  };

  return (
    <div style={styles.root} className="p-5 w-full rounded-ai">
      <style>{css}</style>

      {/* Header */}
      <div style={styles.header}>
        <span style={styles.badge}>
          <span style={styles.dot} />
          BPMN Protocol
        </span>
        <h2 style={styles.title} className="text-gradient">Process Flow</h2>
        <p style={styles.subtitle}>
          {lanes.length} roles · {lanes.reduce((s: number, l) => s + l.nodes.length, 0)} tasks ·{" "}
          {crossFlows.length} cross-lane connection{crossFlows.length !== 1 ? "s" : ""}
          {activeNode && " · Click again to deselect"}
        </p>
      </div>

      {/* Diagram */}
      <div style={styles.board} className="ai-card relative flex flex-col overflow-hidden">
        <div className="overflow-auto w-full custom-scrollbar" style={{ maxHeight: "65vh" }}>
          {/* Inner constraint to enforce horizontal scrolling when needed */}
          <div style={{ minWidth: `${160 + maxSteps * 180}px` }}>
            {/* Column index headers */}
            <div 
              style={{ ...styles.headerRow, gridTemplateColumns: `160px repeat(${maxSteps}, minmax(180px, 1fr))` }}
              className="glass-header sticky top-0 z-10"
            >
              <div style={styles.colHead} />
              {Array.from({ length: maxSteps }, (_, i) => (
                <div key={i} style={styles.colHead}>Step {i + 1}</div>
              ))}
            </div>

            {/* Lanes */}
            {lanes.map((lane, li) => {
              const pal = PALETTE[li % PALETTE.length];
              const isHov = hoveredLane === lane.id;

              return (
                <div
                  key={lane.id}
                  className="lane-row"
                  onMouseEnter={() => setHoveredLane(lane.id)}
                  onMouseLeave={() => setHoveredLane(null)}
                  style={{
                    ...styles.laneRow,
                    gridTemplateColumns: `160px repeat(${maxSteps}, minmax(180px, 1fr))`,
                    background: isHov ? pal.bg + "44" : "transparent",
                    borderBottom: li < lanes.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
              {/* Lane label */}
              <div style={{ ...styles.laneLabel, borderRight: "1px solid var(--border)" }}>
                <div style={{ ...styles.laneIcon, background: pal.color + "18", color: pal.color }}>
                  {li + 1}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
                  {lane.name}
                </div>
              </div>

              {/* Nodes */}
              {Array.from({ length: maxSteps }, (_, si) => {
                const node = lane.nodes[si];
                if (!node) return <div key={si} style={{ padding: 12 }} />;

                const isActive = activeNode === node.id;
                const isCrossed = isConnected(node.id);
                const hasCrossOut = crossSources.has(node.id);
                const hasCrossIn = crossTargets.has(node.id);

                return (
                  <div key={node.id} style={styles.cell}>
                    {/* In-lane arrow */}
                    {si > 0 && lane.nodes[si - 1] && (
                      <svg style={styles.arrow} viewBox="0 0 16 16" width="16" height="16">
                        <path d="M1 8h10M8 4l4 4-4 4" stroke={pal.color} strokeWidth="1.5"
                          fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
                      </svg>
                    )}

                    {/* Node card */}
                    <div
                      className="step-node ai-card"
                      onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
                      style={{
                        ...styles.node,
                        borderColor: isActive || isCrossed ? pal.color : "var(--border)",
                        background: isActive ? pal.color : isCrossed ? pal.color + "18" : "var(--bg-card)",
                        boxShadow: isActive
                          ? `0 4px 18px ${pal.color}44`
                          : isCrossed
                            ? `0 0 0 2px ${pal.color}44`
                            : "none",
                      }}
                    >
                      {/* Type badge */}
                      <div style={{
                        ...styles.typeBadge,
                        background: isActive ? "rgba(255,255,255,0.2)" : pal.color + "18",
                        color: isActive ? "#fff" : pal.color,
                      }}>
                        {node.type === "start" ? "▶ start"
                          : node.type === "end" ? "■ end"
                            : node.type === "gateway" ? "◇ gate"
                              : "⬡ task"}
                      </div>

                      <div style={{
                        fontSize: 12, fontWeight: 600, lineHeight: 1.3, marginTop: 4,
                        color: isActive ? "#fff" : "var(--text)",
                      }}>
                        {node.name}
                      </div>

                      {/* Cross-lane indicators */}
                      {hasCrossOut && isActive && (
                        <div style={{ ...styles.crossBadge, background: "rgba(255,255,255,0.2)", color: "#fff" }}>
                          ↓ cross-lane trigger
                        </div>
                      )}
                      {hasCrossIn && isCrossed && (
                        <div style={{ ...styles.crossBadge, background: (pal.bg as string) + "22", color: pal.color as string, border: `1px solid ${pal.color}44` }}>
                          ← triggered by {
                            crossFlows.find((f) => f.target === node.id)
                              ? lanes.find((l) => l.nodes.some((n) => n.id === crossFlows.find((cf) => cf.target === node.id)?.source))?.name ?? "other lane"
                              : "other lane"
                          }
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
          </div>
        </div>
      </div>

      {/* Cross-flow summary */}
      {crossFlows.length > 0 && (
        <div style={styles.crossSummary} className="ai-card">
          <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "monospace" }}>
            Cross-lane Interactivity
          </span>
          {crossFlows.map((f) => {
            const srcIdx = lanes.findIndex((l) => l.nodes.some((n) => n.id === f.source));
            const tgtIdx = lanes.findIndex((l) => l.nodes.some((n) => n.id === f.target));

            if (srcIdx === -1 || tgtIdx === -1) return null;

            const srcLane = lanes[srcIdx];
            const tgtLane = lanes[tgtIdx];
            const srcNode = srcLane.nodes.find((n) => n.id === f.source);
            const tgtNode = tgtLane.nodes.find((n) => n.id === f.target);
            const srcPal = PALETTE[srcIdx % PALETTE.length];
            const tgtPal = PALETTE[tgtIdx % PALETTE.length];
            return (
              <div key={f.id} style={styles.crossItem}
                className="hover:bg-hover-bg"
                onClick={() => setActiveNode(activeNode === f.source ? null : f.source)}
              >
                <span style={{ color: srcPal.color, fontWeight: 600 }}>{srcLane.name}</span>
                <span style={{ color: "var(--text-muted)" }}>· {srcNode?.name}</span>
                <span style={styles.crossArrow}>→</span>
                <span style={{ color: tgtPal.color, fontWeight: 600 }}>{tgtLane.name}</span>
                <span style={{ color: "var(--text-muted)" }}>· {tgtNode?.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties | Record<string, string>> = {
  root: {
    fontFamily: "var(--font-sans)",
    background: "var(--bg-main)",
    boxSizing: "border-box",
  } as React.CSSProperties,
  header: { marginBottom: 28 },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    background: "var(--bg-secondary)",
    color: "var(--primary-foreground)",
    padding: "4px 12px 4px 8px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.05em",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)", display: "inline-block" },
  title: { margin: 0, fontSize: 32, fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.04em" },
  subtitle: { margin: "6px 0 0", fontSize: 13, color: "var(--text-muted)", fontWeight: 500 },
  board: {
    borderRadius: "calc(var(--radius-ai) + 2px)",
    overflow: "hidden",
    isolation: "isolate", /* Fix Safari border-radius clipping with backdrop-blur */
    transform: "translateZ(0)",
  },
  headerRow: {
    display: "grid",
  },
  colHead: {
    padding: "12px 14px",
    fontSize: 10, color: "var(--text-muted)", fontWeight: 600,
    fontFamily: "monospace", letterSpacing: "0.06em",
    textTransform: "uppercase", textAlign: "center",
  },
  laneRow: {
    display: "grid",
    transition: "background 0.2s",
    alignItems: "stretch",
  },
  laneLabel: {
    padding: "16px 14px",
    display: "flex", flexDirection: "column", gap: 8,
    justifyContent: "center",
  },
  laneIcon: {
    width: 26, height: 26, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700,
  },
  cell: {
    padding: "14px 10px",
    display: "flex", alignItems: "center",
    position: "relative",
  },
  arrow: {
    position: "absolute", left: -4, top: "50%",
    transform: "translateY(-50%)", zIndex: 1, flexShrink: 0,
  },
  node: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "calc(var(--radius-ai) - 4px)",
    cursor: "pointer",
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    userSelect: "none",
  },
  typeBadge: {
    display: "inline-flex", alignItems: "center",
    fontSize: 9, fontWeight: 600, letterSpacing: "0.05em",
    padding: "2px 6px", borderRadius: 4,
    fontFamily: "monospace", textTransform: "uppercase",
  },
  crossBadge: {
    marginTop: 6, display: "inline-flex", alignItems: "center", gap: 3,
    borderRadius: 4, padding: "2px 7px",
    fontSize: 10, fontWeight: 500, animation: "badge-in 0.25s ease forwards",
  },
  crossSummary: {
    marginTop: 20,
    display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
    padding: "14px 18px",
    borderRadius: "var(--radius-ai)",
  },
  crossItem: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 12, cursor: "pointer", padding: "4px 10px",
    borderRadius: 8, border: "1px solid var(--border)",
    transition: "all 0.2s",
  },
  crossArrow: {
    color: "var(--text-muted)", fontSize: 14, margin: "0 2px",
  },
  empty: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", height: 260, gap: 16,
    color: "var(--text-muted)",
  },
  emptyIcon: { fontSize: 44, opacity: 0.2 },
};

const css = `
  .step-node:hover { 
    transform: translateY(-3px) scale(1.02); 
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important; 
  }
  .lane-row { cursor: default; }
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
  @keyframes badge-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;
