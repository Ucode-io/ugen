"use client"

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api";
import { UsageLimitsTab } from "./usage-limits";
import { ProjectStatisticsTab } from "./project-statistics";
import { BarChart2 } from "lucide-react";
import { useAuthStore } from "@/entities/session";

export const AnalyticsDashboard = () => {
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-4">
        <h1 className="text-[22px] font-bold text-text-main mb-1 flex items-center gap-2">
          <BarChart2 size={20} className="text-primary" />
          Analytics
        </h1>
        <p className="text-text-muted text-[13px]">Monitor project performance, API health, and user activity.</p>
      </div>

      <UsageLimitsTab pricingData={pricingData} fareData={fareData} currentFareData={currentFareData} />
      <ProjectStatisticsTab />
    </div>
  );
};
