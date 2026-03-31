"use client"

import * as React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { TooltipProvider, Tooltip as RadixTooltip, TooltipTrigger, TooltipContent } from "@/shared/ui";
import { Info } from "lucide-react";

interface AnalyticsChartProps {
  title: string;
  tooltip?: string;
  data: any[];
  lines: { key: string; color: string; name: string }[];
  type?: "line" | "area";
  height?: number;
}

export const AnalyticsChart = ({
  title,
  tooltip,
  data,
  lines,
  type = "line",
  height = 200,
}: AnalyticsChartProps) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ height: `${height + 60}px` }} className="bg-bg-card rounded-xl border border-border-subtle animate-pulse" />;
  }

  return (
    <div className="flex flex-col gap-4 bg-bg-card p-4 rounded-xl border border-border-subtle h-full min-h-[260px]">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-muted uppercase tracking-wider">{title}</span>
        {tooltip && (
          <TooltipProvider>
            <RadixTooltip>
              <TooltipTrigger asChild>
                <button className="focus:outline-none">
                  <Info className="w-3.5 h-3.5 text-text-muted hover:text-primary transition-colors cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{tooltip}</TooltipContent>
            </RadixTooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="flex-1" style={{ width: '100%', height: `${height}px`, minHeight: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="timestamp"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                tickFormatter={(val) => {
                  try {
                    return new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  } catch (e) {
                    return "";
                  }
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: "var(--bg-card)", 
                  borderColor: "var(--border)", 
                  borderRadius: "8px",
                  fontSize: "12px"
                }}
                itemStyle={{ color: "var(--text-main)" }}
                labelStyle={{ color: "var(--text-muted)", fontSize: "10px", marginBottom: "4px" }}
                labelFormatter={(val) => {
                  try {
                    return new Date(val).toLocaleString();
                  } catch (e) {
                    return "";
                  }
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
              {lines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: line.color, stroke: "var(--bg-card)", strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          ) : (
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="timestamp" hide />
              <YAxis hide />
              <Tooltip />
              {lines.map((line) => (
                <Area
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  stroke={line.color}
                  fill={line.color}
                  fillOpacity={0.1}
                />
              ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
