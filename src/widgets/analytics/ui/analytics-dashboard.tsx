"use client"

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api";
import { UsageLimitsTab } from "./usage-limits";
import { ProjectStatisticsTab } from "./project-statistics";
import { BarChart2 } from "lucide-react";
import { useAuthStore } from "@/entities/session";

export const AnalyticsDashboard = () => {
  const fareId = useAuthStore((state) => state.project?.fare_id);

  const { data: companyStats } = useQuery({
    queryKey: ['pricing-company-stats'],
    queryFn: async () => {
      const { data } = await api.get('/v1/pricing/company-stats');
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-4">
        <h1 className="text-[22px] font-bold text-text-main mb-1 flex items-center gap-2">
          <BarChart2 size={20} className="text-primary" />
          Analytics
        </h1>
        <p className="text-text-muted text-[13px]">Monitor project performance, API health, and user activity.</p>
      </div>

      <UsageLimitsTab companyStats={companyStats} fareData={fareData} fareId={fareId} />
      <ProjectStatisticsTab />
    </div>
  );
};
