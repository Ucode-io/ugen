"use client"

import { useAnalyticsStore } from "@/entities/analytics";
import { Info, RefreshCw, Trash2, Download, Search } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/shared/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
} from "@/shared/ui";
import { Input } from "@/shared/ui";
import { Button } from "@/shared/ui";
import { useTranslations } from "next-intl";

export const QueryPerformanceToolbar = () => {
  const t = useTranslations('widgets.analytics');
  const { queryPerformanceFilters, setQueryPerformanceFilter } = useAnalyticsStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-sm font-medium">
        <MetricItem label={t("slowQueries")} value="12" tooltip="Top 12 slowest queries analyzed" />
        <span className="text-text-muted">/</span>
        <MetricItem label={t("cacheHitRate")} value="85%" tooltip="Percentage of queries served from cache" />
        <span className="text-text-muted">/</span>
        <MetricItem label={t("avgRowsPerCall")} value="1,240" tooltip="Average number of rows processed per call" />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 overflow-x-auto">
          <div className="relative w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={queryPerformanceFilters.search}
              onChange={(e) => setQueryPerformanceFilter('search', e.target.value)}
              className="pl-10 h-9 bg-bg-card border-border-subtle"
            />
          </div>
          <SelectFilter
            value={queryPerformanceFilters.callsFilter}
            onValueChange={(val) => setQueryPerformanceFilter('callsFilter', val)}
            placeholder={t("calls")}
            options={['Any', '> 100', '> 1,000', '> 10,000']}
          />
          <SelectFilter
            value={queryPerformanceFilters.totalTimeFilter}
            onValueChange={(val) => setQueryPerformanceFilter('totalTimeFilter', val)}
            placeholder={t("totalTime")}
            options={['Any', '> 1s', '> 10s', '> 1m']}
          />
          <SelectFilter
            value={queryPerformanceFilters.rolesFilter}
            onValueChange={(val) => setQueryPerformanceFilter('rolesFilter', val)}
            placeholder={t("roles")}
            options={['Any', 'postgres', 'anon', 'authenticated']}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="icon" className="h-9 w-9 bg-bg-card">
            <RefreshCw className="w-4 h-4 text-text-muted" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 bg-bg-card">
            <Trash2 className="w-4 h-4 text-text-muted" />
          </Button>
          <Button variant="outline" className="h-9 bg-bg-card">
            <Download className="w-4 h-4 mr-2" />
            {t("export")}
          </Button>
        </div>
      </div>
    </div>
  );
};

const MetricItem = ({ label, value, tooltip }: { label: string, value: string, tooltip: string }) => (
  <div className="flex items-center gap-1.5 whitespace-nowrap">
    <span className="text-text-muted">{label}</span>
    <span className="text-text-main font-bold">{value}</span>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Info className="w-3.5 h-3.5 text-text-muted" />
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);

const SelectFilter = ({ value, onValueChange, placeholder, options }: { value: string, onValueChange: (val: string) => void, placeholder: string, options: string[] }) => (
  <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger className="h-9 w-[120px] bg-bg-card">
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {options.map((opt: string) => (
        <SelectItem key={opt} value={opt.toLowerCase().replace(' ', '')}>{opt}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);
