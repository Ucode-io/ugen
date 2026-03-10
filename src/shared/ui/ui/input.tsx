'use client'

import * as React from "react"
import { cn } from "@/shared/lib/utils/cn"
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "w-full rounded-lg border border-border-subtle bg-bg-sidebar px-3 py-2 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-50 read-only:opacity-70",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
