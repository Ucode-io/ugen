"use client"

import { useVisitorStats, useAnalyticsStore } from "@/features/analytics";
import { Skeleton } from "@/shared/ui";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const VisitorsMainChart = () => {
  const { activePeriod, activeVisitorMetric } = useAnalyticsStore();
  const { data: stats, isLoading } = useVisitorStats(activePeriod, activeVisitorMetric);

  if (isLoading) return <Skeleton className="h-[350px] w-full rounded-xl" />;
  if (!stats) return null;

  return (
    <div className="ai-card p-6 bg-bg-card border border-border-subtle rounded-xl h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">{activeVisitorMetric} Over Time</h4>
        <div className="text-[10px] text-text-muted">ALL TIMES IN UTC</div>
      </div>
      <ResponsiveContainer width="100%" height="80%">
        <LineChart data={stats}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--text-muted)", fontSize: 10 }}
            tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--text-muted)", fontSize: 10 }}
          />
          <Tooltip
            content={<CustomTooltip />}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: "var(--color-primary)", stroke: "var(--bg-card)", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-card border border-border-subtle p-3 rounded-lg shadow-xl">
        <p className="text-[10px] font-bold text-text-muted mb-2 uppercase">
          {new Date(label).toDateString()}
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs font-bold text-text-main">
            {payload[0].value.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }
  return null;
};
