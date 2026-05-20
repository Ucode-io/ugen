import { useEffect, useMemo, useRef } from "react";
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

  // Seed store: generate DBML once when API data first arrives, and ensure
  // every table has a position (without clobbering the user's drags).
  const seededRef = useRef<{ dbml: boolean; positions: boolean }>({
    dbml: false,
    positions: false,
  });

  useEffect(() => {
    // Wait until ALL schema queries (and therefore relations) have loaded.
    // Seeding earlier means dagreLayout / generateDbml run with empty or
    // partial relations, producing a bad layout and incorrect DBML — exactly
    // what previously forced a manual "Auto layout" / "Regenerate" click.
    if (isLoading) return;
    if (tables.length === 0) return;
    const state = useDiagramStore.getState();

    if (!seededRef.current.positions) {
      const known = state.positions;
      const missing = tables.filter((t) => !known[t.slug]);
      if (missing.length > 0) {
        const layout = dagreLayout(tables, enrichedRelations);
        if (Object.keys(known).length === 0) {
          state.setPositions(layout);
        } else {
          missing.forEach((t) => {
            const fresh = layout[t.slug];
            if (fresh) state.setPosition(t.slug, fresh);
          });
        }
      }
      seededRef.current.positions = true;
    }

    if (!seededRef.current.dbml && !state.isDbmlEditing) {
      state.setDbml(generateDbml(tables, enrichedRelations));
      seededRef.current.dbml = true;
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
