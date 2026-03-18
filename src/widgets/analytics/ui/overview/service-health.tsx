"use client"

import { useServiceHealth } from "@/features/analytics";
import { ServiceHealth, useAnalyticsStore } from "@/entities/analytics";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/shared/ui/ui/tooltip";
import { Info, ChevronRight } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis } from "recharts";
import { cn } from "@/shared/lib/utils/cn";

export const ServiceHealthList = () => {
  const { activePeriod } = useAnalyticsStore();
  const { data: services, isLoading } = useServiceHealth(activePeriod);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {services?.map((service) => (
        <ServiceItem key={service.id} service={service} />
      ))}
    </div>
  );
};

const ServiceItem = ({ service }: { service: ServiceHealth }) => {
  const isHealthy = service.status === 'HEALTHY';
  const statusColor = isHealthy ? 'var(--color-primary)' : service.status === 'UNHEALTHY' ? 'var(--color-destructive)' : 'var(--text-muted)';
  
  return (
    <div className="ai-card p-5 flex items-center justify-between group bg-bg-card border border-border-subtle rounded-xl hover:border-primary/50 transition-all cursor-pointer">
      <div className="flex flex-col gap-2 min-w-[150px]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text-main">{service.name}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-text-muted" />
              </TooltipTrigger>
              <TooltipContent>Status: {service.status}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded text-[10px] font-bold w-fit",
          isHealthy ? "bg-primary/10 text-primary" : service.status === 'UNHEALTHY' ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
        )}>
          {service.status}
        </div>
      </div>

      <div className="flex-1 px-8">
        {service.history.length > 0 ? (
          <div className="h-10 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={service.history}>
                <Bar dataKey="calls">
                  {service.history.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={statusColor} fillOpacity={0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between mt-1 text-[10px] text-text-muted">
              <span>{new Date(service.history[0].timestamp).toLocaleDateString()}</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                <span>{service.errorRate}% Errors</span>
              </div>
              <span>{new Date(service.history[service.history.length - 1].timestamp).toLocaleDateString()}</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-text-muted text-sm py-2">No data</div>
        )}
      </div>

      <ChevronRight className="w-5 h-5 text-text-muted opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0" />
    </div>
  );
};
