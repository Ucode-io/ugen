"use client"

import * as React from "react";
import dynamic from 'next/dynamic';
import { useHealthMetrics, useAnalyticsStore } from "@/features/analytics";
import { Skeleton } from "@/shared/ui/skeleton";

// Use dynamic import for chart to avoid hydration issues with Recharts in Next.js 15
const AnalyticsChart = dynamic(() => import("@/entities/analytics/ui/analytics-chart").then(mod => mod.AnalyticsChart), { 
  ssr: false,
  loading: () => <Skeleton className="h-[260px] w-full rounded-xl" />
});

export const FunctionsCharts = () => {
  const { activePeriod } = useAnalyticsStore();
  const { data: metrics, isLoading } = useHealthMetrics(activePeriod);

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-[260px] rounded-xl" />
      <Skeleton className="h-[260px] rounded-xl" />
      <Skeleton className="h-[260px] rounded-xl" />
    </div>
  );

  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AnalyticsChart
        title="Function Calls"
        tooltip="Number of function calls by time"
        data={metrics.functions.calls}
        lines={[{ key: 'value', color: 'var(--color-primary)', name: 'Calls' }]}
        height={200}
      />
      <AnalyticsChart
        title="Failure Rate"
        tooltip="Percentage of errors by time"
        data={metrics.functions.failureRate}
        lines={[{ key: 'value', color: 'var(--color-destructive)', name: 'Errors %' }]}
        height={200}
      />
      <AnalyticsChart
        title="Cache Hit Rate"
        tooltip="Percentage of cache hits by time"
        data={metrics.functions.cacheHitRate}
        lines={[{ key: 'value', color: 'var(--color-accent)', name: 'Cache Hit %' }]}
        height={200}
      />
    </div>
  );
};
