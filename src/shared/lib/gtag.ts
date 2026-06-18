// Google Analytics (GA4) helper.
//
// 👉 Set your real Measurement ID below (looks like "G-XXXXXXXXXX",
//    found in GA Admin → Data Streams). While it equals PLACEHOLDER_ID,
//    GA stays disabled (no script injected, no events sent).
// Typed as `string` (not the inferred literal) so the IS_GA_CONFIGURED
// comparison against PLACEHOLDER_ID below isn't flagged as a no-overlap
// comparison by the strict production build.
export const GA_MEASUREMENT_ID: string = "G-2SXS8PZR4R";

// Sentinel meaning "not configured yet" — leave this value untouched.
const PLACEHOLDER_ID = "G-XXXXXXXXXX";

// Pure, SSR-safe check used to decide whether to inject the GA script.
export const IS_GA_CONFIGURED =
  GA_MEASUREMENT_ID.startsWith("G-") && GA_MEASUREMENT_ID !== PLACEHOLDER_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const canSend = () =>
  IS_GA_CONFIGURED &&
  typeof window !== "undefined" &&
  typeof window.gtag === "function";

/**
 * Send a page_view to GA4. Works for real routes and for virtual views that
 * share a URL (e.g. the dashboard home rendered at "/").
 */
export const pageview = (path: string, title?: string) => {
  if (!canSend()) return;
  window.gtag!("event", "page_view", {
    page_path: path,
    page_location: window.location.origin + path,
    page_title: title ?? document.title,
  });
};

/** Send a custom GA4 event. */
export const gaEvent = (
  action: string,
  params: Record<string, unknown> = {},
) => {
  if (!canSend()) return;
  window.gtag!("event", action, params);
};
