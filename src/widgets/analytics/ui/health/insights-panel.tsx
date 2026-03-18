"use client"

import { CheckCircle2, AlertCircle } from "lucide-react";
import { useAnalyticsStore } from "@/entities/analytics";
import { Button } from "@/shared/ui/button";

export const InsightsPanel = () => {
  const { activePeriod } = useAnalyticsStore();
  
  // Mocking no problems
  const hasProblems = false;

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      {!hasProblems ? (
        <>
          <div className="bg-primary/10 p-3 rounded-full">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h4 className="text-xl font-bold text-text-main mt-4">All clear!</h4>
          <p className="text-sm text-text-muted text-center max-w-sm">
            Everything is running smoothly for the selected time range ({activePeriod}).
          </p>
          <Button variant="ghost" className="text-primary hover:text-primary-hover underline underline-offset-4">
            Learn more about Insights
          </Button>
        </>
      ) : (
        <div className="w-full space-y-4">
          <InsightsCard
            type="error"
            title="High Error Rate in Edge Functions"
            description="We detected a spike in error rates (15%) for Edge Functions in the last hour."
            time="2 mins ago"
          />
        </div>
      )}
    </div>
  );
};

const InsightsCard = ({ type, title, description, time }: { type: 'error' | 'warning', title: string, description: string, time: string }) => (
  <div className="ai-card p-4 border border-border-subtle rounded-xl flex items-start gap-4">
    <div className={type === 'error' ? "text-destructive" : "text-amber-500"}>
      <AlertCircle className="w-5 h-5" />
    </div>
    <div className="flex-1 space-y-1">
      <h5 className="text-sm font-semibold">{title}</h5>
      <p className="text-xs text-text-muted">{description}</p>
      <span className="text-[10px] text-text-muted font-mono">{time}</span>
    </div>
  </div>
);
