"use client"

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api";
import { ReusableTabs } from "@/shared/ui";
import { UsageLimitsTab } from "./usage-limits";
import { ProjectStatisticsTab } from "./project-statistics";
import { useTranslations } from "next-intl";
import { BarChart2, Gauge, BarChart } from "lucide-react";
import { useAuthStore } from "@/entities/session";

export const AnalyticsDashboard = () => {
  const t = useTranslations('widgets.analytics');
  const [activeTab, setActiveTab] = useState("usage-limits");
  const ucodeProjectId = useAuthStore((state) => state.ucodeProjectId);

  const { data: pricingData } = useQuery({
    queryKey: ['pricing-all'],
    queryFn: async () => {
      const { data } = await api.get('/v1/pricing/all');
      return data;
    },
    staleTime: 0,
  });

  const { data: fareData } = useQuery({
    queryKey: ['fares', 'ugen'],
    queryFn: async () => {
      const { data } = await api.get('/v1/fare', { params: { product_type: 'ugen' } });
      return data;
    },
  });

  const { data: currentFareData } = useQuery({
    queryKey: ['fares', 'ugen', 'current', ucodeProjectId],
    queryFn: async () => {
      const { data } = await api.get('/v1/fare', {
        params: { "project-id": ucodeProjectId },
      });
      return data;
    },
    enabled: !!ucodeProjectId,
  });

  const tabs = [
    { id: "usage-limits", label: "Usage Limits", icon: <Gauge size={14} /> },
    { id: "project-statistics", label: "Project Statistics", icon: <BarChart size={14} /> },
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

      <ReusableTabs options={tabs} activeId={activeTab} onTabChange={setActiveTab} />

      <div className="animate-in fade-in duration-300">
        {/* {activeTab === "overview" && <OverviewTab />}
        {activeTab === "health" && <HealthTab />}
        {activeTab === "query-performance" && <QueryPerformanceTab />}
        {activeTab === "visitors" && <VisitorsTab />} */}
        {activeTab === "usage-limits" && <UsageLimitsTab pricingData={pricingData} fareData={fareData} currentFareData={currentFareData} />}
        {activeTab === "project-statistics" && <ProjectStatisticsTab pricingData={pricingData} />}
      </div>
    </div>
  );
};
