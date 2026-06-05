// ── Preview build stopwatch ───────────────────────────────────────────────
// A small, dependency-free timer for the in-browser preview build pipeline.
// It splits a build into two halves so the two cost centres are visible:
//
//   build   = JS work in THIS tab   → esbuild init + bundle + html generation
//   visible = work in the IFRAME    → srcDoc set → preview actually revealed
//             (esm.sh waterfall + Tailwind CDN JIT + React mount)
//   total   = build + visible
//
// Why a reusable utility: build-time has to be compared before vs after the
// optimization branch is merged. Drop this file on either branch, run a few
// builds, then call `window.previewBuildStats()` in the console to get aggregate
// numbers (count / avg / min / max) for each metric. Same instrument both sides
// → an apples-to-apples comparison.
//
// Silence it with `localStorage.setItem("preview-build-timer", "off")`.

export interface BuildPhase {
  name: string;
  ms: number;
}

export interface BuildSample {
  label: string;
  /** esbuild init + bundle + generatePreviewHtml (ms) */
  buildMs: number;
  /** srcDoc set → preview revealed (ms); null if the iframe never reported ready */
  visibleMs: number | null;
  /** buildMs + visibleMs (ms); null until the iframe reports ready */
  totalMs: number | null;
  /** per-phase breakdown of the build half */
  phases: BuildPhase[];
  meta: Record<string, unknown>;
}

const HISTORY_KEY = "__previewBuilds__";
const SILENCE_KEY = "preview-build-timer";
const MAX_HISTORY = 100;

function isSilenced(): boolean {
  try {
    return localStorage.getItem(SILENCE_KEY) === "off";
  } catch {
    return false;
  }
}

function history(): BuildSample[] {
  const w = window as unknown as Record<string, BuildSample[]>;
  if (!Array.isArray(w[HISTORY_KEY])) w[HISTORY_KEY] = [];
  return w[HISTORY_KEY];
}

function fmt(ms: number | null): string {
  return ms == null ? "—" : `${Math.round(ms)}ms`;
}

function logSample(s: BuildSample): void {
  const tag = s.meta.cacheHit ? "⚡ cache" : "🛠️ build";
  const header = `[preview ${tag}] build ${fmt(s.buildMs)} · visible ${fmt(
    s.visibleMs,
  )} · total ${fmt(s.totalMs)}`;
  console.groupCollapsed(header);
  if (s.phases.length) {
    const table: Record<string, number> = {};
    for (const p of s.phases) table[p.name] = Math.round(p.ms * 10) / 10;
    console.table(table);
  }
  console.log("meta:", s.meta);
  console.groupEnd();
}

export interface BuildTimer {
  /** Time an async (or sync) phase and record it under `name`. Returns the fn result. */
  measure<T>(name: string, fn: () => Promise<T> | T): Promise<T>;
  /** Record a zero-duration marker phase (e.g. "cache-hit"). */
  mark(name: string): void;
  /** Close out the build (JS) half — call right after `setSrcDoc`. */
  markSrcDocSet(): void;
  /** The iframe revealed the preview → finalize with `visible`/`total` and log. */
  reportVisible(): void;
  /** Finalize the build half only (no iframe runtime). Safety/fallback path. Idempotent. */
  report(): void;
}

export function createBuildTimer(
  meta: Record<string, unknown> = {},
  label = "preview-build",
): BuildTimer {
  const t0 = performance.now();
  const phases: BuildPhase[] = [];
  let buildEnd: number | null = null;
  let srcDocSetAt: number | null = null;
  let finalized = false;

  function finalize(visibleMs: number | null): void {
    if (finalized) return;
    finalized = true;
    const buildMs = (buildEnd ?? performance.now()) - t0;
    const totalMs = visibleMs != null ? buildMs + visibleMs : null;
    const sample: BuildSample = { label, buildMs, visibleMs, totalMs, phases, meta };
    const h = history();
    h.push(sample);
    if (h.length > MAX_HISTORY) h.splice(0, h.length - MAX_HISTORY);
    if (!isSilenced()) logSample(sample);
  }

  return {
    async measure(name, fn) {
      const start = performance.now();
      try {
        return await fn();
      } finally {
        phases.push({ name, ms: performance.now() - start });
      }
    },
    mark(name) {
      phases.push({ name, ms: 0 });
    },
    markSrcDocSet() {
      buildEnd = performance.now();
      srcDocSetAt = buildEnd;
    },
    reportVisible() {
      finalize(srcDocSetAt != null ? performance.now() - srcDocSetAt : null);
    },
    report() {
      finalize(null);
    },
  };
}

type Agg = { n: number; avg: number; min: number; max: number };

function aggregate(values: number[]): Agg | null {
  if (!values.length) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    n: values.length,
    avg: Math.round(sum / values.length),
    min: Math.round(Math.min(...values)),
    max: Math.round(Math.max(...values)),
  };
}

/**
 * Print aggregate build-time stats for the current session and return the raw
 * samples. Call from the browser console: `previewBuildStats()`.
 * Pass `{ cacheHit: false }` to exclude (or `true` to only include) cache hits.
 */
export function previewBuildStats(opts?: { cacheHit?: boolean }): BuildSample[] {
  let h = history();
  if (opts && typeof opts.cacheHit === "boolean") {
    h = h.filter((s) => Boolean(s.meta.cacheHit) === opts.cacheHit);
  }
  if (!h.length) {
    console.log("[preview-build-timer] no builds recorded yet");
    return h;
  }
  const pick = (sel: (s: BuildSample) => number | null) =>
    aggregate(h.map(sel).filter((x): x is number => x != null));
  console.table({
    build: pick((s) => s.buildMs),
    visible: pick((s) => s.visibleMs),
    total: pick((s) => s.totalMs),
  });
  return h;
}

/** Clear recorded samples (e.g. before a fresh before/after measurement run). */
export function clearPreviewBuildStats(): void {
  history().length = 0;
}

// Expose console helpers so they can be called without importing anything.
if (typeof window !== "undefined") {
  const w = window as unknown as Record<string, unknown>;
  w.previewBuildStats = previewBuildStats;
  w.clearPreviewBuildStats = clearPreviewBuildStats;
}
