"use client"

import { useTranslations } from "next-intl";
import { useAnalyticsStore, Period } from "@/entities/analytics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";

export const PeriodSelector = () => {
  const t = useTranslations();
  const { activePeriod, setActivePeriod } = useAnalyticsStore();

  return (
    <Select value={activePeriod} onValueChange={(val) => setActivePeriod(val as Period)}>
      <SelectTrigger className="w-[180px] h-9 bg-bg-card border-border-subtle rounded-md text-sm">
        <SelectValue placeholder={t('entities.analytics.periodSelector.placeholder')} />
      </SelectTrigger>
      <SelectContent className="bg-bg-card border-border-subtle">
        <SelectItem value="24h">{t('entities.analytics.periodSelector.last24h')}</SelectItem>
        <SelectItem value="7d">{t('entities.analytics.periodSelector.last7d')}</SelectItem>
        <SelectItem value="30d">{t('entities.analytics.periodSelector.last30d')}</SelectItem>
        <SelectItem value="90d">{t('entities.analytics.periodSelector.last90d')}</SelectItem>
      </SelectContent>
    </Select>
  );
};
