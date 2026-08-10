"use client";

import React from "react";
import {
  Database,
  Download,
  Hand,
  Layers,
  Link2,
  MousePointer2,
  Network,
  Wand2,
} from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import { useDiagramStore } from "../model/store";
import type { DiagramFilter, DiagramMode } from "../model/types";
import { useTranslations } from 'next-intl'

interface Props {
  tableCount: number;
  relationCount: number;
  onAutoLayout: () => void;
  onExport: () => void;
}

const ModeBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ active, onClick, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    className={cn(
      "flex h-7 w-7 items-center justify-center rounded transition-all",
      active
        ? "bg-bg-main text-primary shadow-sm"
        : "text-text-muted/60 hover:text-text-main",
    )}
  >
    {children}
  </button>
);

const FilterBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={cn(
      "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
      active
        ? "bg-bg-main text-primary shadow-sm"
        : "text-text-muted/70 hover:text-text-main",
    )}
  >
    {children}
  </button>
);

const ActionBtn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ className, children, ...props }) => (
  <button
    {...props}
    className={cn(
      "border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
  >
    {children}
  </button>
);

export const DiagramToolbar: React.FC<Props> = ({
  tableCount,
  relationCount,
  onAutoLayout,
  onExport,
}) => {
  const t = useTranslations('features.dbDiagram')
  const mode = useDiagramStore((s) => s.mode);
  const filter = useDiagramStore((s) => s.filter);
  const setMode = useDiagramStore((s) => s.setMode);
  const setFilter = useDiagramStore((s) => s.setFilter);

  const modeChange = (m: DiagramMode) => () => setMode(m);
  const filterChange = (f: DiagramFilter) => () => setFilter(f);

  return (
    <div className="bg-bg-main/50 border-border-subtle flex min-h-[47px] shrink-0 items-center justify-between gap-3 overflow-x-auto border-b p-3 whitespace-nowrap">
      <div className="flex shrink-0 items-center gap-2">
        <div className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-md">
          <Network size={14} />
        </div>
        <span className="text-text-main text-[13px] font-semibold">
          {t('dbDiagram')}
        </span>

        <span className="bg-border-subtle/70 mx-2 h-5 w-px shrink-0" />

        <span className="bg-primary/10 text-primary flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase">
          <Database size={11} />
          {tableCount} tables
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium tracking-wide text-blue-500 uppercase dark:text-blue-400">
          <Link2 size={11} />
          {relationCount} relations
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* Mode toggle */}
        <div className="bg-bg-card border-border-subtle flex items-center gap-0.5 rounded-md border p-0.5">
          <ModeBtn
            active={mode === "select"}
            onClick={modeChange("select")}
            title={t('selectDragTables')}
          >
            <Hand size={13} />
          </ModeBtn>
          <ModeBtn
            active={mode === "pan"}
            onClick={modeChange("pan")}
            title={t('panCanvas')}
          >
            <MousePointer2 size={13} />
          </ModeBtn>
        </div>

        {/* Filter */}
        <div className="bg-bg-card border-border-subtle flex items-center gap-0.5 rounded-md border p-0.5">
          <FilterBtn
            active={filter === "all"}
            onClick={filterChange("all")}
          >
            {t('both')}
          </FilterBtn>
          <FilterBtn
            active={filter === "tables"}
            onClick={filterChange("tables")}
          >
            {t('tablesOnly')}
          </FilterBtn>
          <FilterBtn
            active={filter === "relations"}
            onClick={filterChange("relations")}
          >
            {t('relationsFocus')}
          </FilterBtn>
        </div>

        <span className="bg-border-subtle/70 hidden h-5 w-px shrink-0 md:block" />

        <ActionBtn onClick={onAutoLayout} title={t('autoArrange')}>
          <Wand2 size={13} />
          {t('autoLayout')}
        </ActionBtn>
        {/* <ActionBtn onClick={onExport} title="Export PNG">
          <Download size={13} />
          Export
        </ActionBtn> */}
        <span className="text-text-muted/60 ml-1 hidden items-center gap-1 text-[10.5px] lg:flex">
          <Layers size={11} />
          PK · FK · NN · UQ
        </span>
      </div>
    </div>
  );
};
