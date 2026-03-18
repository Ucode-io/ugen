"use client"

import { RefreshCw } from "lucide-react";
import { PeriodSelector } from "@/entities/analytics/ui/period-selector";
import { MetricsGrid } from "./metrics-grid";
import { ServiceHealthList } from "./service-health";
import { useAnalyticsStore } from "@/entities/analytics";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/ui/button";

export const OverviewTab = () => {
  const queryClient = useQueryClient();
  
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-main">Database Overview</h2>
        <div className="flex items-center gap-3">
          <PeriodSelector />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className="w-9 h-9 bg-bg-card border-border-subtle hover:bg-hover-bg"
          >
            <RefreshCw className="w-4 h-4 text-text-muted" />
          </Button>
        </div>
      </div>

      <section>
        <MetricsGrid />
      </section>

      <section className="space-y-4">
        <h3 className="text-md font-medium text-text-main">Service Health</h3>
        <ServiceHealthList />
      </section>
    </div>
  );
};
