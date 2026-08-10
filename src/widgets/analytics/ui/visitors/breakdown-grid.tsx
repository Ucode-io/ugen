"use client"

import { useVisitorBreakdown, useAnalyticsStore } from "@/features/analytics";
import { BreakdownItem } from "@/entities/analytics";
import { Skeleton } from "@/shared/ui";
import { Monitor, Smartphone, Tablet, Globe, Link2, FileText, LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import { useTranslations } from 'next-intl'

export const VisitorsBreakdownGrid = () => {
  const t = useTranslations('widgets.analytics')
  const { activePeriod } = useAnalyticsStore();
  const { data: breakdown, isLoading } = useVisitorBreakdown(activePeriod);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[400px] rounded-xl" />
        ))}
      </div>
    );
  }

  if (!breakdown) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <BreakdownTable title={t('source')} items={breakdown.sources} icon={Link2} />
      <BreakdownTable title={t('page')} items={breakdown.pages} icon={FileText} />
      <BreakdownTable title={t('country')} items={breakdown.countries} icon={Globe} />
      <BreakdownTable title={t('device')} items={breakdown.devices} icon={Monitor} />
    </div>
  );
};

interface BreakdownTableProps {
  title: string;
  items: BreakdownItem[];
  icon?: LucideIcon;
}

const BreakdownTable = ({ title, items, icon: MainIcon }: BreakdownTableProps) => {
  const t = useTranslations('widgets.analytics')
  const maxVal = Math.max(...items.map((i) => i.value));
  const deviceIcons: Record<string, LucideIcon> = {
    'Desktop': Monitor,
    'Mobile': Smartphone,
    'Tablet': Tablet,
  };

  return (
    <div className="ai-card p-6 border border-border-subtle rounded-xl bg-bg-card flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <h4 className="text-sm font-bold text-text-main flex items-center gap-2 uppercase tracking-wide">
          {MainIcon && <MainIcon className="w-4 h-4 text-text-muted" />}
          {title}
        </h4>
        <span className="text-xs text-text-muted font-bold uppercase tracking-wider">{t('visitors')}</span>
      </div>
      <div className="flex-1 space-y-4">
        {items.map((item) => {
          const ItemIcon = deviceIcons[item.label];
          return (
            <div key={item.id} className="relative py-2 group">
              {/* Progress bar background */}
              <div
                className="absolute inset-0 bg-primary/5 rounded-md transition-all group-hover:bg-primary/10"
                style={{ width: `${(item.value / maxVal) * 100}%` }}
              />
              <div className="relative flex items-center justify-between px-3 text-xs">
                <div className="flex items-center gap-3">
                  {item.flag && <span className="text-lg">{item.flag}</span>}
                  {ItemIcon && <ItemIcon className="w-4 h-4 text-text-muted" />}
                  <span className="font-medium text-text-main max-w-[120px] truncate">{item.label}</span>
                </div>
                <span className="font-bold text-text-main">{item.value.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
