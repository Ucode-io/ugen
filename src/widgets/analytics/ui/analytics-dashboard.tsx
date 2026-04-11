"use client"

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api";
import { SubTabs } from "@/shared/ui";
import { OverviewTab } from "./overview";
import { HealthTab } from "./health";
import { QueryPerformanceTab } from "./query-performance";
import { VisitorsTab } from "./visitors";
import { UsageLimitsTab } from "./usage-limits";
import { ProjectStatisticsTab } from "./project-statistics";
import { useTranslations } from "next-intl";
import { BarChart2, Gauge, BarChart } from "lucide-react";

export const AnalyticsDashboard = () => {
  const t = useTranslations('widgets.analytics');
  const [activeTab, setActiveTab] = useState("usage-limits");

  const { data: pricingData } = useQuery({
    queryKey: ['pricing-all'],
    queryFn: async () => {
      const { data } = await api.get('/v1/pricing/all');
      return data;
    },
    staleTime: 0,
  });

  const { data: fareData } = useQuery({
    queryKey: ['fares'],
    queryFn: async () => {
      const { data } = await api.get('/v1/fare');
      return data;
    },
  });

  const tabs = [
    { id: "usage-limits", label: "Usage Limits", icon: Gauge },
    { id: "project-statistics", label: "Project Statistics", icon: BarChart },
    // { id: "overview", label: t("overview") },
    // { id: "health", label: t("health") },
    // { id: "query-performance", label: t("queryPerformance") },
    // { id: "visitors", label: t("visitors") },
  ];

  return (
    <div className="space-y-0 animate-in fade-in duration-500">
      <div className="mb-4">
        <h1 className="text-[22px] font-bold text-text-main mb-1 flex items-center gap-2">
          <BarChart2 size={20} className="text-primary" />
          Analytics
        </h1>
        <p className="text-text-muted text-[13px]">Monitor project performance, API health, and user activity.</p>
      </div>

      <SubTabs options={tabs} activeId={activeTab} onTabChange={setActiveTab} containerClassName="px-0" />

      <div className="animate-in fade-in duration-300">
        {/* {activeTab === "overview" && <OverviewTab />}
        {activeTab === "health" && <HealthTab />}
        {activeTab === "query-performance" && <QueryPerformanceTab />}
        {activeTab === "visitors" && <VisitorsTab />} */}
        {activeTab === "usage-limits" && <UsageLimitsTab pricingData={pricingData} fareData={fareData} />}
        {activeTab === "project-statistics" && <ProjectStatisticsTab pricingData={pricingData} />}
      </div>
    </div>
  );
};
