import { cn } from "@/shared/lib/utils/cn"

interface WorkspaceLoaderProps {
  message: string
  subMessage?: string
  className?: string
}

export const WorkspaceLoader = ({ message, subMessage, className }: WorkspaceLoaderProps) => (
  <div
    className={cn(
      "absolute inset-0 z-50 flex flex-col items-center justify-center",
      "backdrop-blur-[8px] bg-bg-main/55",
      className
    )}
  >
    {/* Top sliding progress bar */}
    <div className="absolute top-0 left-0 right-0 h-[2px] bg-border-subtle overflow-hidden">
      <div
        className="absolute top-0 left-0 h-full w-1/3 rounded-full bg-primary"
        style={{ animation: "loader-slide 1.5s ease-in-out infinite" }}
      />
    </div>

    {/* Center content */}
    <div className="flex flex-col items-center gap-4 select-none">
      {/* Spinner */}
      <div className="relative w-11 h-11">
        <div className="absolute inset-0 rounded-full border-[2.5px] border-border-subtle" />
        <div className="absolute inset-0 rounded-full border-[2.5px] border-transparent border-t-primary animate-spin" />
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-semibold text-text-main tracking-tight">{message}</p>
        {subMessage && (
          <p className="text-xs text-text-muted animate-pulse">{subMessage}</p>
        )}
      </div>
    </div>
  </div>
)
