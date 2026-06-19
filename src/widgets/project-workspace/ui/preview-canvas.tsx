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
  useRef,
  useState,
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
  Pencil,
  File as FileIcon,
  Image as ImageIcon,
  Minus,
  Plus,
  Scan,
} from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";

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

type Tool = "pointer" | "hand";

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
    const mutationObserver = new MutationObserver(scheduleMeasure);
    mutationObserver.observe(body, { childList: true, subtree: true });
    // Safety net while late data/images settle, then stop measuring.
    const interval = window.setInterval(scheduleMeasure, 600);
    const stopInterval = window.setTimeout(() => {
      window.clearInterval(interval);
    }, 5000);

    return () => {
      if (measureRafRef.current) cancelAnimationFrame(measureRafRef.current);
      measureRafRef.current = 0;
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.clearInterval(interval);
      window.clearTimeout(stopInterval);
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

const nodeTypes = { pageFrame: PageFrameNode };

interface PreviewCanvasProps {
  pages: CanvasPage[];
  focusedPageId: string | null;
  /** Bumped to force every frame's iframe to remount (e.g. on refresh/rebuild). */
  refreshKey: number;
  onFocusPage: (id: string, el: HTMLIFrameElement | null) => void;
  /** Clear the focused frame (clicking the empty canvas returns to overview). */
  onClearFocus?: () => void;
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
}: {
  tool: Tool;
  setTool: (t: Tool) => void;
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
        <ToolButton title="Draw (coming soon)">
          <Pencil size={16} />
        </ToolButton>
        <ToolButton title="Note (coming soon)">
          <FileIcon size={16} />
        </ToolButton>
        <ToolButton title="Image (coming soon)">
          <ImageIcon size={16} />
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

function CanvasInner(props: PreviewCanvasProps) {
  const [tool, setTool] = useState<Tool>("pointer");
  const [frameHeights, setFrameHeights] = useState<Record<string, number>>({});
  const viewportRef = useRef<HTMLDivElement>(null);
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
  const [nodes, setNodes, onNodesChange] = useNodesState<PageFrameNodeType>(
    buildNodes({
      ...props,
      frameHeights,
      onFrameHeightChange: handleFrameHeightChange,
    }),
  );

  // Re-sync nodes when pages, focus, or the refresh signal changes. The node
  // component is memoized and iframes are keyed by refreshKey, so this never
  // reloads a frame unless its content actually changed.
  const { pages, focusedPageId, refreshKey, onFocusPage } = props;
  useEffect(() => {
    setNodes(
      buildNodes({
        pages,
        focusedPageId,
        frameHeights,
        refreshKey,
        onFocusPage,
        onFrameHeightChange: handleFrameHeightChange,
      }),
    );
  }, [
    pages,
    focusedPageId,
    frameHeights,
    refreshKey,
    onFocusPage,
    handleFrameHeightChange,
    setNodes,
  ]);

  // Run the initial fit the moment react-flow reports measured node dimensions
  // (a fixed timeout races measurement and the fit silently no-ops). fitInitial
  // returns false until it has real bounds, so we keep trying until it sticks.
  const handleNodesChange = useCallback(
    (changes: NodeChange<PageFrameNodeType>[]) => {
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
        edges={[]}
        onNodesChange={handleNodesChange}
        onPaneClick={props.onClearFocus}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 48, y: 48, zoom: INITIAL_FIT_MIN_ZOOM }}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        nodesConnectable={false}
        nodesDraggable={false}
        elementsSelectable
        selectionMode={SelectionMode.Partial}
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
          tool === "hand" ? "cursor-grab" : "cursor-default",
        )}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={26}
          size={2.4}
          color="#9aa0ab"
        />
      </ReactFlow>
      <CanvasToolbar tool={tool} setTool={setTool} />
      <ZoomControl fitCanvas={fitCanvas} zoomBy={zoomBy} />
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
