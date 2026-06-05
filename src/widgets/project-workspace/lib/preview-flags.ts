// ── Preview build optimization kill-switch ────────────────────────────────
// Lets the build-timer measure "before" vs "after" in ONE session, on the same
// machine/network, with the same instrument — the most controlled A/B.
//
// Default: optimizations ON.
//   Turn OFF (baseline):  localStorage.setItem("preview-build-opt", "off")
//   Turn ON  (optimized): localStorage.removeItem("preview-build-opt")
// Then rebuild the preview and compare window.previewBuildStats().
//
// Gates the optimizations that affect measured build/visible time:
//   - jsxDev:false (single React graph)          → bundler.ts
//   - esm.sh preconnect + modulepreload          → preview-html.ts
//   - build result cache lookup                  → project-preview-viewer.tsx
// (warmup / WASM preload / timeout split are cold-start or failure-only and
//  aren't toggled — measure those with a hard reload, see notes.)

export function previewOptimizationsEnabled(): boolean {
  try {
    return localStorage.getItem("preview-build-opt") !== "off";
  } catch {
    return true;
  }
}
