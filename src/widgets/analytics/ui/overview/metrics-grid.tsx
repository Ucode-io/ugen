"use client"

import { useOverviewMetrics } from "@/features/analytics";
import { useAnalyticsStore } from "@/entities/analytics";
import { MetricCard } from "@/entities/analytics/ui/metrics-card";
import { Skeleton } from "@/shared/ui/skeleton";
import { Zap, Network, HardDrive, Activity, Cpu, BarChart2 } from "lucide-react";

export const MetricsGrid = () => {
  const { activePeriod } = useAnalyticsStore();
  const { data: metrics, isLoading } = useOverviewMetrics(activePeriod);

  const iconMap: Record<string, any> = {
    slow_queries: Zap,
    connections: Network,
    disk_usage: HardDrive,
    disk_io: Activity,
    memory: Cpu,
    cpu: BarChart2,
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics?.map((metric) => (
        <MetricCard
          key={metric.id}
          title={metric.title}
          value={metric.value}
          unit={metric.unit}
          icon={iconMap[metric.id]}
          tooltip={`Analytics for ${metric.title}`}
          onClick={() => console.log(`Clicked ${metric.id}`)}
        />
      ))}
    </div>
  );
};
