"use client"

import { DeploymentSummary } from "./deployment-summary";
import { FunctionsCharts } from "./functions-charts";
import { ConcurrencyCharts } from "./concurrency-charts";
import { InsightsPanel } from "./insights-panel";
import { useAnalyticsStore } from "@/entities/analytics";
import { ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

export const HealthTab = () => {
  const t = useTranslations('widgets.analytics');
  const { collapsedSections, toggleSection } = useAnalyticsStore();

  const sections = [
    { id: 'summary', title: t("deploymentSummary"), Component: DeploymentSummary },
    { id: 'functions', title: t("functions"), Component: FunctionsCharts },
    { id: 'concurrency', title: t("concurrency"), Component: ConcurrencyCharts },
    { id: 'insights', title: t("insights"), Component: InsightsPanel },
  ];

  return (
    <div className="space-y-6">
      {sections.map(({ id, title, Component }) => {
        const isCollapsed = collapsedSections.has(id);
        
        return (
          <div key={id} className="ai-card border border-border-subtle rounded-xl overflow-hidden bg-bg-card">
            <button
              onClick={() => toggleSection(id)}
              className="w-full flex items-center justify-between p-4 hover:bg-hover-bg transition-colors"
            >
              <h3 className="text-sm font-semibold text-text-main flex items-center gap-2">
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {title}
              </h3>
            </button>
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-4 pt-0">
                    <Component />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
