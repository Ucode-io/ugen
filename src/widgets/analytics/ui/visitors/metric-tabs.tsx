"use client"

import { useAnalyticsStore, VisitorMetric } from "@/entities/analytics";
import { cn } from "@/shared/lib/utils/cn";

export const VisitorMetricTabs = () => {
  const { activeVisitorMetric, setActiveVisitorMetric } = useAnalyticsStore();

  const metrics: { id: VisitorMetric; label: string; value: string; trend: string }[] = [
    { id: 'visitors', label: 'Visitors', value: '12.4K', trend: '+12%' },
    { id: 'pageviews', label: 'Pageviews', value: '45.2K', trend: '+15%' },
    { id: 'viewsPerVisit', label: 'Views Per Visit', value: '3.6', trend: '-2%' },
    { id: 'visitDuration', label: 'Visit Duration', value: '2m 45s', trend: '+5%' },
    { id: 'bounceRate', label: 'Bounce Rate', value: '42.1%', trend: '-8%' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {metrics.map((m) => {
        const isActive = activeVisitorMetric === m.id;
        return (
          <button
            key={m.id}
            onClick={() => setActiveVisitorMetric(m.id)}
            className={cn(
              "p-4 rounded-xl border flex flex-col items-start gap-1 transition-all text-left",
              isActive 
                ? "bg-primary/5 border-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                : "bg-bg-card border-border-subtle hover:border-text-muted/30"
            )}
          >
            <span className={cn("text-xs font-medium", isActive ? "text-primary" : "text-text-muted")}>
              {m.label}
            </span>
            <span className="text-xl font-bold text-text-main">{m.value}</span>
            <span className={cn(
              "text-[10px] font-bold",
              m.trend.startsWith('+') ? "text-emerald-500" : "text-destructive"
            )}>
              {m.trend}
            </span>
          </button>
        );
      })}
    </div>
  );
};
