import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  DiagramFilter,
  DiagramMode,
  DiagramPosition,
} from "./types";

interface PersistedState {
  showMinimap: boolean;
  leftPanelRatio: number;
}

interface TransientState {
  // Positions are intentionally NOT persisted: on every load we re-run
  // auto-layout from the freshly-fetched (complete) schema/relations so the
  // diagram always opens with a good layout. Manual drags live for the session.
  positions: Record<string, DiagramPosition>;
  zoom: number;
  pan: DiagramPosition;
  mode: DiagramMode;
  filter: DiagramFilter;
  focusedTable: string | null;
  focusedRelation: string | null;
  hoveredColumn: { table: string; column: string } | null;
  isDbmlEditing: boolean;
  dbml: string;
}

interface Actions {
  setPosition: (slug: string, pos: DiagramPosition) => void;
  setPositions: (positions: Record<string, DiagramPosition>) => void;
  resetPositions: () => void;

  setZoom: (zoom: number) => void;
  setPan: (pan: DiagramPosition) => void;
  setViewport: (pan: DiagramPosition, zoom: number) => void;

  setMode: (mode: DiagramMode) => void;
  setFilter: (filter: DiagramFilter) => void;

  setFocusedTable: (slug: string | null) => void;
  setFocusedRelation: (id: string | null) => void;
  setHoveredColumn: (
    value: { table: string; column: string } | null,
  ) => void;
  clearFocus: () => void;

  toggleMinimap: () => void;
  setLeftPanelRatio: (ratio: number) => void;

  setDbml: (dbml: string) => void;
  setDbmlEditing: (editing: boolean) => void;
}

export type DiagramStore = PersistedState & TransientState & Actions;

const MIN_RATIO = 0.18;
const MAX_RATIO = 0.6;

export const useDiagramStore = create<DiagramStore>()(
  persist(
    (set) => ({
      // Persisted
      showMinimap: true,
      leftPanelRatio: 0.35,

      // Transient
      positions: {},
      zoom: 1,
      pan: { x: 0, y: 0 },
      mode: "select",
      filter: "all",
      focusedTable: null,
      focusedRelation: null,
      hoveredColumn: null,
      isDbmlEditing: false,
      dbml: "",

      // Actions
      setPosition: (slug, pos) =>
        set((s) => ({ positions: { ...s.positions, [slug]: pos } })),
      setPositions: (positions) => set({ positions }),
      resetPositions: () => set({ positions: {} }),

      setZoom: (zoom) => set({ zoom }),
      setPan: (pan) => set({ pan }),
      setViewport: (pan, zoom) => set({ pan, zoom }),

      setMode: (mode) => set({ mode }),
      setFilter: (filter) => set({ filter }),

      setFocusedTable: (slug) =>
        set({ focusedTable: slug, focusedRelation: null }),
      setFocusedRelation: (id) =>
        set({ focusedRelation: id, focusedTable: null }),
      setHoveredColumn: (value) => set({ hoveredColumn: value }),
      clearFocus: () =>
        set({ focusedTable: null, focusedRelation: null, hoveredColumn: null }),

      toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),
      setLeftPanelRatio: (ratio) =>
        set({
          leftPanelRatio: Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio)),
        }),

      setDbml: (dbml) => set({ dbml }),
      setDbmlEditing: (isDbmlEditing) => set({ isDbmlEditing }),
    }),
    {
      name: "db-diagram-store",
      // v1: positions are no longer persisted. Strip them from any older
      // persisted blob so a stale layout can't be rehydrated on load.
      version: 1,
      migrate: (persisted: any) => {
        if (persisted && "positions" in persisted) {
          const { positions: _drop, ...rest } = persisted;
          return rest;
        }
        return persisted;
      },
      partialize: (s): PersistedState => ({
        showMinimap: s.showMinimap,
        leftPanelRatio: s.leftPanelRatio,
      }),
    },
  ),
);
