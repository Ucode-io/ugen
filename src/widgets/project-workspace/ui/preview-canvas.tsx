"use client";

// Figma/base44-style canvas: every page of the generated app is rendered as its
// own live iframe frame on a pan/zoomable react-flow surface. Each frame boots
// the shared bundle at its own route (its srcDoc sets window.__PREVIEW_INITIAL_PATH__).
// Clicking a frame focuses it and hands its iframe element up so the existing
// visual editor (inspector + ElementStyleToolbar) can target that frame.
//
// Smoothness: frames load progressively (staggered srcDoc by index) behind a
// skeleton so five live apps don't hammer the network/CPU at once, and the node
// component is memoized so panning/zooming/selecting never reloads an iframe.

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  SelectionMode,
  getNodesBounds,
  useNodesState,
  useReactFlow,
  useStore,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Monitor,
  MousePointer2,
  Hand,
  StickyNote,
  Trash2,
  ChevronDown,
  Check,
  Bold,
  List,
  Image as ImageIcon,
  Loader2,
  Minus,
  Plus,
  Scan,
} from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import { fileService } from "@/shared/api/file-service";

const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 800;
const COLUMN_GAP = 160;
const ROW_GAP = 140;
const FRAME_LABEL_HEIGHT = 64;
const MAX_FRAME_HEIGHT = 4000;
const CANVAS_COLUMNS = 10; // frames per row; overflow wraps to the next row
const LOAD_STAGGER_MS = 220; // delay between each frame's first load
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 2;
// Initial mount: fit all frames with generous margin so the canvas opens as a
// base44-style overview — every page visible as a smaller thumbnail, not a
// couple of oversized frames. The floor only guards against a microscopic zoom
// (which would hide the dotted grid); the ceiling keeps a single short page
// from filling the whole screen.
const INITIAL_FIT_MIN_ZOOM = 0.18;
const INITIAL_FIT_MAX_ZOOM = 0.7;
const BUTTON_ZOOM_FACTOR = 1.25;
const WHEEL_ZOOM_SPEED = 0.0055;
// Sticky notes are sized to read at the canvas overview zoom (≈0.18–0.7), so the
// dimensions/text track the frame label scale rather than browser-UI scale.
const NOTE_WIDTH = 560;
const NOTE_MIN_HEIGHT = 400;
// The selected-note actions bar spans ~80% of the note's width (it scales with
// zoom alongside the note, so this is its width in unscaled canvas pixels).
const NOTE_BAR_WIDTH = Math.round(NOTE_WIDTH * 0.8);

type NoteStatus = "todo" | "in_progress" | "done";

const NOTE_STATUSES: Array<{
  value: NoteStatus;
  label: string;
  color: string;
}> = [
  { value: "todo", label: "To do", color: "#f97316" },
  { value: "in_progress", label: "In progress", color: "#3b82f6" },
  { value: "done", label: "Done", color: "#22c55e" },
];

// --- Note styling options (driven by the bottom actions bar) ---------------
type NoteColor = "white" | "yellow" | "orange" | "green" | "blue" | "purple";
type NoteFont = "sans" | "serif" | "mono" | "rounded";
type NoteFontSize = "small" | "medium" | "large" | "xl";

const NOTE_COLORS: Array<{
  value: NoteColor;
  bg: string;
  swatch: string;
  border: string;
}> = [
  { value: "white", bg: "#ffffff", swatch: "#ffffff", border: "#e4e7ec" },
  { value: "yellow", bg: "#fdf2c8", swatch: "#fbe7a1", border: "#f3dd96" },
  { value: "orange", bg: "#fde4cf", swatch: "#fbcfa4", border: "#f4c9a0" },
  { value: "green", bg: "#dbf3e1", swatch: "#bfe9cc", border: "#b3e3c2" },
  { value: "blue", bg: "#dbe9ff", swatch: "#bcd4ff", border: "#bcd2f7" },
  { value: "purple", bg: "#eadffb", swatch: "#d6c4f5", border: "#d8c9f3" },
];

const NOTE_FONTS: Array<{ value: NoteFont; label: string; stack: string }> = [
  {
    value: "sans",
    label: "Sans",
    stack: "var(--font-body, ui-sans-serif), system-ui, sans-serif",
  },
  {
    value: "serif",
    label: "Serif",
    stack: "ui-serif, Georgia, 'Times New Roman', serif",
  },
  {
    value: "mono",
    label: "Mono",
    stack: "ui-monospace, 'SF Mono', Menlo, monospace",
  },
  {
    value: "rounded",
    label: "Handwritten",
    stack: "'Comic Sans MS', 'Segoe Print', 'Bradley Hand', cursive",
  },
];

const NOTE_FONT_SIZES: Array<{
  value: NoteFontSize;
  label: string;
  short: string;
  px: number;
}> = [
  { value: "small", label: "Small", short: "S", px: 22 },
  { value: "medium", label: "Medium", short: "M", px: 28 },
  { value: "large", label: "Large", short: "L", px: 38 },
  { value: "xl", label: "Extra large", short: "XL", px: 50 },
];

const DEFAULT_NOTE_STYLE = {
  color: "yellow" as NoteColor,
  font: "sans" as NoteFont,
  fontSize: "medium" as NoteFontSize,
  bold: false,
  bulletList: false,
};

type NoteStylePatch = Partial<typeof DEFAULT_NOTE_STYLE>;

const noteColorDef = (c: NoteColor) =>
  NOTE_COLORS.find((o) => o.value === c) ?? NOTE_COLORS[1];
const noteFontDef = (f: NoteFont) =>
  NOTE_FONTS.find((o) => o.value === f) ?? NOTE_FONTS[0];
const noteFontSizeDef = (s: NoteFontSize) =>
  NOTE_FONT_SIZES.find((o) => o.value === s) ?? NOTE_FONT_SIZES[1];

// Bullet-list helpers — a plain textarea stays editable; we just maintain a
// "• " prefix per non-empty line so the list survives typing and persistence.
const addBullets = (text: string): string => {
  if (text.trim() === "") return "• ";
  return text
    .split("\n")
    .map((line) =>
      line.trim() === "" || line.startsWith("• ") ? line : `• ${line}`,
    )
    .join("\n");
};
const stripBullets = (text: string): string =>
  text
    .split("\n")
    .map((line) => line.replace(/^•\s?/, ""))
    .join("\n");

const EMPTY_EDGES: [] = [];

type Tool = "pointer" | "hand" | "note";

export interface CanvasPage {
  id: string;
  name: string;
  path: string;
  srcDoc: string;
}

type PageNodeData = {
  page: CanvasPage;
  index: number;
  focused: boolean;
  frameHeight: number;
  refreshKey: number;
  onFocus: (id: string, el: HTMLIFrameElement | null) => void;
  onFrameHeightChange: (id: string, height: number) => void;
};

type PageFrameNodeType = Node<PageNodeData, "pageFrame">;

const PageFrameNode = memo(function PageFrameNode({
  data,
  selected,
}: NodeProps<PageFrameNodeType>) {
  const {
    page,
    index,
    focused,
    frameHeight,
    refreshKey,
    onFocus,
    onFrameHeightChange,
  } = data;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  // Stagger the first load so the frames come up one after another instead of
  // all at once (the main source of canvas jank).
  const [armed, setArmed] = useState(false);
  const active = focused || selected;

  useEffect(() => {
    setLoaded(false);
    setArmed(false);
    const t = setTimeout(() => setArmed(true), index * LOAD_STAGGER_MS);
    return () => clearTimeout(t);
  }, [index, page.srcDoc]);

  const measureFrameHeight = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    const body = doc?.body;
    const root = doc?.documentElement;
    if (!body || !root) return;

    // Content height only (scrollHeight). offset/clientHeight track the iframe's
    // own viewport — i.e. the height we just set — which ratchets the frame so it
    // can only ever grow and never settle back down.
    const nextHeight = Math.ceil(
      Math.max(FRAME_HEIGHT, body.scrollHeight, root.scrollHeight),
    );
    if (!Number.isFinite(nextHeight)) return;
    onFrameHeightChange(
      page.id,
      Math.min(MAX_FRAME_HEIGHT, Math.max(FRAME_HEIGHT, nextHeight)),
    );
  }, [onFrameHeightChange, page.id]);

  // Coalesce bursts of resize/mutation callbacks into a single measurement per
  // animation frame. Measuring synchronously on every DOM mutation made the
  // height thrash and the frame visibly jump/flicker while the app loaded. The
  // rAF id doubles as the "already scheduled" flag.
  const measureRafRef = useRef(0);
  const scheduleMeasure = useCallback(() => {
    if (measureRafRef.current) return;
    measureRafRef.current = requestAnimationFrame(() => {
      measureRafRef.current = 0;
      measureFrameHeight();
    });
  }, [measureFrameHeight]);

  useEffect(() => {
    if (!loaded) return;
    const doc = iframeRef.current?.contentDocument;
    const body = doc?.body;
    const root = doc?.documentElement;
    if (!body || !root) return;

    scheduleMeasure();
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(body);
    resizeObserver.observe(root);
    // childList/subtree only — NOT attributes. Attribute churn (class/style on
    // every hover/transition) fired constantly and added nothing the
    // ResizeObserver doesn't already catch.
    // A few settling measurements cover late data/images without running an
    // interval in every live iframe. ResizeObserver handles normal reflow.
    const settleTimers = [800, 2200, 4500].map((delay) =>
      window.setTimeout(scheduleMeasure, delay),
    );

    return () => {
      if (measureRafRef.current) cancelAnimationFrame(measureRafRef.current);
      measureRafRef.current = 0;
      resizeObserver.disconnect();
      settleTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [loaded, scheduleMeasure]);

  return (
    <div style={{ width: FRAME_WIDTH }}>
      <div className="mb-4 flex items-end justify-between gap-3 px-1">
        <span
          className={cn(
            "flex min-w-0 items-baseline gap-3 truncate text-[34px] font-semibold leading-none transition-colors",
            // Labels sit on the canvas background (bg-main), which is near-black
            // in dark mode — use the theme text token so they stay visible in
            // both themes (gray-700 was invisible on the dark canvas).
            active ? "text-primary" : "text-text-main",
          )}
        >
          <span className="truncate">{page.name}</span>
          <span className="text-text-muted shrink-0 text-[22px] font-normal">
            {page.path}
          </span>
        </span>
        <Monitor
          className={cn(
            "h-7 w-7 shrink-0 transition-colors",
            active ? "text-primary" : "text-text-muted",
          )}
        />
      </div>
      <div
        className={cn(
          // transition only border/shadow (selection state). NOT height — the
          // frame height changes as the app settles, and animating it made every
          // measurement stutter.
          "relative overflow-hidden rounded-md border-2 bg-white transition-[border-color,box-shadow]",
          // Selected: bold primary border + glow ring so it clearly stands out.
          // Unselected: neutral gray (was blue-500/70 — indistinguishable from
          // the primary blue, so you couldn't tell which page was selected).
          active
            ? "border-primary ring-4 ring-primary/40 shadow-2xl"
            : "border-gray-200 shadow-md hover:border-gray-300",
        )}
        style={{ width: FRAME_WIDTH, height: frameHeight }}
      >
        {/* Skeleton until the frame's app has painted. */}
        {!loaded && (
          <div className="absolute inset-0 flex flex-col gap-4 bg-gray-50 p-8">
            <div className="h-8 w-1/3 animate-pulse rounded bg-gray-200" />
            <div className="h-40 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-1/2 animate-pulse rounded bg-gray-200" />
          </div>
        )}
        {armed && (
          <iframe
            key={refreshKey}
            ref={iframeRef}
            title={page.name}
            srcDoc={page.srcDoc}
            onLoad={() => {
              setLoaded(true);
              measureFrameHeight();
              if (focused) onFocus(page.id, iframeRef.current);
            }}
            className={cn(
              "h-full w-full border-none bg-white transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0",
            )}
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads"
          />
        )}
        {/* When not focused, an overlay captures the click to focus the frame
            (so the inner iframe doesn't swallow it). Focusing removes the
            overlay so the user can interact with / edit the live page. The
            click still bubbles to react-flow, which also marks it selected. */}
        {!focused && (
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => onFocus(page.id, iframeRef.current)}
          />
        )}
      </div>
    </div>
  );
});

// --- Sticky notes -----------------------------------------------------------
// Notes are first-class react-flow nodes so they pan/zoom/drag in the same
// coordinate space as the page frames for free (no separate overlay to keep in
// sync). Each note is draggable except its textarea (`nodrag`), which stays
// editable, and scrolling inside it never pans the canvas (`nowheel`).

type NoteNodeData = {
  text: string;
  status: NoteStatus;
  color: NoteColor;
  font: NoteFont;
  fontSize: NoteFontSize;
  bold: boolean;
  bulletList: boolean;
  /** Set on freshly-placed notes so the textarea focuses on mount (not on load). */
  autoFocus?: boolean;
  onChange: (id: string, text: string) => void;
  onStatusChange: (id: string, status: NoteStatus) => void;
  onDelete: (id: string) => void;
};

type NoteNodeType = Node<NoteNodeData, "note">;

const NoteNode = memo(function NoteNode({
  id,
  data,
  selected,
}: NodeProps<NoteNodeType>) {
  const {
    text,
    status,
    color,
    font,
    fontSize,
    bold,
    bulletList,
    autoFocus,
    onChange,
    onStatusChange,
    onDelete,
  } = data;
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(text);
  const [statusOpen, setStatusOpen] = useState(false);
  const selectedStatus =
    NOTE_STATUSES.find((option) => option.value === status) ?? NOTE_STATUSES[0];
  const colorDef = noteColorDef(color);
  const fontDef = noteFontDef(font);
  const sizeDef = noteFontSizeDef(fontSize);

  // Keep typing local to this note. Updating the React Flow nodes array on every
  // keystroke made every iframe node participate in reconciliation.
  useEffect(() => {
    setDraft(text);
  }, [text]);

  useEffect(() => {
    if (draft === text) return;
    const timeout = window.setTimeout(() => onChange(id, draft), 180);
    return () => window.clearTimeout(timeout);
  }, [draft, id, onChange, text]);

  // Toggling the bullet-list option (from the actions bar) rewrites the draft so
  // existing lines gain/lose their "• " prefix.
  const prevBulletRef = useRef(bulletList);
  useEffect(() => {
    if (bulletList === prevBulletRef.current) return;
    prevBulletRef.current = bulletList;
    setDraft((prev) => (bulletList ? addBullets(prev) : stripBullets(prev)));
  }, [bulletList]);

  // While in list mode, Enter continues the list with a fresh bullet.
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (!bulletList || event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    const ta = event.currentTarget;
    const { selectionStart, selectionEnd, value } = ta;
    const insert = "\n• ";
    const next = value.slice(0, selectionStart) + insert + value.slice(selectionEnd);
    setDraft(next);
    requestAnimationFrame(() => {
      const caret = selectionStart + insert.length;
      ta.selectionStart = ta.selectionEnd = caret;
    });
  };

  return (
    <div
      style={{
        width: NOTE_WIDTH,
        minHeight: NOTE_MIN_HEIGHT,
        backgroundColor: colorDef.bg,
        borderColor: selected ? "#4f6bff" : colorDef.border,
      }}
      className={cn(
        "group relative flex flex-col rounded-2xl border p-7 text-[#344054] shadow-[0_8px_28px_rgba(16,24,40,0.10)] transition-[border-color,box-shadow]",
        selected
          ? "shadow-[0_12px_36px_rgba(47,102,255,0.18)] ring-2 ring-[#4f6bff]"
          : "hover:shadow-[0_10px_32px_rgba(16,24,40,0.14)]",
      )}
    >
      <button
        type="button"
        title="Delete note"
        onClick={() => onDelete(id)}
        className={cn(
          "nodrag absolute -top-3 -right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-[#344054] text-white shadow-md transition-opacity hover:bg-[#101828]",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <Trash2 size={16} />
      </button>

      <div className="nodrag nowheel relative self-start">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setStatusOpen((open) => !open);
          }}
          className="flex h-12 items-center gap-3 rounded-lg bg-[#f2f4f7] px-4 text-[20px] font-medium text-[#667085] transition-colors hover:bg-[#eaecf0]"
        >
          <span
            className="h-5 w-5 shrink-0 rounded-full"
            style={{ backgroundColor: selectedStatus.color }}
          />
          <span>{selectedStatus.label}</span>
          <ChevronDown
            size={20}
            className={cn("transition-transform", statusOpen && "rotate-180")}
          />
        </button>

        {statusOpen && (
          <div
            className="absolute top-[calc(100%+8px)] left-0 z-30 w-80 overflow-hidden rounded-xl border border-[#e4e7ec] bg-white shadow-[0_12px_32px_rgba(16,24,40,0.16)]"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[#eaecf0] px-5 py-4 text-[18px] font-semibold text-[#475467]">
              Status
            </div>
            <div className="p-2">
              {NOTE_STATUSES.map((option) => {
                const active = option.value === status;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onStatusChange(id, option.value);
                      setStatusOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-[18px] font-medium text-[#475467]",
                      active ? "bg-[#f2f4f7]" : "hover:bg-[#f9fafb]",
                    )}
                  >
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                    <span className="flex-1">{option.label}</span>
                    {active && <Check size={20} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <textarea
        ref={taRef}
        value={draft}
        autoFocus={autoFocus}
        placeholder="Type anything.."
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          fontFamily: fontDef.stack,
          fontSize: sizeDef.px,
          fontWeight: bold ? 700 : 400,
        }}
        className="nodrag nowheel mt-7 min-h-0 flex-1 resize-none border-none bg-transparent leading-[1.45] text-[#475467] outline-none placeholder:text-[#b4b7bd]"
      />

      <div className="mt-6 flex items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d0d5dd] bg-[#f9fafb] text-[20px] font-medium text-[#101828]">
          BN
        </div>
      </div>
    </div>
  );
});

type ImageNodeData = {
  src: string;
  width: number;
  height: number;
  onDelete: (id: string) => void;
};

type ImageNodeType = Node<ImageNodeData, "image">;

const ImageNode = memo(function ImageNode({
  id,
  data,
  selected,
}: NodeProps<ImageNodeType>) {
  const { src, width, height, onDelete } = data;
  return (
    <div
      style={{ width, height }}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-white shadow-[0_8px_28px_rgba(16,24,40,0.10)] transition-[border-color,box-shadow]",
        selected
          ? "border-[#4f6bff] shadow-[0_12px_36px_rgba(47,102,255,0.18)] ring-2 ring-[#4f6bff]"
          : "border-[#e4e7ec] hover:shadow-[0_10px_32px_rgba(16,24,40,0.14)]",
      )}
    >
      <button
        type="button"
        title="Delete image"
        onClick={() => onDelete(id)}
        className={cn(
          "nodrag absolute -top-3 -right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-[#344054] text-white shadow-md transition-opacity hover:bg-[#101828]",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <Trash2 size={16} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        className="pointer-events-none h-full w-full object-cover"
      />
    </div>
  );
});

const nodeTypes = {
  pageFrame: PageFrameNode,
  note: NoteNode,
  image: ImageNode,
};

type CanvasNodeType = PageFrameNodeType | NoteNodeType | ImageNodeType;

const isPageFrameNode = (n: CanvasNodeType): n is PageFrameNodeType =>
  n.type === "pageFrame";
const isNoteNode = (n: CanvasNodeType): n is NoteNodeType => n.type === "note";
const isImageNode = (n: CanvasNodeType): n is ImageNodeType =>
  n.type === "image";

// The largest a freshly-added image is placed at; bigger uploads scale down to
// fit (preserving aspect ratio) so they don't dominate the canvas.
const IMAGE_MAX_DIM = 480;

/** Resolve an image URL's natural pixel dimensions (for aspect-correct sizing). */
function loadImageDims(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

/** Fit (w, h) within an IMAGE_MAX_DIM box, preserving aspect ratio. */
function fitImageDims(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return { width: IMAGE_MAX_DIM, height: IMAGE_MAX_DIM };
  }
  const scale = Math.min(1, IMAGE_MAX_DIM / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

// Page-frame data carries only stable refs (callbacks) plus a few scalars, so a
// shallow compare tells us whether a rebuilt node would actually change anything
// the memoized PageFrameNode renders.
function pageDataEqual(a: PageNodeData, b: PageNodeData): boolean {
  return (
    a.page.id === b.page.id &&
    a.page.name === b.page.name &&
    a.page.path === b.page.path &&
    a.page.srcDoc === b.page.srcDoc &&
    a.index === b.index &&
    a.focused === b.focused &&
    a.frameHeight === b.frameHeight &&
    a.refreshKey === b.refreshKey &&
    a.onFocus === b.onFocus &&
    a.onFrameHeightChange === b.onFrameHeightChange
  );
}

// Rebuilding every node on each frame-height settle made the memoized
// PageFrameNode re-render (new `data` identity) for ALL frames whenever ANY
// frame resized — which re-measured them and thrashed the canvas during load.
// Reconcile instead: reuse the previous node (preserving its `data` identity and
// react-flow's `selected`/measured state) when nothing it renders changed, and
// only swap `position` (a cheap CSS transform the inner component never reads)
// when a taller sibling pushes a row. Result: a frame re-renders only when its
// own content changes.
function reconcilePageNodes(
  prev: PageFrameNodeType[],
  next: PageFrameNodeType[],
): PageFrameNodeType[] {
  const prevById = new Map(prev.map((n) => [n.id, n]));
  return next.map((n) => {
    const old = prevById.get(n.id);
    if (!old) return n;
    const dataSame = pageDataEqual(old.data, n.data);
    const posSame =
      old.position.x === n.position.x && old.position.y === n.position.y;
    if (dataSame && posSame) return old;
    return {
      ...old,
      position: posSame ? old.position : n.position,
      data: dataSame ? old.data : n.data,
    };
  });
}

interface PreviewCanvasProps {
  pages: CanvasPage[];
  focusedPageId: string | null;
  /** Bumped to force every frame's iframe to remount (e.g. on refresh/rebuild). */
  refreshKey: number;
  onFocusPage: (id: string, el: HTMLIFrameElement | null) => void;
  /** Clear the focused frame (clicking the empty canvas returns to overview). */
  onClearFocus?: () => void;
  /**
   * localStorage key for persisting sticky notes (project-scoped). Omit to keep
   * notes ephemeral for the session.
   */
  notesStorageKey?: string;
  /**
   * localStorage key for persisting canvas images (project-scoped). Omit to keep
   * images ephemeral for the session.
   */
  imagesStorageKey?: string;
  /** Project id used as the upload folder for canvas images. */
  projectId?: string;
}

interface BuildNodesProps extends PreviewCanvasProps {
  frameHeights: Record<string, number>;
  onFrameHeightChange: (id: string, height: number) => void;
}

function buildNodes(props: BuildNodesProps): PageFrameNodeType[] {
  const {
    pages,
    focusedPageId,
    frameHeights,
    refreshKey,
    onFocusPage,
    onFrameHeightChange,
  } = props;
  // Row-major grid: fill left-to-right up to CANVAS_COLUMNS per row, then wrap.
  // Each row's vertical offset is the tallest frame in the rows above it, so a
  // row of mixed-height pages stays top-aligned and rows never overlap.
  const columnCount = Math.min(CANVAS_COLUMNS, Math.max(1, pages.length));
  const rowOf = (index: number) => Math.floor(index / columnCount);

  const rowHeights: number[] = [];
  pages.forEach((page, i) => {
    const total =
      FRAME_LABEL_HEIGHT + (frameHeights[page.id] ?? FRAME_HEIGHT);
    const row = rowOf(i);
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, total);
  });
  const rowY: number[] = [];
  let accY = 0;
  for (let row = 0; row < rowHeights.length; row++) {
    rowY[row] = accY;
    accY += rowHeights[row] + ROW_GAP;
  }

  return pages.map((page, i) => {
    const frameHeight = frameHeights[page.id] ?? FRAME_HEIGHT;
    const column = i % columnCount;
    const position = {
      x: column * (FRAME_WIDTH + COLUMN_GAP),
      y: rowY[rowOf(i)],
    };

    return {
      id: page.id,
      type: "pageFrame",
      position,
      draggable: false,
      data: {
        page,
        index: i,
        focused: focusedPageId === page.id,
        frameHeight,
        refreshKey,
        onFocus: onFocusPage,
        onFrameHeightChange,
      },
    };
  });
}

const ToolButton = ({
  active,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  title: string;
  onClick?: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={cn(
      "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
      active
        ? "bg-text-main text-bg-main"
        : "text-text-muted hover:bg-hover-bg hover:text-text-main",
    )}
  >
    {children}
  </button>
);

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest("input, textarea, select, [contenteditable='true']");
};

function useSmoothCanvasZoom(viewportRef: RefObject<HTMLDivElement | null>) {
  const { fitView, getNodes, getViewport, setViewport } = useReactFlow();

  const zoomAtPoint = useCallback(
    (
      nextZoom: number,
      point: { x: number; y: number },
      duration = 0,
    ) => {
      const viewport = getViewport();
      const zoom = clampZoom(nextZoom);
      if (Math.abs(zoom - viewport.zoom) < 0.001) return;

      const nextViewport = {
        x: point.x - ((point.x - viewport.x) / viewport.zoom) * zoom,
        y: point.y - ((point.y - viewport.y) / viewport.zoom) * zoom,
        zoom,
      };

      void setViewport(
        nextViewport,
        duration > 0 ? { duration } : undefined,
      );
    },
    [getViewport, setViewport],
  );

  const zoomWithFactorAtPoint = useCallback(
    (factor: number, point: { x: number; y: number }, duration = 0) => {
      if (!Number.isFinite(factor) || factor <= 0) return;
      const viewport = getViewport();
      zoomAtPoint(viewport.zoom * factor, point, duration);
    },
    [getViewport, zoomAtPoint],
  );

  const zoomBy = useCallback(
    (direction: 1 | -1, duration = 260) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = getViewport();
      const nextZoom =
        direction > 0
          ? viewport.zoom * BUTTON_ZOOM_FACTOR
          : viewport.zoom / BUTTON_ZOOM_FACTOR;

      zoomAtPoint(
        nextZoom,
        { x: rect.width / 2, y: rect.height / 2 },
        duration,
      );
    },
    [getViewport, viewportRef, zoomAtPoint],
  );

  // Pan from a wheel/trackpad scroll forwarded by a focused frame. Screen-space
  // delta; content moves opposite the scroll, matching react-flow's panOnScroll
  // on the rest of the canvas.
  const panByScroll = useCallback(
    (dx: number, dy: number) => {
      const v = getViewport();
      void setViewport({ x: v.x - dx, y: v.y - dy, zoom: v.zoom });
    },
    [getViewport, setViewport],
  );

  // Pan from a drag inside a focused frame. The delta is in the frame's scaled
  // coordinate space, so multiply by zoom to get screen px; grab-pan moves the
  // content WITH the cursor.
  const panByDrag = useCallback(
    (dx: number, dy: number) => {
      const v = getViewport();
      void setViewport({
        x: v.x + dx * v.zoom,
        y: v.y + dy * v.zoom,
        zoom: v.zoom,
      });
    },
    [getViewport, setViewport],
  );

  const fitCanvas = useCallback(() => {
    void fitView({ duration: 320, padding: 0.08 });
  }, [fitView]);

  // Initial fit: anchor the FIRST page at the top-left and scale so the whole
  // row of pages fits the width — base44 behaviour (you start reading at page 1,
  // left-to-right, not centred on the middle/last frame). We compute this from
  // the measured node bounds instead of fitView() because fitView centres the
  // content and the prop-based fit ignores the min/max-zoom clamp. Returns true
  // once it has run against real (measured) bounds so the caller can stop
  // retrying.
  const fitInitial = useCallback(() => {
    const nodes = getNodes();
    if (!nodes.length) return false;
    const bounds = getNodesBounds(nodes);
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect || bounds.width < 1 || bounds.height < 1) return false;

    const pad = 48;
    const zoom = Math.min(
      INITIAL_FIT_MAX_ZOOM,
      Math.max(
        INITIAL_FIT_MIN_ZOOM,
        Math.min(
          (rect.width - pad * 2) / bounds.width,
          (rect.height - pad * 2) / bounds.height,
        ),
      ),
    );
    void setViewport({
      x: pad - bounds.x * zoom,
      y: pad - bounds.y * zoom,
      zoom,
    });
    return true;
  }, [getNodes, setViewport, viewportRef]);

  const handleCanvasWheel = useCallback(
    (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return false;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }

      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return true;
      let deltaY = event.deltaY;
      if (event.deltaMode === 1) deltaY *= 16;
      else if (event.deltaMode === 2) deltaY *= rect.height;
      const factor = Math.exp(-deltaY * WHEEL_ZOOM_SPEED);

      zoomWithFactorAtPoint(
        factor,
        {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        },
        0,
      );
      return true;
    },
    [viewportRef, zoomWithFactorAtPoint],
  );

  return {
    fitCanvas,
    fitInitial,
    handleCanvasWheel,
    panByDrag,
    panByScroll,
    zoomBy,
    zoomWithFactorAtPoint,
  };
}

function CanvasToolbar({
  tool,
  setTool,
  onAddImage,
  imageUploading,
}: {
  tool: Tool;
  setTool: (t: Tool) => void;
  onAddImage: () => void;
  imageUploading: boolean;
}) {
  return (
    <div className="absolute top-1/2 right-3 z-10 -translate-y-1/2">
      <div className="border-border-subtle bg-bg-card flex flex-col items-center gap-1 rounded-xl border p-1 shadow-lg">
        <ToolButton
          active={tool === "pointer"}
          title="Select (drag to select multiple)"
          onClick={() => setTool("pointer")}
        >
          <MousePointer2 size={16} />
        </ToolButton>
        <ToolButton
          active={tool === "hand"}
          title="Pan"
          onClick={() => setTool("hand")}
        >
          <Hand size={16} />
        </ToolButton>
        <div className="bg-border-subtle my-0.5 h-px w-5" />
        <ToolButton
          active={tool === "note"}
          title="Sticky note (click the canvas to place)"
          onClick={() => setTool("note")}
        >
          <StickyNote size={16} />
        </ToolButton>
        <ToolButton
          title={imageUploading ? "Uploading image…" : "Add image"}
          onClick={imageUploading ? undefined : onAddImage}
        >
          {imageUploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ImageIcon size={16} />
          )}
        </ToolButton>
      </div>
    </div>
  );
}

function CanvasZoomShortcuts({
  fitCanvas,
  handleCanvasWheel,
  panByDrag,
  panByScroll,
  viewportRef,
  zoomBy,
  zoomWithFactorAtPoint,
}: {
  fitCanvas: () => void;
  handleCanvasWheel: (event: WheelEvent) => boolean;
  panByDrag: (dx: number, dy: number) => void;
  panByScroll: (dx: number, dy: number) => void;
  viewportRef: RefObject<HTMLDivElement | null>;
  zoomBy: (direction: 1 | -1, duration?: number) => void;
  zoomWithFactorAtPoint: (
    factor: number,
    point: { x: number; y: number },
    duration?: number,
  ) => void;
}) {
  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;

    const preventGestureDefault = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const handleNativeWheel = (event: WheelEvent) => {
      handleCanvasWheel(event);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((!event.metaKey && !event.ctrlKey) || isEditableTarget(event.target)) {
        return;
      }

      const key = event.key;
      if (key !== "+" && key !== "=" && key !== "-" && key !== "_" && key !== "0") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (key === "0") fitCanvas();
      else zoomBy(key === "-" || key === "_" ? -1 : 1);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "CANVAS_ZOOM_SHORTCUT") {
        if (event.data.action === "fit") fitCanvas();
        else if (event.data.action === "in") zoomBy(1);
        else if (event.data.action === "out") zoomBy(-1);
        return;
      }

      // Pan forwarded from a focused frame (its iframe swallows the gesture).
      if (event.data?.type === "CANVAS_PAN_GESTURE") {
        panByScroll(Number(event.data.deltaX) || 0, Number(event.data.deltaY) || 0);
        return;
      }
      if (event.data?.type === "CANVAS_PAN_DRAG") {
        panByDrag(Number(event.data.deltaX) || 0, Number(event.data.deltaY) || 0);
        return;
      }

      if (event.data?.type !== "CANVAS_ZOOM_GESTURE") return;

      const viewportEl = viewportRef.current;
      if (!viewportEl) return;
      const sourceFrame = Array.from(
        viewportEl.querySelectorAll("iframe"),
      ).find((iframe) => iframe.contentWindow === event.source);
      if (!sourceFrame) return;

      const viewportRect = viewportEl.getBoundingClientRect();
      const frameRect = sourceFrame.getBoundingClientRect();
      const frameWidth = Math.max(1, Number(event.data.innerWidth) || FRAME_WIDTH);
      const frameHeight = Math.max(
        1,
        Number(event.data.innerHeight) || FRAME_HEIGHT,
      );
      const clientX = Number(event.data.clientX) || 0;
      const clientY = Number(event.data.clientY) || 0;
      const factor =
        typeof event.data.scaleFactor === "number"
          ? event.data.scaleFactor
          : Math.exp(-(Number(event.data.deltaY) || 0) * WHEEL_ZOOM_SPEED);

      zoomWithFactorAtPoint(
        factor,
        {
          x: frameRect.left + (clientX / frameWidth) * frameRect.width - viewportRect.left,
          y: frameRect.top + (clientY / frameHeight) * frameRect.height - viewportRect.top,
        },
        0,
      );
    };

    // Native, non-passive listeners are required for trackpad pinch. React's
    // synthetic wheel event can arrive too late to stop browser-level zoom.
    viewportEl.addEventListener("wheel", handleNativeWheel, {
      capture: true,
      passive: false,
    });
    viewportEl.addEventListener("gesturestart", preventGestureDefault, {
      capture: true,
      passive: false,
    } as AddEventListenerOptions);
    viewportEl.addEventListener("gesturechange", preventGestureDefault, {
      capture: true,
      passive: false,
    } as AddEventListenerOptions);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("message", handleMessage);
    return () => {
      viewportEl.removeEventListener("wheel", handleNativeWheel, {
        capture: true,
      } as EventListenerOptions);
      viewportEl.removeEventListener("gesturestart", preventGestureDefault, {
        capture: true,
      } as EventListenerOptions);
      viewportEl.removeEventListener("gesturechange", preventGestureDefault, {
        capture: true,
      } as EventListenerOptions);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("message", handleMessage);
    };
  }, [
    fitCanvas,
    handleCanvasWheel,
    panByDrag,
    panByScroll,
    viewportRef,
    zoomBy,
    zoomWithFactorAtPoint,
  ]);

  return null;
}

function ZoomControl({
  fitCanvas,
  zoomBy,
}: {
  fitCanvas: () => void;
  zoomBy: (direction: 1 | -1, duration?: number) => void;
}) {
  const zoom = useStore((s) => s.transform[2]);
  return (
    <div className="border-border-subtle bg-bg-card absolute right-5 bottom-5 z-10 flex items-center gap-1 rounded-xl border px-2 py-2 shadow-xl">
      <ToolButton title="Fit to screen" onClick={fitCanvas}>
        <Scan size={15} />
      </ToolButton>
      <div className="bg-border-subtle mx-0.5 h-4 w-px" />
      <ToolButton title="Zoom out" onClick={() => zoomBy(-1)}>
        <Minus size={15} />
      </ToolButton>
      <span className="text-text-main min-w-[48px] text-center text-sm font-semibold tabular-nums transition-colors">
        {Math.round(zoom * 100)}%
      </span>
      <ToolButton title="Zoom in" onClick={() => zoomBy(1)}>
        <Plus size={15} />
      </ToolButton>
    </div>
  );
}

// Floating actions bar shown beneath the selected sticky note. Rendered in
// screen space (not as a react-flow node) so it keeps a constant UI size at any
// canvas zoom, and it follows the note as you pan/zoom/drag by re-reading the
// node element's on-screen rect whenever the viewport transform or note changes.
const BarMenuButton = ({
  active,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={cn(
      "flex h-9 items-center gap-1 rounded-lg px-2 text-[15px] transition-colors",
      active
        ? "bg-text-main text-bg-main"
        : "text-text-main hover:bg-hover-bg",
    )}
  >
    {children}
  </button>
);

function NoteActionsBar({
  note,
  viewportRef,
  onStyleChange,
}: {
  note: NoteNodeType;
  viewportRef: RefObject<HTMLDivElement | null>;
  onStyleChange: (id: string, patch: NoteStylePatch) => void;
}) {
  const transform = useStore((s) => s.transform);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [menu, setMenu] = useState<null | "color" | "font" | "size">(null);

  // The bar lives in screen space (constant pixels), but the note is a canvas
  // node that scales with zoom. We size the bar to ~80% of the note's width and
  // scale it by the raw zoom so it always stays proportional to the note at any
  // zoom level (rendered width = BAR_WIDTH * zoom = 0.8 * note screen width).
  const zoom = transform[2];
  const scale = zoom;

  const { id, data } = note;
  const colorDef = noteColorDef(data.color);
  const fontDef = noteFontDef(data.font);
  const sizeDef = noteFontSizeDef(data.fontSize);

  // Re-anchor below the note on any pan/zoom (transform) or note move/resize.
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const el = vp.querySelector<HTMLElement>(
      `.react-flow__node[data-id="${CSS.escape(id)}"]`,
    );
    if (!el) {
      setPos(null);
      return;
    }
    const vpRect = vp.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const BAR_GAP = 18 * scale;
    const BAR_H = 56 * scale;
    const halfBar = (NOTE_BAR_WIDTH * scale) / 2;
    const top = Math.max(
      12,
      Math.min(r.bottom - vpRect.top + BAR_GAP, vpRect.height - BAR_H - 12),
    );
    const noteCenterX = r.left - vpRect.left + r.width / 2;
    const minLeft = halfBar + 8;
    const maxLeft = Math.max(minLeft, vpRect.width - halfBar - 8);
    const left = Math.min(Math.max(noteCenterX, minLeft), maxLeft);
    setPos({ left, top });
  }, [transform, scale, note, viewportRef, id]);

  // Close any open menu when selection moves to a different note.
  useEffect(() => setMenu(null), [id]);

  if (!pos) return null;

  return (
    <div
      className="absolute z-30"
      style={{
        left: pos.left,
        top: pos.top,
        width: NOTE_BAR_WIDTH,
        transform: `translateX(-50%) scale(${scale})`,
        transformOrigin: "top center",
      }}
      // Keep interactions off the canvas so picking a swatch/option doesn't
      // deselect the note or start a pan.
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="border-border-subtle bg-bg-card flex w-full items-center justify-between rounded-2xl border px-4 py-2 shadow-xl">
        {/* Background color */}
        <button
          type="button"
          title="Note color"
          onClick={() => setMenu((m) => (m === "color" ? null : "color"))}
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-hover-bg"
        >
          <span
            className="h-6 w-6 rounded-full border"
            style={{
              backgroundColor: colorDef.swatch,
              borderColor: colorDef.border,
            }}
          />
        </button>
        <div className="bg-border-subtle mx-0.5 h-5 w-px" />
        {/* Font family */}
        <BarMenuButton
          title="Font"
          active={menu === "font"}
          onClick={() => setMenu((m) => (m === "font" ? null : "font"))}
        >
          <span style={{ fontFamily: fontDef.stack }} className="text-[17px]">
            Aa
          </span>
          <ChevronDown size={14} />
        </BarMenuButton>
        {/* Font size */}
        <BarMenuButton
          title="Font size"
          active={menu === "size"}
          onClick={() => setMenu((m) => (m === "size" ? null : "size"))}
        >
          <span className="font-semibold">{sizeDef.short}</span>
          <ChevronDown size={14} />
        </BarMenuButton>
        <div className="bg-border-subtle mx-0.5 h-5 w-px" />
        {/* Bold */}
        <BarMenuButton
          title="Bold"
          active={data.bold}
          onClick={() => onStyleChange(id, { bold: !data.bold })}
        >
          <Bold size={16} />
        </BarMenuButton>
        {/* Bullet list */}
        <BarMenuButton
          title="Bullet list"
          active={data.bulletList}
          onClick={() => onStyleChange(id, { bulletList: !data.bulletList })}
        >
          <List size={16} />
        </BarMenuButton>
      </div>

      {/* Color palette */}
      {menu === "color" && (
        <div className="border-border-subtle bg-bg-card absolute top-[calc(100%+8px)] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl border p-3 shadow-xl">
          {NOTE_COLORS.map((option) => (
            <button
              key={option.value}
              type="button"
              title={option.value}
              onClick={() => {
                onStyleChange(id, { color: option.value });
                setMenu(null);
              }}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110",
                option.value === data.color && "ring-2 ring-[#4f6bff]",
              )}
            >
              <span
                className="h-7 w-7 rounded-full border"
                style={{
                  backgroundColor: option.swatch,
                  borderColor: option.border,
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Font family menu */}
      {menu === "font" && (
        <div className="border-border-subtle bg-bg-card absolute top-[calc(100%+8px)] left-1/2 flex -translate-x-1/2 flex-col rounded-2xl border p-2 shadow-xl">
          {NOTE_FONTS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onStyleChange(id, { font: option.value });
                setMenu(null);
              }}
              className={cn(
                "flex items-center justify-between gap-6 rounded-lg px-4 py-2 text-left transition-colors",
                option.value === data.font
                  ? "bg-hover-bg"
                  : "hover:bg-hover-bg",
              )}
            >
              <span
                style={{ fontFamily: option.stack }}
                className="text-text-main text-[22px] leading-none"
              >
                Aa
              </span>
              <span className="text-text-muted text-sm">{option.label}</span>
              {option.value === data.font && (
                <Check size={16} className="text-text-main" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Font size menu */}
      {menu === "size" && (
        <div className="border-border-subtle bg-bg-card absolute top-[calc(100%+8px)] left-1/2 flex w-44 -translate-x-1/2 flex-col rounded-2xl border p-2 shadow-xl">
          {NOTE_FONT_SIZES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onStyleChange(id, { fontSize: option.value });
                setMenu(null);
              }}
              className={cn(
                "flex items-center justify-between rounded-lg px-4 py-2 text-left text-[15px] transition-colors",
                option.value === data.fontSize
                  ? "text-text-main bg-hover-bg font-medium"
                  : "text-text-main hover:bg-hover-bg",
              )}
            >
              <span>{option.label}</span>
              {option.value === data.fontSize && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CanvasInner(props: PreviewCanvasProps) {
  const [tool, setTool] = useState<Tool>("pointer");
  const [frameHeights, setFrameHeights] = useState<Record<string, number>>({});
  const viewportRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const {
    fitCanvas,
    fitInitial,
    handleCanvasWheel,
    panByDrag,
    panByScroll,
    zoomBy,
    zoomWithFactorAtPoint,
  } = useSmoothCanvasZoom(viewportRef);
  const didInitialFitRef = useRef(false);
  const handleFrameHeightChange = useCallback((id: string, height: number) => {
    setFrameHeights((prev) => {
      // Ignore sub-16px wobble so minor reflow during load doesn't reposition
      // every node (and visibly jitter the whole canvas).
      if (Math.abs((prev[id] ?? FRAME_HEIGHT) - height) < 16) return prev;
      return { ...prev, [id]: height };
    });
  }, []);
  // Start empty and let the re-sync effect populate (and reconcile) the page
  // frames — building them here too would just be discarded work every render.
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNodeType>([]);

  // --- Sticky notes ---------------------------------------------------------
  const handleNoteTextChange = useCallback(
    (id: string, text: string) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id && isNoteNode(n) ? { ...n, data: { ...n.data, text } } : n,
        ),
      );
    },
    [setNodes],
  );
  const handleNoteDelete = useCallback(
    (id: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== id));
    },
    [setNodes],
  );
  const handleNoteStatusChange = useCallback(
    (id: string, status: NoteStatus) => {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === id && isNoteNode(node)
            ? { ...node, data: { ...node.data, status } }
            : node,
        ),
      );
    },
    [setNodes],
  );
  const handleNoteStyleChange = useCallback(
    (id: string, patch: NoteStylePatch) => {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === id && isNoteNode(node)
            ? { ...node, data: { ...node.data, ...patch } }
            : node,
        ),
      );
    },
    [setNodes],
  );
  const makeNoteNode = useCallback(
    (
      id: string,
      position: { x: number; y: number },
      init: {
        text?: string;
        status?: NoteStatus;
        color?: NoteColor;
        font?: NoteFont;
        fontSize?: NoteFontSize;
        bold?: boolean;
        bulletList?: boolean;
        autoFocus?: boolean;
      } = {},
    ): NoteNodeType => ({
      id,
      type: "note",
      position,
      draggable: true,
      data: {
        text: init.text ?? "",
        status: init.status ?? "todo",
        color: init.color ?? DEFAULT_NOTE_STYLE.color,
        font: init.font ?? DEFAULT_NOTE_STYLE.font,
        fontSize: init.fontSize ?? DEFAULT_NOTE_STYLE.fontSize,
        bold: init.bold ?? DEFAULT_NOTE_STYLE.bold,
        bulletList: init.bulletList ?? DEFAULT_NOTE_STYLE.bulletList,
        autoFocus: init.autoFocus ?? false,
        onChange: handleNoteTextChange,
        onStatusChange: handleNoteStatusChange,
        onDelete: handleNoteDelete,
      },
    }),
    [handleNoteTextChange, handleNoteStatusChange, handleNoteDelete],
  );
  const createNoteAt = useCallback(
    (flowPos: { x: number; y: number }) => {
      const id = `note-${
        globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)
      }`;
      // Center the note under the cursor.
      setNodes((prev) => [
        ...prev,
        makeNoteNode(
          id,
          { x: flowPos.x - NOTE_WIDTH / 2, y: flowPos.y - 28 },
          { autoFocus: true },
        ),
      ]);
    },
    [makeNoteNode, setNodes],
  );

  // --- Images ---------------------------------------------------------------
  const { projectId } = props;
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const handleImageDelete = useCallback(
    (id: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== id));
    },
    [setNodes],
  );
  const makeImageNode = useCallback(
    (
      id: string,
      position: { x: number; y: number },
      init: { src: string; width: number; height: number },
    ): ImageNodeType => ({
      id,
      type: "image",
      position,
      draggable: true,
      data: {
        src: init.src,
        width: init.width,
        height: init.height,
        onDelete: handleImageDelete,
      },
    }),
    [handleImageDelete],
  );
  // Drop a new image at the center of the current viewport.
  const placeImageAtViewportCenter = useCallback(
    (src: string, width: number, height: number) => {
      const id = `image-${
        globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)
      }`;
      const vp = viewportRef.current;
      const rect = vp?.getBoundingClientRect();
      const center = rect
        ? screenToFlowPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          })
        : { x: 0, y: 0 };
      setNodes((prev) => [
        ...prev,
        makeImageNode(
          id,
          { x: center.x - width / 2, y: center.y - height / 2 },
          { src, width, height },
        ),
      ]);
    },
    [makeImageNode, screenToFlowPosition, setNodes],
  );
  const openImagePicker = useCallback(() => {
    imageInputRef.current?.click();
  }, []);
  const handleImageFile = useCallback(
    async (file: File) => {
      setImageUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const result = await fileService.folderUpload(formData, {
          folder_name: projectId || "canvas-images",
        });
        const cdn =
          process.env.NEXT_PUBLIC_CDN_BASE_URL || "https://cdn.u-code.io";
        const link = (result as { data?: { link?: string } })?.data?.link;
        const url = link ? `${cdn}/${link}` : null;
        if (!url) return;
        let dims = { width: IMAGE_MAX_DIM, height: IMAGE_MAX_DIM };
        try {
          dims = await loadImageDims(url);
        } catch {
          // fall back to the default square if the URL won't load for sizing
        }
        const fitted = fitImageDims(dims.width, dims.height);
        placeImageAtViewportCenter(url, fitted.width, fitted.height);
      } catch (err) {
        console.error("[canvas image] upload failed", err);
      } finally {
        setImageUploading(false);
      }
    },
    [projectId, placeImageAtViewportCenter],
  );

  // Load persisted notes once per storage key (project). Loaded notes never set
  // autoFocus so they don't steal focus on canvas open.
  const { notesStorageKey } = props;
  const notesLoadedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!notesStorageKey || notesLoadedKeyRef.current === notesStorageKey) return;
    notesLoadedKeyRef.current = notesStorageKey;
    try {
      const raw = window.localStorage.getItem(notesStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<{
        id: string;
        x: number;
        y: number;
        text: string;
        status?: NoteStatus;
        color?: NoteColor;
        font?: NoteFont;
        fontSize?: NoteFontSize;
        bold?: boolean;
        bulletList?: boolean;
      }>;
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      setNodes((prev) => {
        const existing = new Set(prev.map((n) => n.id));
        const loaded = parsed
          .filter((p) => p?.id && !existing.has(p.id))
          .map((p) =>
            makeNoteNode(p.id, { x: Number(p.x) || 0, y: Number(p.y) || 0 }, {
              text: p.text ?? "",
              status: p.status ?? "todo",
              color: p.color,
              font: p.font,
              fontSize: p.fontSize,
              bold: p.bold,
              bulletList: p.bulletList,
            }),
          );
        return loaded.length ? [...prev, ...loaded] : prev;
      });
    } catch {
      // corrupt/blocked storage — start with no notes.
    }
  }, [notesStorageKey, makeNoteNode, setNodes]);

  // Persist after interaction settles. Writing localStorage on every pointer
  // move blocked the main thread while dragging notes and made pan/zoom stutter.
  const lastSavedNotesRef = useRef<string>("");
  useEffect(() => {
    // Never persist before this key's existing notes have been loaded/merged,
    // or we'd clobber them with the still-stale node set (e.g. mid project swap).
    if (!notesStorageKey || notesLoadedKeyRef.current !== notesStorageKey) return;
    const timeout = window.setTimeout(() => {
      const serialized = JSON.stringify(
        nodes
          .filter(isNoteNode)
          .map((node) => ({
            id: node.id,
            x: Math.round(node.position.x),
            y: Math.round(node.position.y),
            text: node.data.text,
            status: node.data.status,
            color: node.data.color,
            font: node.data.font,
            fontSize: node.data.fontSize,
            bold: node.data.bold,
            bulletList: node.data.bulletList,
          })),
      );
      if (serialized === lastSavedNotesRef.current) return;
      lastSavedNotesRef.current = serialized;
      try {
        window.localStorage.setItem(notesStorageKey, serialized);
      } catch {
        // storage full/blocked — keep notes for the session only.
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [nodes, notesStorageKey]);

  // Load persisted images once per storage key (project), mirroring notes.
  const { imagesStorageKey } = props;
  const imagesLoadedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!imagesStorageKey || imagesLoadedKeyRef.current === imagesStorageKey)
      return;
    imagesLoadedKeyRef.current = imagesStorageKey;
    try {
      const raw = window.localStorage.getItem(imagesStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<{
        id: string;
        x: number;
        y: number;
        src: string;
        width: number;
        height: number;
      }>;
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      setNodes((prev) => {
        const existing = new Set(prev.map((n) => n.id));
        const loaded = parsed
          .filter((p) => p?.id && p?.src && !existing.has(p.id))
          .map((p) =>
            makeImageNode(
              p.id,
              { x: Number(p.x) || 0, y: Number(p.y) || 0 },
              {
                src: p.src,
                width: Number(p.width) || IMAGE_MAX_DIM,
                height: Number(p.height) || IMAGE_MAX_DIM,
              },
            ),
          );
        return loaded.length ? [...prev, ...loaded] : prev;
      });
    } catch {
      // corrupt/blocked storage — start with no images.
    }
  }, [imagesStorageKey, makeImageNode, setNodes]);

  // Persist images after interaction settles (same debounce rationale as notes).
  const lastSavedImagesRef = useRef<string>("");
  useEffect(() => {
    if (
      !imagesStorageKey ||
      imagesLoadedKeyRef.current !== imagesStorageKey
    )
      return;
    const timeout = window.setTimeout(() => {
      const serialized = JSON.stringify(
        nodes.filter(isImageNode).map((node) => ({
          id: node.id,
          x: Math.round(node.position.x),
          y: Math.round(node.position.y),
          src: node.data.src,
          width: node.data.width,
          height: node.data.height,
        })),
      );
      if (serialized === lastSavedImagesRef.current) return;
      lastSavedImagesRef.current = serialized;
      try {
        window.localStorage.setItem(imagesStorageKey, serialized);
      } catch {
        // storage full/blocked — keep images for the session only.
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [nodes, imagesStorageKey]);

  // Re-sync page frames when pages, focus, or the refresh signal changes, while
  // leaving note nodes untouched. The node component is memoized and iframes are
  // keyed by refreshKey, so this never reloads a frame unless its content
  // actually changed (see reconcilePageNodes).
  const { pages, focusedPageId, refreshKey, onFocusPage } = props;
  useEffect(() => {
    setNodes((prev) => {
      // Keep every non-frame overlay (notes + images) untouched.
      const overlays = prev.filter((n) => !isPageFrameNode(n));
      const pageNodes = reconcilePageNodes(
        prev.filter(isPageFrameNode),
        buildNodes({
          pages,
          focusedPageId,
          frameHeights,
          refreshKey,
          onFocusPage,
          onFrameHeightChange: handleFrameHeightChange,
        }),
      );
      return [...pageNodes, ...overlays];
    });
  }, [
    pages,
    focusedPageId,
    frameHeights,
    refreshKey,
    onFocusPage,
    handleFrameHeightChange,
    setNodes,
  ]);

  // The actions bar targets a single selected note; hide it during multi-select.
  const selectedNote = useMemo<NoteNodeType | null>(() => {
    const selected = nodes.filter(
      (n): n is NoteNodeType => isNoteNode(n) && !!n.selected,
    );
    return selected.length === 1 ? selected[0] : null;
  }, [nodes]);

  const { onClearFocus } = props;
  const handlePaneClick = useCallback(
    (event: ReactMouseEvent) => {
      if (tool === "note") {
        createNoteAt(
          screenToFlowPosition({ x: event.clientX, y: event.clientY }),
        );
        setTool("pointer");
        return;
      }
      onClearFocus?.();
    },
    [tool, createNoteAt, screenToFlowPosition, onClearFocus],
  );

  // Run the initial fit the moment react-flow reports measured node dimensions
  // (a fixed timeout races measurement and the fit silently no-ops). fitInitial
  // returns false until it has real bounds, so we keep trying until it sticks.
  const handleNodesChange = useCallback(
    (changes: NodeChange<CanvasNodeType>[]) => {
      onNodesChange(changes);
      if (didInitialFitRef.current) return;
      if (changes.some((c) => c.type === "dimensions")) {
        requestAnimationFrame(() => {
          if (!didInitialFitRef.current && fitInitial()) {
            didInitialFitRef.current = true;
          }
        });
      }
    },
    [onNodesChange, fitInitial],
  );

  // Fallback in case no dimensions change fires (already-measured nodes, etc.).
  useEffect(() => {
    if (didInitialFitRef.current || nodes.length === 0) return;
    const t = setTimeout(() => {
      if (!didInitialFitRef.current && fitInitial()) {
        didInitialFitRef.current = true;
      }
    }, 400);
    return () => clearTimeout(t);
  }, [nodes.length, fitInitial]);

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full overflow-hidden"
      style={{ overscrollBehavior: "contain", touchAction: "none" }}
    >
      <CanvasZoomShortcuts
        fitCanvas={fitCanvas}
        handleCanvasWheel={handleCanvasWheel}
        panByDrag={panByDrag}
        panByScroll={panByScroll}
        viewportRef={viewportRef}
        zoomBy={zoomBy}
        zoomWithFactorAtPoint={zoomWithFactorAtPoint}
      />
      <ReactFlow
        nodes={nodes}
        edges={EMPTY_EDGES}
        onNodesChange={handleNodesChange}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 48, y: 48, zoom: INITIAL_FIT_MIN_ZOOM }}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        nodesConnectable={false}
        // Notes opt in per-node (draggable: true); page frames stay locked.
        nodesDraggable={false}
        elementsSelectable
        selectionMode={SelectionMode.Partial}
        // While placing a note, a left-drag must not rubber-band select.
        selectionOnDrag={tool === "pointer"}
        panOnDrag={tool === "hand" ? true : [1, 2]}
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling
        proOptions={{ hideAttribution: true }}
        className={cn(
          "bg-bg-main",
          tool === "hand"
            ? "cursor-grab"
            : tool === "note"
              ? "cursor-crosshair"
              : "cursor-default",
        )}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={26}
          size={2.4}
          color="#9aa0ab"
        />
      </ReactFlow>
      <CanvasToolbar
        tool={tool}
        setTool={setTool}
        onAddImage={openImagePicker}
        imageUploading={imageUploading}
      />
      <ZoomControl fitCanvas={fitCanvas} zoomBy={zoomBy} />
      {selectedNote && (
        <NoteActionsBar
          note={selectedNote}
          viewportRef={viewportRef}
          onStyleChange={handleNoteStyleChange}
        />
      )}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset so picking the same file again still fires onChange.
          event.target.value = "";
          if (file) void handleImageFile(file);
        }}
      />
    </div>
  );
}

export function PreviewCanvas(props: PreviewCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
