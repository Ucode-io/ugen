import * as React from "react"
import { cn } from "@/shared/lib/utils/cn"

const WorkspaceTableWrapper = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("bg-bg-card border border-border-subtle rounded-xl overflow-hidden", className)}
      {...props}
    />
  )
)
WorkspaceTableWrapper.displayName = "WorkspaceTableWrapper"

const WorkspaceTable = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-auto">
      <table
        ref={ref}
        className={cn("w-full border-collapse text-left", className)}
        {...props}
      />
    </div>
  )
)
WorkspaceTable.displayName = "WorkspaceTable"

const WorkspaceTableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={className} {...props} />
  )
)
WorkspaceTableHeader.displayName = "WorkspaceTableHeader"

const WorkspaceTableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={className} {...props} />
  )
)
WorkspaceTableBody.displayName = "WorkspaceTableBody"

const WorkspaceTableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "group transition-colors",
        className
      )}
      {...props}
    />
  )
)
WorkspaceTableRow.displayName = "WorkspaceTableRow"

const WorkspaceTableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "p-[10px_14px] bg-bg-sidebar text-text-muted font-medium text-[12px] uppercase tracking-[0.5px] border-b border-border-subtle whitespace-nowrap",
        className
      )}
      {...props}
    />
  )
)
WorkspaceTableHead.displayName = "WorkspaceTableHead"

const WorkspaceTableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "p-[10px_14px] border-b border-border-subtle text-[13px] text-text-main group-last:border-b-0 group-hover:bg-bg-sidebar transition-colors align-middle",
        className
      )}
      {...props}
    />
  )
)
WorkspaceTableCell.displayName = "WorkspaceTableCell"

export {
  WorkspaceTableWrapper,
  WorkspaceTable,
  WorkspaceTableHeader,
  WorkspaceTableBody,
  WorkspaceTableRow,
  WorkspaceTableHead,
  WorkspaceTableCell,
}
