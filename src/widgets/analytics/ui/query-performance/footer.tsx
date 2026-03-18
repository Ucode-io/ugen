"use client"

import { HelpCircle, Wand2, RefreshCw } from "lucide-react";
import { Button } from "@/shared/ui/button";

export const QueryPerformanceFooter = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-bg-sidebar/30 border border-border-subtle rounded-xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-text-muted" />
          <h4 className="font-bold text-text-main">Reset report</h4>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          Clear all historical query performance statistics and start fresh. This action cannot be undone.
        </p>
        <Button variant="outline" size="sm" className="h-8 text-xs bg-bg-card font-bold border-border-subtle">
          Reset stats
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-text-muted" />
          <h4 className="font-bold text-text-main">How is this report generated?</h4>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          This report uses the pg_stat_statements extension to collect real-time data from your database.
        </p>
        <a href="#" className="text-xs text-primary hover:underline underline-offset-4 font-bold">
          Learn more about pg_stat_statements
        </a>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-text-muted" />
          <h4 className="font-bold text-text-main">Index Advisor</h4>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          The Index Advisor analyzes your slow queries and suggests potential indexes to improve performance.
        </p>
        <a href="#" className="text-xs text-primary hover:underline underline-offset-4 font-bold">
          See all recommendations
        </a>
      </div>
    </div>
  );
};
