import { useEffect, useMemo } from "react";
import { useDbDiagram } from "@/entities/database";
import { dagreLayout } from "../lib/auto-layout";
import { generateDbml } from "../lib/dbml";
import { relationId } from "../lib/constants";
import { useDiagramStore } from "../model/store";
import type { DiagramRelation, DiagramTable } from "../model/types";

interface DiagramData {
  tables: DiagramTable[];
  relations: DiagramRelation[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

export const useDiagramData = (projectId: string): DiagramData => {
  const { schemas, relations, isLoading, isError, error } = useDbDiagram(projectId);

  const tables = useMemo<DiagramTable[]>(
    () =>
      schemas.map((s) => ({
        slug: s.slug,
        label: s.label,
        columns: s.data.columns,
        constraints: s.data.constraints,
      })),
    [schemas],
  );

  const enrichedRelations = useMemo<DiagramRelation[]>(
    () =>
      relations.map((r) => ({
        ...r,
        id: relationId(r.from, r.fromColumn, r.to),
      })),
    [relations],
  );

  useEffect(() => {
    // Wait until ALL schema queries (and therefore relations) have loaded.
    // Updating earlier means dagreLayout / generateDbml run with empty or
    // partial relations, producing a bad layout and incorrect DBML.
    if (isLoading) return;
    if (tables.length === 0) return;
    const state = useDiagramStore.getState();

    const known = state.positions;
    const slugs = new Set(tables.map((t) => t.slug));
    const missing = tables.filter((t) => !known[t.slug]);
    const hasDeletedPositions = Object.keys(known).some((slug) => !slugs.has(slug));

    if (missing.length > 0 || hasDeletedPositions) {
      const layout = dagreLayout(tables, enrichedRelations);
      const nextPositions = tables.reduce<Record<string, { x: number; y: number }>>(
        (acc, table) => {
          const fresh = layout[table.slug];
          acc[table.slug] = known[table.slug] ?? fresh ?? { x: 0, y: 0 };
          return acc;
        },
        {},
      );
      state.setPositions(nextPositions);
    }

    if (!state.isDbmlEditing) {
      const nextDbml = generateDbml(tables, enrichedRelations);
      if (state.dbml !== nextDbml) {
        state.setDbml(nextDbml);
      }
    }
  }, [isLoading, tables, enrichedRelations]);

  return {
    tables,
    relations: enrichedRelations,
    isLoading,
    isError,
    error,
  };
};
