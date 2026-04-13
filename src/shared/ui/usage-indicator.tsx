import React from "react"
import { cn } from "@/shared/lib/utils/cn"

interface UsageIndicatorProps {
  label: string
  value: string | number
  total: string | number
  percentage: number
  className?: string
}

export const UsageIndicator = ({ label, value, total, percentage, className }: UsageIndicatorProps) => {
  const clamped = Math.min(100, Math.max(0, percentage))
  const isHigh = clamped >= 90

  return (
    <div className={cn("flex flex-col gap-1.5 bg-bg-card border border-border-subtle rounded-lg px-4 py-3 shadow-sm min-w-[220px]", className)}>
      <div className="flex items-center justify-between gap-0.5">
        <span className="text-[12px] text-text-muted whitespace-nowrap">{label}</span>
        <div className="w-full h-1.5 bg-bg-subtle rounded-full overflow-hidden border border-border-subtle">
        <div
          className={cn("h-full rounded-full transition-all duration-300", isHigh ? "bg-red-500" : "bg-primary")}
          style={{ width: `${clamped }%` }}
        />
      </div>
        <span className="text-[12px] text-text-muted whitespace-nowrap">
          <span className={cn("font-semibold", isHigh ? "text-red-500" : "text-primary")}>{value}</span>
          {" / "}{total}
        </span>
      </div>
    </div>
  )
}
