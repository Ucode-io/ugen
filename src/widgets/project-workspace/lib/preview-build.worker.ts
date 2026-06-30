// ── Dedicated preview-build worker ─────────────────────────────────────────
// Hosts esbuild-wasm AND the virtual-FS plugin inside ONE worker realm, with
// esbuild.initialize({ worker: false }) — so the WASM service runs in THIS
// thread and the plugin's onResolve/onLoad callbacks are plain in-realm function
// calls. That removes the per-edge worker↔main `postMessage` round-trip the
// legacy `worker: true` setup paid (every import edge, including every external
// npm edge, used to block the WASM worker on the main thread's event loop).
//
// The main thread builds the file map / entry / externals / define and posts
// them here ONCE per build (structured-clone of strings is cheap); we return the
// single ESM output string plus the plugin stats. Output is byte-identical to
// the legacy path, so nothing downstream (importmap, CSS ordering, React context
// identity) changes.
//
// Protocol (main → worker): { id, type: "init"|"build", wasmURL, payload? }
//          (worker → main): { id, type: "init-done"|"build-done"|"error", ... }
import * as esbuild from "esbuild-wasm";
import { virtualFsPlugin, createPluginStats } from "./esbuildPlugin";

interface BuildPayload {
  fs: Record<string, string>;
  entryPoint: string;
  external: string[];
  define: Record<string, string>;
  jsxDev: boolean;
}

interface InitMessage {
  id: number;
  type: "init";
  wasmURL: string;
}
interface BuildMessage {
  id: number;
  type: "build";
  wasmURL: string;
  payload: BuildPayload;
}
type IncomingMessage = InitMessage | BuildMessage;

const ctx = self as unknown as {
  postMessage: (msg: unknown) => void;
  onmessage: ((e: MessageEvent) => void) | null;
};

// esbuild.initialize() can run exactly once per realm. Cache the promise so a
// warmup `init` and the first `build` share the same instantiation.
let initPromise: Promise<void> | null = null;
function ensureInit(wasmURL: string): Promise<void> {
  if (!initPromise) {
    // worker:false → run the WASM service in THIS worker thread (no nested
    // worker, no round-trip for plugin callbacks).
    initPromise = esbuild.initialize({ worker: false, wasmURL });
  }
  return initPromise;
}

ctx.onmessage = async (e: MessageEvent) => {
  const msg = e.data as IncomingMessage;
  const { id } = msg;
  try {
    if (msg.type === "init") {
      await ensureInit(msg.wasmURL);
      ctx.postMessage({ id, type: "init-done" });
      return;
    }

    if (msg.type === "build") {
      await ensureInit(msg.wasmURL);
      const { fs, entryPoint, external, define, jsxDev } = msg.payload;
      const stats = createPluginStats();
      let result: esbuild.BuildResult;
      try {
        result = await esbuild.build({
          entryPoints: [entryPoint],
          bundle: true,
          write: false,
          format: "esm",
          platform: "browser",
          plugins: [virtualFsPlugin(fs, stats)],
          external,
          jsx: "automatic",
          jsxDev,
          logLevel: "silent",
          define,
        });
      } catch (buildErr) {
        // A genuine build / user-code failure (syntax error, missing file) — NOT
        // a worker-infra problem. Tag it so the main thread surfaces it as a
        // build error WITHOUT disabling the worker path (these are common during
        // editing/streaming and must not kick the session to the slow path).
        ctx.postMessage({
          id,
          type: "build-error",
          error: buildErr instanceof Error ? buildErr.message : String(buildErr),
        });
        return;
      }
      ctx.postMessage({
        id,
        type: "build-done",
        code: result.outputFiles?.[0]?.text || "",
        stats,
      });
      return;
    }
  } catch (err) {
    // Infra failure (init/instantiation, message handling) — main thread treats
    // this as a worker fault and falls back to the main-thread build path.
    ctx.postMessage({
      id,
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
