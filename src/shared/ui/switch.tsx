'use client'

import * as React from "react"
import { cn } from "@/shared/lib/utils/cn"

interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void,
  size?: 'sm' | 'md' | 'lg'
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, onCheckedChange, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: { container: "h-4 w-8", thumb: "h-3 w-3", translate: "translate-x-4" },
      md: { container: "h-5 w-9", thumb: "h-4 w-4", translate: "translate-x-4" },
      lg: { container: "h-6 w-11", thumb: "h-5 w-5", translate: "translate-x-5" },
    }[size]

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-state={checked ? "checked" : "unchecked"}
        className={cn(
          "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          sizeClasses.container,
          checked ? "bg-primary" : "bg-border-subtle hover:bg-border-subtle/80",
          className
        )}
        onClick={() => onCheckedChange?.(!checked)}
        ref={ref}
        {...props}
      >
        <span
          data-state={checked ? "checked" : "unchecked"}
          className={cn(
            "pointer-events-none block rounded-full bg-white shadow-md ring-0 transition-transform border border-black/5",
            sizeClasses.thumb,
            checked ? sizeClasses.translate : "translate-x-0"
          )}
        />
      </button>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
