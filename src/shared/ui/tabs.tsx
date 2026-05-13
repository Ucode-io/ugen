"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/shared/lib/utils/cn"

// --- Radix UI Primitives ---

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

// --- Reusable Tabs Component ---

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

const ReusableTabs = ({
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
    <div className={cn("flex items-center gap-1.5 bg-bg-main p-1 rounded-lg border border-border-subtle w-fit", className)}>
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

export { Tabs, TabsList, TabsTrigger, TabsContent, ReusableTabs }
