"use client"

import { VisitorsToolbar } from "./toolbar";
import { VisitorMetricTabs } from "./metric-tabs";
import { VisitorsMainChart } from "./main-chart";
import { VisitorsBreakdownGrid } from "./breakdown-grid";

export const VisitorsTab = () => {
  return (
    <div className="space-y-8">
      <VisitorsToolbar />
      <div className="space-y-6">
        <VisitorMetricTabs />
        <VisitorsMainChart />
      </div>
      <section className="space-y-6">
        <h3 className="text-md font-medium text-text-main">Audience Breakdown</h3>
        <VisitorsBreakdownGrid />
      </section>
    </div>
  );
};
