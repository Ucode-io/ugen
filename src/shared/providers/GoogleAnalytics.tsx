"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { GA_MEASUREMENT_ID, IS_GA_CONFIGURED, pageview } from "@/shared/lib/gtag";

// The home route ("/") renders two distinct client views — the landing hero and
// the dashboard home — at the same URL. Those are tracked explicitly in
// LandingPageClientWrapper, so the generic route tracker skips "/" to avoid
// double counting.
const SELF_TRACKED_PATHS = new Set(["/"]);

const RouteTracker = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || SELF_TRACKED_PATHS.has(pathname)) return;

    const query = searchParams?.toString();
    pageview(pathname + (query ? `?${query}` : ""));
  }, [pathname, searchParams]);

  return null;
};

export const GoogleAnalytics = () => {
  // Stay inert until a real Measurement ID is set in gtag.ts.
  if (!IS_GA_CONFIGURED) return null;

  return (
    <>
      <Script
        id="ga-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
      <Suspense fallback={null}>
        <RouteTracker />
      </Suspense>
    </>
  );
};
