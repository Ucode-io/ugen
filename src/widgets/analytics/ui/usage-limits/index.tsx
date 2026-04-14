import React from 'react'
import { ArrowUp } from "lucide-react";
import { Button } from '@/shared/ui'
import { cn } from '@/shared/lib/utils/cn'
import {
  formatBytesAsGB,
  formatMBAsGB,
  formatMBSmart,
} from "@/shared/lib/utils/format-bytes";
import {
  WorkspaceTableWrapper,
  WorkspaceTable,
  WorkspaceTableHeader,
  WorkspaceTableBody,
  WorkspaceTableRow,
  WorkspaceTableHead,
  WorkspaceTableCell,
} from '@/widgets/project-workspace/ui/workspace-table'
import { useAuthStore } from "@/entities/session";

export const UsageLimitsTab = ({ pricingData, fareData }: any) => {
  const d = pricingData?.data || {};
  const fares: any[] = fareData?.data?.fares || [];
  const fareId = useAuthStore((state) => state.project?.fare_id);
  const currentFareName: string =
    fares.find((fare) => fare.id === fareId)?.name || "";

  // Collect all unique fare items across all fares (preserving order)
  const allFareItemsMap = new Map<
    string,
    { id: string; name: string; type: string }
  >();
  fares.forEach((fare) => {
    fare.fare_item_prices?.forEach((fip: any) => {
      if (!allFareItemsMap.has(fip.fare_item_id)) {
        allFareItemsMap.set(fip.fare_item_id, fip.fare_item);
      }
    });
  });
  const fareItemRows = Array.from(allFareItemsMap.values());

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

  const formatUnit = (value: number, unit: string) => {
    if (unit !== "bytes") return value.toLocaleString();
    return formatBytesAsGB(value);
  };

  const getPercentage = (current: number, limit: number) => {
    if (!limit) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  return (
    <div className="animate-in fade-in space-y-6 pt-4 duration-300">
      {/* Current plan banner */}
      <div className="bg-primary/10 border-primary/30 flex items-center justify-between rounded-xl border px-5 py-4">
        <div>
          <div className="text-primary mb-0.5 text-[11px] font-bold tracking-wide uppercase">
            Current Plan
          </div>
          <div className="text-text-main text-lg font-bold">
            Small{" "}
            <span className="text-text-muted ml-1 text-[13px] font-normal">
              — $300 / month
            </span>
          </div>
        </div>
        <Button className="shrink-0 gap-2">
          <ArrowUp size={16} /> Upgrade Plan
        </Button>
      </div>{" "}
      {/* Usage meters */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {[
          {
            key: "monthly_api_calls",
            label: "API call per month",
            color: "bg-primary",
            textColor: "text-primary",
          },
          {
            key: "database_size",
            label: "Database size",
            color: "bg-blue-500",
            textColor: "text-blue-500",
          },
          {
            key: "items",
            label: "DB records (row)",
            color: "bg-green-500",
            textColor: "text-green-500",
          },
          {
            key: "asset_size",
            label: "File size",
            color: "bg-purple-500",
            textColor: "text-purple-500",
          },
          {
            key: "monthly_tokens",
            label: "Monthly Tokens",
            color: "bg-orange-500",
            textColor: "text-orange-500",
          },
          {
            key: "today_tokens",
            label: "Daily Tokens",
            color: "bg-pink-500",
            textColor: "text-pink-500",
          },
        ].map((metric) => {
          const item = d[metric.key];
          const current = item?.current || 0;
          const limit = item?.limit || 0;
          const unit = item?.unit || "count";
          const percentage = getPercentage(current, limit);

          const formatCurrent = (val: number) => {
            if (unit === "count") return val.toLocaleString();
            if (unit === "tokens") return val.toLocaleString();
            if (unit === "MB") return formatMBSmart(val);
            return formatUnit(val, unit);
          };

          const formatLimit = (val: number) => {
            if (unit === "count") return val.toLocaleString();
            if (unit === "tokens") return val.toLocaleString();
            if (unit === "MB") return formatMBAsGB(val);
            return formatUnit(val, unit);
          };

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
                    const isCurrent = fare.name === currentFareName;
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
                {fareItemRows.map((fareItem, rowIdx) => {
                  const isLast = rowIdx === fareItemRows.length - 1;
                  return (
                    <WorkspaceTableRow key={fareItem.id}>
                      <WorkspaceTableCell>{fareItem.name}</WorkspaceTableCell>
                      {fares.map((fare) => {
                        const isCurrent = fare.name === currentFareName;
                        const rawValue = fareValueMap[fare.id]?.[fareItem.id];
                        const displayValue = formatFareValue(rawValue);
                        return (
                          <WorkspaceTableCell
                            key={fare.id}
                            className={cn(
                              "text-center",
                              isCurrent &&
                                "bg-primary/5 text-primary border-x-primary/20 border-x font-semibold",
                              isCurrent &&
                                isLast &&
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
              </WorkspaceTableBody>
            </WorkspaceTable>
          </WorkspaceTableWrapper>
        </div>
      )}
    </div>
  );
};
