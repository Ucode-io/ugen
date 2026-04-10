import React from 'react'
import { cn } from '@/shared/lib/utils/cn'

export interface SubTabOption {
  id: string
  label: string
  icon?: React.ElementType
}

export interface SubTabsProps {
  options: SubTabOption[]
  activeId: string
  onTabChange: (id: string) => void
  containerClassName?: string
  tabClassName?: string
}

export function SubTabs({
  options,
  activeId,
  onTabChange,
  containerClassName,
  tabClassName
}: SubTabsProps) {
  return (
    <div className={cn("flex gap-1 border-b border-border-subtle", containerClassName)}>
      {options.map((tab) => {
        const Icon = tab.icon
        const isActive = activeId === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-4 py-2.5 text-[13px] font-medium transition-all border-b-2 outline-none flex items-center gap-2 -mb-[1px] bg-transparent",
              isActive
                ? "text-primary border-primary"
                : "text-text-muted border-transparent hover:text-text-main",
              tabClassName
            )}
          >
            {Icon && <Icon size={14} className={cn(isActive ? "text-primary" : "text-text-muted")} />}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
