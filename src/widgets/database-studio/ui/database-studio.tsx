"use client";

import React, { useState } from "react";
import { Table as TableIcon, Terminal, Network } from "lucide-react";
import { useDatabaseStore, DatabaseView } from "@/entities/database";
import {
  TablesView,
  RecordsView,
  SqlConsole,
  QueryView,
  LogsView,
  PlaceholderView,
  DbDiagramView,
} from "./index";
import { cn } from "@/shared/lib/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api";
import { UsageIndicator } from "@/shared/ui";
import { formatMBSmart, formatMBAsGB } from "@/shared/lib/utils/format-bytes";

export const DatabaseStudio = ({ projectId }: { projectId: string }) => {
  const t = useTranslations("widgets.databaseStudio");
  const { currentView, setCurrentView, breadcrumbs, resetToTables } =
    useDatabaseStore();

  const [isPannelOpen, setIsPannelOpen] = useState(true);

  const { data: pricingData } = useQuery({
    queryKey: ["pricing-all"],
    queryFn: async () => {
      const { data } = await api.get("/v1/pricing/all");
      return data;
    },
  });

  const dbSize = pricingData?.data?.database_size;
  const dbUsed = dbSize ? formatMBSmart(dbSize.current || 0) : "0 MB";
  const dbTotal = dbSize ? formatMBAsGB(dbSize.limit || 0) : "0 GB";
  const dbPercentage = dbSize?.limit
    ? Math.min(((dbSize.current || 0) / dbSize.limit) * 100, 100)
    : 0;

  const onTogglePannel = () => {
    setIsPannelOpen(!isPannelOpen);
  };

  const isTableEditor =
    currentView !== "sql-console" && currentView !== "db-diagram";

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="border-border-subtle bg-bg-main flex h-10 shrink-0 items-center gap-1 border-b px-5">
        <button
          onClick={() => setCurrentView("tables")}
          className={cn(
            "flex h-full cursor-pointer items-center gap-1.5 border-b-2 border-none bg-transparent px-2.5 text-[13px] font-[500] transition-colors",
            isTableEditor
              ? "border-[#004eea] text-[#004eea]"
              : "text-text-muted hover:text-text-main border-transparent",
          )}
        >
          <TableIcon size={14} /> Table Editor
        </button>
        <button
          onClick={() => setCurrentView("db-diagram")}
          className={cn(
            "flex h-full cursor-pointer items-center gap-1.5 border-b-2 border-none bg-transparent px-2.5 text-[13px] font-[500] transition-colors",
            currentView === "db-diagram"
              ? "border-[#004eea] text-[#004eea]"
              : "text-text-muted hover:text-text-main border-transparent",
          )}
        >
          <Network size={14} /> DB Diagram
        </button>
        <button
          onClick={() => setCurrentView("sql-console")}
          className={cn(
            "flex h-full cursor-pointer items-center gap-1.5 border-b-2 border-none bg-transparent px-2.5 text-[13px] font-[500] transition-colors",
            currentView === "sql-console"
              ? "border-[#004eea] text-[#004eea]"
              : "text-text-muted hover:text-text-main border-transparent",
          )}
        >
          <Terminal size={14} /> SQL Editor
        </button>
        <div className="flex-1"></div>
        <div className="shrink-0">
          <UsageIndicator
            label="Database size"
            value={dbUsed}
            total={dbTotal}
            percentage={dbPercentage}
            className="border-none bg-transparent py-1 shadow-none"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {currentView === "sql-console" ? (
          <div className="flex flex-1 overflow-hidden">
            <SqlConsole />
          </div>
        ) : currentView === "db-diagram" ? (
          <div className="flex flex-1 overflow-hidden">
            <DbDiagramView projectId={projectId} />
          </div>
        ) : (
          <>
            {isPannelOpen && (
              <div className="border-border-subtle bg-bg-card flex min-h-[540px] w-[220px] min-w-[220px] flex-col overflow-y-auto border-r pt-2">
                <TablesView />
              </div>
            )}
            <div className="bg-bg-main flex flex-1 flex-col overflow-hidden">
              {/* Need to be careful here: RecordsView expects to just display records. However, if no table is selected, we should show a placeholder or something */}
              <RecordsView
                projectId={projectId}
                isPannelOpen={isPannelOpen}
                onTogglePannel={onTogglePannel}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
