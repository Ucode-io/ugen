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
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-state={checked ? "checked" : "unchecked"}
        className={cn(
          `peer inline-flex h-${size === 'sm' ? '5' : size === 'md' ? '6' : '7'} w-${size === 'sm' ? '10' : size === 'md' ? '11' : '13'} shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`,
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
            `pointer-events-none block h-${size === 'sm' ? '4' : size === 'md' ? '5' : '6'} w-${size === 'sm' ? '4' : size === 'md' ? '5' : '6'} rounded-full bg-white shadow-md ring-0 transition-transform border border-black/5`,
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
