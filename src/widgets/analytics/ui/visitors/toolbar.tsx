"use client"

import { useCurrentVisitors } from "@/features/analytics";
import { PeriodSelector } from "@/entities/analytics/ui/period-selector";
import { useTranslations } from "next-intl";

export const VisitorsToolbar = () => {
  const t = useTranslations('widgets.analytics');
  const { data: currentVisitors } = useCurrentVisitors();

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-text-main">{t("visitorAnalytics")}</h2>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span className="text-sm font-medium text-text-muted">
            {t("currentVisitors", { count: currentVisitors ?? 0 })}
          </span>
        </div>
        <PeriodSelector />
      </div>
    </div>
  );
};
