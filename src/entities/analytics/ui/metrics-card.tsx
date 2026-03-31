"use client"

import { ReactNode } from "react";
import { LucideIcon, ChevronRight, Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  icon?: LucideIcon;
  tooltip?: string;
  onClick?: () => void;
  className?: string;
}

export const MetricCard = ({
  title,
  value,
  unit,
  icon: Icon,
  tooltip,
  onClick,
  className
}: MetricCardProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "ai-card p-5 cursor-pointer hover:border-primary/50 group flex flex-col justify-between h-full bg-bg-card border border-border-subtle rounded-xl",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-muted">{title}</span>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-colors" />
                </TooltipTrigger>
                <TooltipContent>{tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {Icon && <Icon className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />}
      </div>
      
      <div className="flex items-end justify-between mt-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-text-main">{value}</span>
          {unit && <span className="text-sm text-text-muted">{unit}</span>}
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0" />
      </div>
    </div>
  );
};
