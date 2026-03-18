"use client"

import { useAnalyticsStore, Period } from "@/entities/analytics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/ui/select";

export const PeriodSelector = () => {
  const { activePeriod, setActivePeriod } = useAnalyticsStore();

  return (
    <Select value={activePeriod} onValueChange={(val) => setActivePeriod(val as Period)}>
      <SelectTrigger className="w-[180px] h-9 bg-bg-card border-border-subtle rounded-md text-sm">
        <SelectValue placeholder="Select period" />
      </SelectTrigger>
      <SelectContent className="bg-bg-card border-border-subtle">
        <SelectItem value="24h">Last 24 hours</SelectItem>
        <SelectItem value="7d">Last 7 days</SelectItem>
        <SelectItem value="30d">Last 30 days</SelectItem>
        <SelectItem value="90d">Last 90 days</SelectItem>
      </SelectContent>
    </Select>
  );
};
