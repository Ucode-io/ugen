"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ChevronDown,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layout,
  Database,
  Columns3,
  FolderPlus,
  FolderOpen,
  ListTree,
  GitBranch,
  Layers,
  Palette,
  Zap,
  Cpu,
  Package,
  Code2,
  ShieldCheck,
  Wrench,
  UploadCloud,
  Upload,
  FileCode,
  FileEdit,
  FilePlus,
  Component,
  Paintbrush,
  ScanSearch,
  FileDiff,
  MousePointerClick,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";

// ─── Icon name → Lucide component map ─────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  brain: Brain,
  layout: Layout,
  database: Database,
  columns: Columns3,
  "folder-plus": FolderPlus,
  "folder-open": FolderOpen,
  "list-tree": ListTree,
  "git-branch": GitBranch,
  layers: Layers,
  palette: Palette,
  zap: Zap,
  cpu: Cpu,
  package: Package,
  "check-circle": CheckCircle2,
  "code-2": Code2,
  "shield-check": ShieldCheck,
  wrench: Wrench,
  "upload-cloud": UploadCloud,
  upload: Upload,
  "file-code": FileCode,
  "file-edit": FileEdit,
  "file-plus": FilePlus,
  component: Component,
  paintbrush: Paintbrush,
  "scan-search": ScanSearch,
  "file-diff": FileDiff,
  "mouse-pointer-click": MousePointerClick,
  "alert-circle": AlertCircle,
};

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SseEvent<T = any> {
  type: string;
  message?: string;
  value?: string;
  icon?: string;
  percent?: number;
  data?: T;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface Thought {
  id: string;
  text: string;
  kind: "info" | "success" | "warning" | "error" | "done";
  type: string; // raw SSE event type
  percent?: number;
  durationSec?: number | null;
  icon?: string;
  value?: string;
}

// ─── Event → thought transformation ───────────────────────────────────────────

function eventsToThoughts(events: SseEvent[]): {
  thoughts: Thought[];
  isDone: boolean;
  error: string | null;
  doneDuration: number | null;
} {
  const thoughts: Thought[] = [];
  let isDone = false;
  let error: string | null = null;
  let doneDuration: number | null = null;

  events.forEach((ev, idx) => {
    const id = `${idx}-${ev.type}`;

    switch (ev.type) {
      case "progress":
        if (ev.message) {
          thoughts.push({ id, text: ev.message, kind: "info", type: ev.type, percent: ev.percent, icon: ev.icon, value: ev.value });
        }
        break;

      case "plan": {
        const projectName = ev.data?.project_name;
        const projectType = ev.data?.project_type;
        const tables: string[] = ev.data?.tables ?? [];
        const parts: string[] = [];
        if (ev.message) parts.push(ev.message);
        if (projectName) {
          parts.push(`Проект: **${projectName}**${projectType ? ` (${projectType})` : ""}`);
        }
        if (tables.length) {
          parts.push(`Таблицы: ${tables.join(", ")}`);
        }
        if (parts.length) {
          thoughts.push({
            id,
            text: parts.join("\n"),
            kind: "info",
            type: ev.type,
            percent: ev.percent,
            icon: ev.icon,
            value: ev.value,
          });
        }
        break;
      }

      case "manifest": {
        const total = ev.data?.total_files;
        const features: string[] = ev.data?.feature_names ?? [];
        const parts: string[] = [];
        if (ev.message) parts.push(ev.message);
        if (total) parts.push(`Всего файлов: ${total}`);
        if (features.length) parts.push(`Модули: ${features.join(", ")}`);
        if (parts.length) {
          thoughts.push({
            id,
            text: parts.join("\n"),
            kind: "info",
            type: ev.type,
            percent: ev.percent,
            icon: ev.icon,
            value: ev.value,
          });
        }
        break;
      }

      case "table_start": {
        const label = ev.data?.label ?? ev.data?.table ?? ev.value;
        if (label) {
          thoughts.push({ id, text: `Создаю таблицу: ${label}`, kind: "info", type: ev.type, icon: ev.icon, value: ev.value });
        }
        break;
      }

      case "table_done": {
        const label = ev.data?.label ?? ev.data?.table ?? ev.value;
        if (label) {
          const fields = ev.data?.fields;
          thoughts.push({
            id,
            text: `Таблица ${label}${fields ? ` (${fields} полей)` : ""} готова`,
            kind: "success",
            type: ev.type,
            icon: ev.icon,
            value: ev.value,
          });
        }
        break;
      }

      case "chunk_start": {
        const feature = ev.data?.feature ?? ev.value;
        if (feature) {
          thoughts.push({
            id,
            text: `Генерирую модуль: ${feature}`,
            kind: "info",
            type: ev.type,
            icon: ev.icon,
            value: ev.value,
          });
        }
        break;
      }

      case "chunk_done": {
        const feature = ev.data?.feature ?? ev.value;
        const filesCount = ev.data?.files?.length ?? 0;
        if (feature) {
          thoughts.push({
            id,
            text: `Модуль ${feature}${filesCount ? ` — ${filesCount} файлов` : ""}`,
            kind: "success",
            type: ev.type,
            percent: ev.percent,
            icon: ev.icon,
            value: ev.value,
          });
        }
        break;
      }

      case "repair": {
        const file = ev.data?.file;
        thoughts.push({
          id,
          text: ev.message ?? (file ? `Исправляю: ${file}` : "Проверяю код"),
          kind: "warning",
          type: ev.type,
          percent: ev.percent,
          icon: ev.icon,
          value: ev.value,
        });
        break;
      }

      case "publish":
        if (ev.message) {
          thoughts.push({ id, text: ev.message, kind: "info", type: ev.type, percent: ev.percent, icon: ev.icon, value: ev.value });
        }
        break;

      case "done":
        isDone = true;
        doneDuration = ev.data?.duration_sec ?? null;
        thoughts.push({
          id,
          text: ev.message ?? "Готово",
          kind: "done",
          type: ev.type,
          percent: 100,
          durationSec: ev.data?.duration_sec ?? null,
          icon: ev.icon,
          value: ev.value,
        });
        break;

      case "error":
        error = ev.message ?? "Generation failed";
        thoughts.push({
          id,
          text: ev.message ?? "Ошибка генерации",
          kind: "error",
          type: ev.type,
          icon: ev.icon,
          value: ev.value,
        });
        break;

      default:
        if (ev.message) {
          thoughts.push({ id, text: ev.message, kind: "info", type: ev.type, percent: ev.percent, icon: ev.icon, value: ev.value });
        }
    }
  });

  return { thoughts, isDone, error, doneDuration };
}

// ─── Live duration counter (during streaming) ─────────────────────────────────

function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      startRef.current = null;
      return;
    }
    if (startRef.current === null) startRef.current = Date.now();

    const id = setInterval(() => {
      if (startRef.current !== null) {
        setSeconds(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(id);
  }, [active]);

  return seconds;
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}с`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}м ${s}с` : `${m}м`;
}

// ─── Inline-formatted thought text (supports **bold**) ────────────────────────

function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <React.Fragment key={i}>
            {parts.map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return (
                  <strong key={j} className="font-semibold text-text-main">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return <React.Fragment key={j}>{part}</React.Fragment>;
            })}
            {i < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </>
  );
}

// ─── Bouncing 3-dot indicator (active progress step) ──────────────────────────

function ProgressDots() {
  return (
    <span className="inline-flex items-center gap-[3px] ml-1.5 align-middle">
      <span className="w-1 h-1 rounded-full bg-primary/70 thinking-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1 h-1 rounded-full bg-primary/70 thinking-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-1 h-1 rounded-full bg-primary/70 thinking-bounce" style={{ animationDelay: "300ms" }} />
    </span>
  );
}

// ─── ThoughtRow ───────────────────────────────────────────────────────────────

function ThoughtRow({
  thought,
  isLatest,
  isStreaming,
}: {
  thought: Thought;
  isLatest: boolean;
  isStreaming: boolean;
}) {
  // Done — distinct row with green check, message, duration
  if (thought.kind === "done") {
    const durLabel =
      thought.durationSec !== null && thought.durationSec !== undefined
        ? formatDuration(thought.durationSec)
        : null;
    return (
      <div className="relative flex gap-2.5 py-1.5 animate-in fade-in slide-in-from-left-1 duration-300">
        <div className="relative shrink-0 flex justify-center w-3">
          <CheckCircle2 size={13} className="text-green-500 mt-[2px]" />
        </div>
        <div className="text-[12.5px] leading-relaxed flex-1 min-w-0">
          <span className="text-green-600 dark:text-green-400 font-medium">
            {thought.text}
          </span>
          {thought.value && (
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/25">{thought.value}</span>
          )}
          {durLabel && (
            <span className="text-text-muted/70 ml-1.5 text-[11px]">· {durLabel}</span>
          )}
        </div>
      </div>
    );
  }

  // Error — distinct row
  if (thought.kind === "error") {
    return (
      <div className="relative flex gap-2.5 py-1 animate-in fade-in slide-in-from-left-1 duration-300">
        <div className="relative shrink-0 flex justify-center w-3">
          <AlertTriangle size={12} className="text-destructive mt-[3px]" />
        </div>
        <div className="text-[12.5px] leading-relaxed text-destructive flex-1 min-w-0 break-words">
          {thought.text}
          {thought.value && (
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/25">{thought.value}</span>
          )}
        </div>
      </div>
    );
  }

  // Regular dot
  const dotClass =
    thought.kind === "success"
      ? "bg-green-500"
      : thought.kind === "warning"
      ? "bg-amber-500"
      : "bg-primary/60";

  const iconColorClass =
    thought.kind === "success"
      ? "text-green-500"
      : thought.kind === "warning"
      ? "text-amber-500"
      : "text-primary/70";

  const IconComp = thought.icon ? ICON_MAP[thought.icon] : null;
  const showProgressDots = isLatest && isStreaming && thought.type === "progress";

  return (
    <div className="relative flex gap-2.5 py-1 animate-in fade-in slide-in-from-left-1 duration-300">
      <div className="relative shrink-0 flex justify-center w-3">
        {IconComp ? (
          <IconComp
            size={12}
            className={cn(
              "mt-1",
              iconColorClass,
              isLatest && isStreaming && "animate-pulse"
            )}
          />
        ) : (
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full mt-[7px]",
              dotClass,
              isLatest && isStreaming && "animate-pulse"
            )}
          />
        )}
      </div>
      <div className="text-[12.5px] leading-relaxed text-text-muted flex-1 min-w-0 break-words">
        <FormattedText text={thought.text} />
        {thought.value && (
          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/25">{thought.value}</span>
        )}
        {showProgressDots && <ProgressDots />}
      </div>
    </div>
  );
}

// ─── ThinkingBlock ────────────────────────────────────────────────────────────

export interface ThinkingBlockProps {
  events: SseEvent[];
  isStreaming?: boolean;
  className?: string;
}

export function ThinkingBlock({
  events,
  isStreaming = true,
  className,
}: ThinkingBlockProps) {
  const { thoughts, isDone, error, doneDuration } = useMemo(
    () => eventsToThoughts(events),
    [events]
  );

  const isActive = isStreaming && !isDone && !error;
  const elapsed = useElapsedSeconds(isActive);

  const [isOpen, setIsOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Collapse the accordion once generation is done, leaving a tidy
  // "Размышлял Xс" summary. Guarded by a ref so the user can re-open it
  // afterwards without it snapping shut again.
  const collapsedOnDoneRef = useRef(false);
  useEffect(() => {
    if (isDone && !collapsedOnDoneRef.current) {
      collapsedOnDoneRef.current = true;
      setIsOpen(false);
    }
  }, [isDone]);

  // Auto-scroll thought list to bottom whenever thoughts grow
  useEffect(() => {
    if (!isOpen) return;
    const el = scrollRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [thoughts.length, isOpen]);

  // ── Header label & icon ──
  let headerLabel: React.ReactNode;
  let headerIcon: React.ReactNode;

  if (error) {
    headerLabel = <span className="text-destructive">Ошибка генерации</span>;
    headerIcon = <AlertTriangle size={13} className="text-destructive shrink-0" />;
  } else if (isDone) {
    const dur = doneDuration ?? elapsed;
    headerLabel = <span className="text-text-main">Размышлял {formatDuration(dur)}</span>;
    headerIcon = <CheckCircle2 size={13} className="text-green-500 shrink-0" />;
  } else {
    headerLabel = (
      <span className="text-text-main shimmer-text">
        Размышляю{elapsed > 0 ? `… ${formatDuration(elapsed)}` : "…"}
      </span>
    );
    headerIcon = <Brain size={13} className="text-primary shrink-0 animate-pulse" />;
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Inline keyframes (scoped via style tag) */}
      <style>{`
        @keyframes thinking-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-text {
          background: linear-gradient(
            90deg,
            var(--text-muted, #9ca3af) 0%,
            var(--text-main, #111827) 50%,
            var(--text-muted, #9ca3af) 100%
          );
          background-size: 200% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: thinking-shimmer 2.5s linear infinite;
        }
        @keyframes thinking-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-3px); opacity: 1; }
        }
        .thinking-bounce {
          display: inline-block;
          animation: thinking-bounce 1.2s ease-in-out infinite both;
        }
      `}</style>

      {/* ── Header ── */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 py-1 px-1 -mx-1 rounded-md hover:bg-hover-bg/40 transition-colors text-left w-fit max-w-full"
      >
        {headerIcon}
        <span className="text-[12.5px] font-medium truncate">{headerLabel}</span>
        {thoughts.length > 0 && (
          <span className="text-[10px] text-text-muted/60 tabular-nums shrink-0">
            {thoughts.length}
          </span>
        )}
        <ChevronDown
          size={14}
          className={cn(
            "text-text-muted/70 shrink-0 transition-transform duration-300",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* ── Expanded thought stream ── */}
      {isOpen && thoughts.length > 0 && (
        <div className="mt-1.5">
          <div ref={scrollRef} className="relative pl-1 max-h-70 overflow-y-auto">
            {/* Vertical guide line */}
            <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border-subtle/50" />

            <div className="relative flex flex-col">
              {thoughts.map((t, i) => (
                <ThoughtRow
                  key={t.id}
                  thought={t}
                  isLatest={i === thoughts.length - 1}
                  isStreaming={isActive}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
