import * as React from "react"
import { cn } from "@/shared/lib/utils/cn"
import { Check } from "lucide-react"

interface PermissionCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

export const PermissionCheckbox = React.forwardRef<HTMLInputElement, PermissionCheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <div className="relative flex items-center justify-center w-4 h-4">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className={cn(
            "peer w-4 h-4 rounded border border-border-subtle bg-transparent cursor-pointer transition-all",
            "hover:ring-2 hover:ring-primary/10 hover:border-border-subtle/80",
            "checked:bg-transparent checked:border-primary",
            "appearance-none",
            className
          )}
          {...props}
        />
        <Check
          className="absolute pointer-events-none w-3 h-3 text-primary opacity-0 peer-checked:opacity-100 transition-all scale-50 peer-checked:scale-100"
          strokeWidth={4}
        />
      </div>
    )
  }
)
PermissionCheckbox.displayName = "PermissionCheckbox"
