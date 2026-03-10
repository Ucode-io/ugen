'use client'

import * as React from "react"
import { cn } from "@/shared/lib/utils/cn"

interface TabOption {
  id: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
}

interface ReusableTabsProps {
  options: TabOption[]
  activeId: string
  onTabChange: (id: string) => void
  className?: string
  tabClassName?: string
  size?: 'sm' | 'md' | 'lg'
}

export const ReusableTabs = ({
  options,
  activeId,
  onTabChange,
  className,
  tabClassName,
  size = 'md'
}: ReusableTabsProps) => {
  const sizeClasses = {
    sm: "text-[10px] px-1 py-0.5",
    md: "text-[13px] px-2 py-1",
    lg: "text-[15px] px-4 py-2",
  }

  return (
    <div className={cn("flex items-center gap-1.5 bg-bg-main p-1 rounded-lg border border-border-subtle", className)}>
      {options.map((option) => {
        const isActive = activeId === option.id

        return (
          <button
            key={option.id}
            onClick={() => onTabChange(option.id)}
            disabled={option.disabled}
            className={cn(
              "p-1.5 px-3 rounded-md transition-all duration-200 flex items-center justify-center gap-2 font-medium shrink-0 group relative",
              sizeClasses[size],
              isActive
                ? "bg-bg-card shadow-sm text-text-main"
                : "text-text-muted hover:text-text-main hover:bg-hover-bg disabled:opacity-50 disabled:cursor-not-allowed",
              tabClassName
            )}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
