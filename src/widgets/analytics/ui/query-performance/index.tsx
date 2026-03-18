"use client"

import { QueryPerformanceToolbar } from "./toolbar";
import { QueryPerformanceTable } from "./table";
import { QueryPerformanceFooter } from "./footer";
import { IndexAdvisor } from "./index-advisor";
import { useAnalyticsStore } from "@/entities/analytics";

export const QueryPerformanceTab = () => {
  const { indexAdvisorVisible } = useAnalyticsStore();

  return (
    <div className="space-y-6 relative">
      <QueryPerformanceToolbar />
      <QueryPerformanceTable />
      <QueryPerformanceFooter />
      {indexAdvisorVisible && <IndexAdvisor />}
    </div>
  );
};
