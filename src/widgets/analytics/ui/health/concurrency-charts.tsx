"use client"

import * as React from "react";
import dynamic from 'next/dynamic';
import { useHealthMetrics, useAnalyticsStore } from "@/features/analytics";
import { Skeleton } from "@/shared/ui";

const AnalyticsChart = dynamic(() => import("@/entities/analytics/ui/analytics-chart").then(mod => mod.AnalyticsChart), { 
  ssr: false,
  loading: () => <Skeleton className="h-[260px] w-full rounded-xl" />
});

export const ConcurrencyCharts = () => {
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
        title="Scheduler Status"
        tooltip="Lag time in minutes"
        data={metrics.concurrency.scheduler}
        lines={[{ key: 'value', color: 'var(--color-primary)', name: 'Lag Time' }]}
        height={200}
      />
      <AnalyticsChart
        title="Running Functions"
        tooltip="Active running functions"
        data={metrics.concurrency.running}
        lines={[
          { key: 'actions', color: 'var(--color-primary)', name: 'Actions' },
          { key: 'queries', color: 'var(--color-accent)', name: 'Queries' }
        ]}
        height={200}
      />
      <AnalyticsChart
        title="Queued Functions"
        tooltip="Functions waiting in queue"
        data={metrics.concurrency.queued}
        lines={[
          { key: 'actions', color: 'var(--color-primary)', name: 'Actions' },
          { key: 'queries', color: 'var(--color-accent)', name: 'Queries' }
        ]}
        height={200}
      />
    </div>
  );
};
