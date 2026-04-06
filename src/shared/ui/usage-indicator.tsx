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
  return (
    <div className={cn("flex items-center gap-2 bg-bg-card border border-border-subtle rounded-lg px-4 py-2 shadow-sm", className)}>
      <span className="text-[12px] text-text-muted">{label}</span>
      <span className="text-[15px] font-bold text-primary">{value}</span>
      <span className="text-[12px] text-text-muted">/ {total}</span>
      <div className="w-[60px] h-1.5 bg-bg-subtle rounded-full ml-1 overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all duration-300" 
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  )
}
