import dagre from "dagre";
import type { DiagramPosition, DiagramRelation, DiagramTable } from "../model/types";
import { NODE_WIDTH, tableHeight } from "./constants";

export const dagreLayout = (
  tables: DiagramTable[],
  relations: DiagramRelation[],
  options: { rankdir?: "LR" | "TB"; nodesep?: number; ranksep?: number } = {},
): Record<string, DiagramPosition> => {
  if (tables.length === 0) return {};
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: options.rankdir ?? "LR",
    nodesep: options.nodesep ?? 60,
    ranksep: options.ranksep ?? 90,
    marginx: 32,
    marginy: 32,
  });
  g.setDefaultEdgeLabel(() => ({}));

  tables.forEach((t) => {
    g.setNode(t.slug, {
      width: NODE_WIDTH,
      height: tableHeight(t.columns.length),
    });
  });

  relations.forEach((r) => {
    if (g.hasNode(r.from) && g.hasNode(r.to) && r.from !== r.to) {
      g.setEdge(r.from, r.to);
    }
  });

  dagre.layout(g);

  const positions: Record<string, DiagramPosition> = {};
  g.nodes().forEach((id: string) => {
    const node = g.node(id);
    if (!node) return;
    positions[id] = {
      x: node.x - node.width / 2,
      y: node.y - node.height / 2,
    };
  });
  return positions;
};
