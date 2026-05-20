"use client";

import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toPng } from "html-to-image";
import { useDiagramData } from "../api/use-diagram-data";
import { useDiagramStore } from "../model/store";
import { generateDbml, parseDbml } from "../lib/dbml";
import type {
  DbmlParseError,
  DiagramRelation,
  DiagramTable,
} from "../model/types";
import { DbmlEditor } from "./dbml-editor";
import { DiagramCanvas, DiagramCanvasHandle } from "./diagram-canvas";
import { CanvasControls } from "./canvas-controls";
import { DiagramToolbar } from "./diagram-toolbar";
import { Minimap } from "./minimap";
import { SplitPanel } from "./split-panel";
import { getPaymentRequiredFromError } from "@/entities/billing";
import { BillingLimitState } from "@/widgets/billing-limit";

interface Props {
  projectId: string;
}

interface ParsedDiagram {
  tables: DiagramTable[];
  relations: DiagramRelation[];
}

const DBML_DEBOUNCE_MS = 500;

export const DbDiagramView: React.FC<Props> = ({ projectId }) => {
  const { tables, relations, isLoading, isError, error } = useDiagramData(projectId);
  const billingLimit = getPaymentRequiredFromError(error);

  const isDbmlEditing = useDiagramStore((s) => s.isDbmlEditing);
  const setDbml = useDiagramStore((s) => s.setDbml);
  const leftPanelRatio = useDiagramStore((s) => s.leftPanelRatio);
  const setLeftPanelRatio = useDiagramStore((s) => s.setLeftPanelRatio);
  const showMinimap = useDiagramStore((s) => s.showMinimap);
  const zoom = useDiagramStore((s) => s.zoom);

  const canvasRef = useRef<DiagramCanvasHandle>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({
    width: 0,
    height: 0,
  });

  // Last successful parse of user-edited DBML. `null` until the user types
  // something that parses to ≥1 table — we use API data as fallback.
  // Held in a single state slot so updates don't cascade through extra effects.
  const [parsed, setParsed] = useState<ParsedDiagram | null>(null);
  const [parseErrors, setParseErrors] = useState<DbmlParseError[]>([]);
  const debounceRef = useRef<number | null>(null);

  const handleDbmlEdit = useCallback(
    (value: string) => {
      setDbml(value);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        const result = parseDbml(value);
        setParseErrors(result.errors);
        if (result.tables.length > 0) {
          const merged = result.tables.map((pt) => {
            const original = tables.find((t) => t.slug === pt.slug);
            return original ? { ...pt, label: original.label } : pt;
          });
          setParsed({ tables: merged, relations: result.relations });
        }
      }, DBML_DEBOUNCE_MS);
    },
    [setDbml, tables],
  );

  // Regenerate DBML from current API tables/relations and clear local override
  const handleRegenerate = useCallback(() => {
    setDbml(generateDbml(tables, relations));
    setParseErrors([]);
    setParsed(null);
  }, [tables, relations, setDbml]);

  // While editing, prefer the parsed override; otherwise fall back to API.
  // Defensive filter: drop any relation whose id ended up empty (would
  // collide as a React key and confuse focus look-ups).
  const effectiveTables: DiagramTable[] =
    isDbmlEditing && parsed ? parsed.tables : tables;
  const effectiveRelations: DiagramRelation[] = useMemo(() => {
    const source = isDbmlEditing && parsed ? parsed.relations : relations;
    return source.filter((r) => r.id);
  }, [isDbmlEditing, parsed, relations]);

  /* ────────  Track right pane size for minimap & fit  ──────── */
  useLayoutEffect(() => {
    const el = rightPaneRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setViewportSize({ width: cr.width, height: cr.height });
    });
    observer.observe(el);
    setViewportSize({ width: el.clientWidth, height: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  /* ────────  Export PNG  ──────── */
  const handleExport = useCallback(async () => {
    const root = canvasRef.current?.exportRoot();
    if (!root) return;
    try {
      const dataUrl = await toPng(root, {
        cacheBust: true,
        backgroundColor: getComputedStyle(document.documentElement)
          .getPropertyValue("--bg-main")
          .trim() || "#ffffff",
        pixelRatio: 2,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "diagram.png";
      a.click();
    } catch (err) {
      console.error("PNG export failed", err);
    }
  }, []);

  const counters = useMemo(
    () => ({
      tables: effectiveTables.length,
      relations: effectiveRelations.length,
    }),
    [effectiveTables, effectiveRelations],
  );

  if (billingLimit) {
    return (
      <div className="flex h-full w-full flex-1 flex-col overflow-hidden">
        <BillingLimitState data={billingLimit} />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-1 flex-col overflow-hidden">
      <DiagramToolbar
        tableCount={counters.tables}
        relationCount={counters.relations}
        onAutoLayout={() => canvasRef.current?.autoLayout()}
        onExport={handleExport}
      />

      <div className="min-h-0 flex-1">
        <SplitPanel
          ratio={leftPanelRatio}
          onRatioChange={setLeftPanelRatio}
          left={
            <DbmlEditor
              parseErrorCount={parseErrors.length}
              onUserEdit={handleDbmlEdit}
              onRegenerate={handleRegenerate}
            />
          }
          right={
            <div ref={rightPaneRef} className="relative h-full w-full">
              <DiagramCanvas
                ref={canvasRef}
                tables={effectiveTables}
                relations={effectiveRelations}
                isLoading={isLoading}
                isError={isError}
              />
              <div className="pointer-events-none absolute bottom-3 right-3 flex flex-col items-end gap-2">
                {showMinimap && effectiveTables.length > 0 && (
                  <div className="pointer-events-auto">
                    <Minimap
                      tables={effectiveTables}
                      viewport={viewportSize}
                    />
                  </div>
                )}
                <CanvasControls
                  zoom={zoom}
                  onZoomIn={() => canvasRef.current?.zoomIn()}
                  onZoomOut={() => canvasRef.current?.zoomOut()}
                  onFit={() => canvasRef.current?.fit()}
                />
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
};
