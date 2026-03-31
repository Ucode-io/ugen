"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/shared/lib/utils/cn"

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<
  HTMLInputElement,
  CheckboxProps
>(({ className, label, description, checked, onCheckedChange, id, ...props }, ref) => {
  const randId = React.useId()
  const checkboxId = id || randId

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCheckedChange?.(e.target.checked)
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="relative flex items-center h-5">
        <input
          type="checkbox"
          ref={ref}
          id={checkboxId}
          checked={checked}
          onChange={handleChange}
          className={cn(
            "peer h-5 w-5 rounded border border-border-subtle bg-bg-card checked:bg-primary checked:border-primary focus:ring-1 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 appearance-none",
            className
          )}
          {...props}
        />
        <Check
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity duration-200"
        />
      </div>
      {(label || description) && (
        <label
          htmlFor={checkboxId}
          className="grid gap-1.5 leading-none cursor-pointer select-none"
        >
          {label && (
            <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {label}
            </span>
          )}
          {description && (
            <p className="text-sm text-color-text-muted">
              {description}
            </p>
          )}
        </label>
      )}
    </div>
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }
