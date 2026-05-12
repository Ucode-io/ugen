"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from "@tanstack/react-table";

import {
  WorkspaceTableWrapper,
  WorkspaceTable,
  WorkspaceTableHeader,
  WorkspaceTableBody,
  WorkspaceTableRow,
  WorkspaceTableHead,
  WorkspaceTableCell,
} from "./workspace-table";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";

import { cn } from "@/shared/lib/utils/cn";
import { useTranslations } from "next-intl";

interface WorkspaceDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  totalCount?: number;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  isLoading?: boolean;
  className?: string;
  tableClassName?: string;
  containerClassName?: string;
  emptyMessage?: string;
  onRowClick?: (data: TData) => void;
}

export function WorkspaceDataTable<TData, TValue>({
  columns,
  data,
  totalCount = 0,
  page = 1,
  limit = 10,
  onPageChange,
  onLimitChange,
  isLoading = false,
  className,
  tableClassName,
  containerClassName,
  emptyMessage,
  onRowClick,
}: WorkspaceDataTableProps<TData, TValue>) {
  const t = useTranslations("shared.dataTable");
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / limit) || 1,
  });

  const totalPages = Math.ceil(totalCount / limit) || 1;

  const renderPageNumbers = () => {
    const pages = [];
    const showMax = 5;

    let startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, startPage + showMax - 1);

    if (endPage - startPage < showMax - 1) {
      startPage = Math.max(1, endPage - showMax + 1);
    }

    if (startPage > 1) {
      pages.push(
        <PaginationItem key="1">
          <PaginationLink onClick={() => onPageChange?.(1)}>1</PaginationLink>
        </PaginationItem>,
      );
      if (startPage > 2)
        pages.push(<PaginationEllipsis key="start-ellipsis" />);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink
            isActive={page === i}
            onClick={() => onPageChange?.(i)}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1)
        pages.push(<PaginationEllipsis key="end-ellipsis" />);
      pages.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => onPageChange?.(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    return pages;
  };

  const showFooter = totalCount > 0 && onPageChange && onLimitChange;

  return (
    <div className={cn("flex min-w-0 flex-col gap-4", className)}>
      <WorkspaceTableWrapper className={cn("min-w-0 max-w-full flex-1", containerClassName)}>
        <WorkspaceTable className={tableClassName}>
          <WorkspaceTableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <WorkspaceTableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <WorkspaceTableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </WorkspaceTableHead>
                  );
                })}
              </WorkspaceTableRow>
            ))}
          </WorkspaceTableHeader>
          <WorkspaceTableBody>
            {isLoading ? (
              Array.from({ length: Math.min(limit, 10) }).map((_, i) => (
                <WorkspaceTableRow key={`skeleton-${i}`}>
                  {columns.map((_, j) => (
                    <WorkspaceTableCell key={`skeleton-cell-${j}`}>
                      <div className="bg-hover-bg h-4 w-full animate-pulse rounded" />
                    </WorkspaceTableCell>
                  ))}
                </WorkspaceTableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <WorkspaceTableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <WorkspaceTableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </WorkspaceTableCell>
                  ))}
                </WorkspaceTableRow>
              ))
            ) : (
              <WorkspaceTableRow>
                <WorkspaceTableCell
                  colSpan={columns.length}
                  className="text-text-muted h-24 py-4 text-center whitespace-pre-wrap"
                >
                  {emptyMessage || t("emptyMessage")}
                </WorkspaceTableCell>
              </WorkspaceTableRow>
            )}
          </WorkspaceTableBody>
        </WorkspaceTable>
      </WorkspaceTableWrapper>

      {showFooter && (
        <div className="flex flex-col items-center justify-between gap-y-4 px-4 py-3 sm:flex-row sm:gap-x-6">
          <div className="flex w-full flex-col items-center gap-y-3 sm:w-auto sm:flex-row sm:gap-x-6">
            <div className="flex w-full items-center justify-center gap-x-2 sm:w-auto sm:justify-start">
              <p className="text-text-muted text-[13px] font-medium whitespace-nowrap">
                {t("rowsPerPage")}
              </p>
              <Select
                value={limit.toString()}
                onValueChange={(value) => onLimitChange?.(Number(value))}
              >
                <SelectTrigger className="bg-bg-card border-border-subtle h-8 w-[70px]">
                  <SelectValue placeholder={limit.toString()} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={pageSize.toString()}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-text-muted w-full text-center text-[12px] whitespace-nowrap sm:text-left">
              {t("showingEntries", {
                start: Math.min((page - 1) * limit + 1, totalCount),
                end: Math.min(page * limit, totalCount),
                total: totalCount,
              })}
            </p>
          </div>

          <Pagination className="mx-0 w-full justify-center sm:w-auto sm:justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange?.(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className={cn(
                    "cursor-pointer",
                    page === 1 && "pointer-events-none opacity-50",
                  )}
                />
              </PaginationItem>

              {renderPageNumbers()}

              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages || totalPages === 0}
                  className={cn(
                    "cursor-pointer",
                    (page === totalPages || totalPages === 0) &&
                      "pointer-events-none opacity-50",
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
