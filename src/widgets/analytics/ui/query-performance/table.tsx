"use client"

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import { useQueryPerformance, useAnalyticsStore } from "@/features/analytics";
import { QueryPerformanceMetric } from "@/entities/analytics";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui";
import { Info, ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";
import { useTranslations } from "next-intl";

export const QueryPerformanceTable = () => {
  const t = useTranslations('widgets.analytics');
  const { queryPerformanceFilters, expandedQueryRow, toggleExpandedQueryRow } = useAnalyticsStore();
  const { data: queries, isLoading } = useQueryPerformance(queryPerformanceFilters);
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns: ColumnDef<QueryPerformanceMetric>[] = [
    {
      accessorKey: "query",
      header: t("query"),
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate font-mono text-xs">
          <HighlightSQL query={row.original.query} />
        </div>
      ),
    },
    {
      accessorKey: "timeConsumedSeconds",
      header: ({ column }) => <SortableHeader column={column} title={t("timeConsumed")} />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-text-main font-medium">{row.original.timeConsumedPercent}%</span>
          <span className="text-[10px] text-text-muted">{row.original.timeConsumedSeconds}s</span>
        </div>
      ),
    },
    {
      accessorKey: "calls",
      header: ({ column }) => <SortableHeader column={column} title={t("calls")} />,
      cell: ({ row }) => <span>{row.original.calls.toLocaleString()}</span>,
    },
    {
      accessorKey: "maxTime",
      header: ({ column }) => <SortableHeader column={column} title={t("maxTime")} />,
      cell: ({ row }) => <TimeCell value={row.original.maxTime} />,
    },
    {
      accessorKey: "meanTime",
      header: ({ column }) => <SortableHeader column={column} title={t("meanTime")} />,
      cell: ({ row }) => <TimeCell value={row.original.meanTime} />,
    },
    {
      accessorKey: "minTime",
      header: ({ column }) => <SortableHeader column={column} title={t("minTime")} />,
      cell: ({ row }) => <TimeCell value={row.original.minTime} />,
    },
    {
      accessorKey: "rowsProcessed",
      header: ({ column }) => <SortableHeader column={column} title={t("rowsProcessed")} />,
      cell: ({ row }) => <span>{row.original.rowsProcessed.toLocaleString()}</span>,
    },
    {
      accessorKey: "cacheHitRate",
      header: ({ column }) => <SortableHeader column={column} title={t("cacheHitRate")} />,
      cell: ({ row }) => <span>{row.original.cacheHitRate}%</span>,
    },
    {
      accessorKey: "role",
      header: t("role"),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{row.original.role}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 text-text-muted" />
              </TooltipTrigger>
              <TooltipContent>{t("postgresRole", { role: row.original.role })}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: queries || [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="ai-card border border-border-subtle rounded-xl overflow-hidden bg-bg-card">
      <Table>
        <TableHeader className="bg-bg-sidebar/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent border-border-subtle">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-[11px] uppercase font-bold text-text-muted px-4 py-3">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="border-border-subtle">
                {columns.map((_, j) => (
                  <TableCell key={j} className="p-4">
                    <div className="h-4 w-full bg-hover-bg animate-pulse rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            table.getRowModel().rows.map((row) => (
              <React.Fragment key={row.id}>
                <TableRow
                  className={cn(
                    "cursor-pointer hover:bg-hover-bg transition-colors border-border-subtle",
                    expandedQueryRow === row.original.id && "bg-hover-bg"
                  )}
                  onClick={() => toggleExpandedQueryRow(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
                <AnimatePresence>
                  {expandedQueryRow === row.original.id && (
                    <TableRow className="hover:bg-transparent border-none">
                      <TableCell colSpan={columns.length} className="p-0">
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 bg-hover-bg/30 border-y border-border-subtle">
                            <h4 className="text-xs font-bold text-text-muted uppercase mb-3">{t("fullQuery")}</h4>
                            <div className="bg-bg-card p-4 rounded-lg border border-border-subtle overflow-x-auto">
                              <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed">
                                <HighlightSQL query={row.original.query} />
                              </pre>
                            </div>
                          </div>
                        </motion.div>
                      </TableCell>
                    </TableRow>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

const HighlightSQL = ({ query }: { query: string }) => {
  const keywords = ["SELECT", "FROM", "WHERE", "UPDATE", "SET", "INSERT", "INTO", "VALUES", "DELETE", "GROUP BY", "ORDER BY", "JOIN", "ON", "AND", "OR", "LIMIT", "OFFSET"];
  const parts = query.split(new RegExp(`(${keywords.join("|")})`, "gi"));

  return (
    <>
      {parts.map((part, i) => {
        const isKeyword = keywords.includes(part.toUpperCase());
        return (
          <span key={i} className={isKeyword ? "text-primary font-bold" : "text-text-main"}>
            {part}
          </span>
        );
      })}
    </>
  );
};

const SortableHeader = ({ column, title }: { column: any, title: string }) => (
  <button
    className="flex items-center gap-1 hover:text-text-main transition-colors"
    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
  >
    {title}
    {column.getIsSorted() === "asc" ? (
      <ChevronUp className="w-3 h-3" />
    ) : column.getIsSorted() === "desc" ? (
      <ChevronDown className="w-3 h-3" />
    ) : (
      <ArrowUpDown className="w-3 h-3 opacity-30" />
    )}
  </button>
);

const TimeCell = ({ value }: { value: number }) => (
  <span className={cn(value === 0 ? "opacity-30" : "text-text-main")}>
    {value === 0 ? "-" : `${value}ms`}
  </span>
);
