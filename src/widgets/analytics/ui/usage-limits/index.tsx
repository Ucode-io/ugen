import React, { useState } from 'react'
import { ArrowUp } from "lucide-react";
import { Button } from '@/shared/ui'
import { UpgradePlanDialog } from '@/widgets/sidebar/ui/components/upgrade-plan-dialog'
import { cn } from '@/shared/lib/utils/cn'
import {
  WorkspaceTableWrapper,
  WorkspaceTable,
  WorkspaceTableHeader,
  WorkspaceTableBody,
  WorkspaceTableRow,
  WorkspaceTableHead,
  WorkspaceTableCell,
} from '@/widgets/project-workspace/ui/workspace-table'
export const UsageLimitsTab = ({ companyStats, fareData, currentFareData }: any) => {
  const stats = companyStats?.data || {};
  const fares: any[] = fareData?.data?.fares || [];
  const currentFare = currentFareData?.data?.fares?.[0];
  const fareId = currentFare?.id;
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Collect all unique fare items across all fares (preserving order)
  const allFareItemsMap = new Map<
    string,
    { id: string; name: string; type: string; group?: { id: string; name: string } }
  >();
  fares.forEach((fare) => {
    fare.fare_item_prices?.forEach((fip: any) => {
      if (!allFareItemsMap.has(fip.fare_item_id)) {
        allFareItemsMap.set(fip.fare_item_id, fip.fare_item);
      }
    });
  });
  const fareItemRows = Array.from(allFareItemsMap.values());

  // Group fare items by group.name (preserving first-appearance order)
  const OTHER_GROUP_KEY = "__other__";
  const groupedFareItems: {
    key: string;
    name: string;
    items: typeof fareItemRows;
  }[] = [];
  const groupIndexMap = new Map<string, number>();
  fareItemRows.forEach((fareItem) => {
    const groupKey = fareItem.group?.id || OTHER_GROUP_KEY;
    const groupName = fareItem.group?.name || "Other";
    let idx = groupIndexMap.get(groupKey);
    if (idx === undefined) {
      idx = groupedFareItems.length;
      groupIndexMap.set(groupKey, idx);
      groupedFareItems.push({ key: groupKey, name: groupName, items: [] });
    }
    groupedFareItems[idx].items.push(fareItem);
  });

  // Build lookup: fareId -> fareItemId -> value
  const fareValueMap: Record<string, Record<string, string>> = {};
  fares.forEach((fare) => {
    fareValueMap[fare.id] = {};
    fare.fare_item_prices?.forEach((fip: any) => {
      fareValueMap[fare.id][fip.fare_item_id] = fip.value;
    });
  });

  const formatFareValue = (value: string | undefined) => {
    if (!value || value === "-1") return "Unlimited";
    if (value === "0") return "—";
    const num = Number(value);
    if (!isNaN(num)) {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
    }
    return value;
  };

  const getPercentage = (current: number, limit: number) => {
    if (!limit) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const sumTokens = (t?: { input_tokens?: number; output_tokens?: number }) =>
    (t?.input_tokens ?? 0) + (t?.output_tokens ?? 0);

  const usageMetrics = [
    {
      key: "projects",
      label: "Projects",
      current: stats.project_count?.current ?? 0,
      limit: stats.project_count?.limit ?? 0,
      color: "bg-primary",
      textColor: "text-primary",
    },
    {
      key: "monthly_tokens",
      label: "Monthly Tokens",
      current: sumTokens(stats.tokens?.monthly),
      limit: stats.tokens?.monthly?.limit ?? 0,
      color: "bg-orange-500",
      textColor: "text-orange-500",
    },
    {
      key: "today_tokens",
      label: "Daily Tokens",
      current: sumTokens(stats.tokens?.daily),
      limit: stats.tokens?.daily?.limit ?? 0,
      color: "bg-pink-500",
      textColor: "text-pink-500",
    },
    {
      key: "builder",
      label: "Builder user",
      current: stats.builder_count?.current ?? 0,
      limit: stats.builder_count?.limit ?? 0,
      color: "bg-emerald-500",
      textColor: "text-emerald-500",
    },
  ];

  return (
    <div className="animate-in fade-in space-y-6 pt-4 duration-300">
      {/* Current plan banner */}
      <div className="bg-primary/10 border-primary/30 flex items-center justify-between rounded-xl border px-5 py-4">
        <div>
          <div className="text-primary mb-0.5 text-[11px] font-bold tracking-wide uppercase">
            Current Plan
          </div>
          <div className="text-text-main text-lg font-bold">
            {currentFare?.name || "—"}{" "}
            <span className="text-text-muted ml-1 text-[13px] font-normal">
              {currentFare
                ? currentFare.price > 0
                  ? `— $${currentFare.price} / month`
                  : "— Free"
                : ""}
            </span>
          </div>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => setUpgradeOpen(true)}>
          <ArrowUp size={16} /> Upgrade Plan
        </Button>
      </div>{" "}
      {/* Usage meters */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {usageMetrics.map((metric) => {
          const current = metric.current;
          const limit = metric.limit;
          const percentage = getPercentage(current, limit);

          const formatCurrent = (val: number) => val.toLocaleString();
          const formatLimit = (val: number) => val.toLocaleString();

          return (
            <div
              key={metric.key}
              className="bg-bg-card border-border-subtle flex min-h-[140px] flex-col justify-between rounded-xl border p-4 transition-shadow hover:shadow-md"
            >
              <div>
                <div className="text-text-muted mb-2 text-xs font-semibold">
                  {metric.label}
                </div>
                <div className="mb-2 flex flex-wrap items-baseline gap-1.5">
                  <span
                    className={cn("text-[20px] font-bold", metric.textColor)}
                  >
                    {formatCurrent(current)}
                  </span>
                  <span className="text-text-muted text-[12px]">
                    / {formatLimit(limit)}
                  </span>
                </div>
              </div>
              <div>
                <div className="bg-bg-sidebar mb-1.5 h-1.5 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      metric.color,
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-text-muted text-[11px]">
                  {formatCurrent(Math.max(limit - current, 0))} remaining
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Plan comparison table */}
      {fares.length > 0 && (
        <div>
          <div className="text-text-main mb-3 ml-1 text-sm font-semibold">
            Plan Comparison
          </div>
          <WorkspaceTableWrapper>
            <WorkspaceTable>
              <WorkspaceTableHeader>
                <WorkspaceTableRow>
                  <WorkspaceTableHead className="w-1/4">
                    Feature
                  </WorkspaceTableHead>
                  {fares.map((fare) => {
                    const isCurrent = fare.id === fareId;
                    return (
                      <WorkspaceTableHead
                        key={fare.id}
                        className={cn(
                          "text-center",
                          isCurrent &&
                            "bg-primary/5 text-primary border-t-primary border-x-primary/20 border-x border-t-2",
                        )}
                      >
                        <div className="font-bold">
                          {fare.name}
                          {isCurrent && " ✓"}
                        </div>
                        <div className="text-text-muted mt-0.5 text-[11px] font-normal normal-case">
                          {fare.price > 0 ? `$${fare.price}/mo` : "Free"}
                        </div>
                      </WorkspaceTableHead>
                    );
                  })}
                </WorkspaceTableRow>
              </WorkspaceTableHeader>
              <WorkspaceTableBody>
                {groupedFareItems.map((group, groupIdx) => {
                  const isLastGroup = groupIdx === groupedFareItems.length - 1;
                  return (
                    <React.Fragment key={group.key}>
                      <tr className="bg-bg-sidebar/60">
                        <td
                          colSpan={1 + fares.length}
                          className="border-border-subtle text-text-muted border-b px-3.5 py-2 text-[11px] font-bold tracking-[0.5px] uppercase"
                        >
                          {group.name}
                        </td>
                      </tr>
                      {group.items.map((fareItem, itemIdx) => {
                        const isLastRow =
                          isLastGroup && itemIdx === group.items.length - 1;
                        return (
                          <WorkspaceTableRow key={fareItem.id}>
                            <WorkspaceTableCell>
                              {fareItem.name}
                            </WorkspaceTableCell>
                            {fares.map((fare) => {
                              const isCurrent = fare.id === fareId;
                              const rawValue =
                                fareValueMap[fare.id]?.[fareItem.id];
                              const displayValue = formatFareValue(rawValue);
                              return (
                                <WorkspaceTableCell
                                  key={fare.id}
                                  className={cn(
                                    "text-center",
                                    isCurrent &&
                                      "bg-primary/5 text-primary border-x-primary/20 border-x font-semibold",
                                    isCurrent &&
                                      isLastRow &&
                                      "border-b-primary border-b-2",
                                  )}
                                >
                                  {displayValue}
                                </WorkspaceTableCell>
                              );
                            })}
                          </WorkspaceTableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </WorkspaceTableBody>
            </WorkspaceTable>
          </WorkspaceTableWrapper>
        </div>
      )}
      <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
};
