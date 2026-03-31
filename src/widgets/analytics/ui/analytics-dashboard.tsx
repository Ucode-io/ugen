"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui";
import { OverviewTab } from "./overview";
import { HealthTab } from "./health";
import { QueryPerformanceTab } from "./query-performance";
import { VisitorsTab } from "./visitors";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

export const AnalyticsDashboard = () => {
  const t = useTranslations('widgets.analytics');

  const tabs = [
    { id: "overview", label: t("overview") },
    { id: "health", label: t("health") },
    { id: "query-performance", label: t("queryPerformance") },
    { id: "visitors", label: t("visitors") },
  ];

  return (
    <Tabs defaultValue="overview" className="w-full space-y-6">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <TabsList className="bg-transparent p-0 h-auto gap-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="px-4 py-2 text-text-muted data-[state=active]:text-text-main data-[state=active]:bg-bg-card data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none transition-all"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <AnimatePresence mode="wait">
        <TabsContent value="overview">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <OverviewTab />
          </motion.div>
        </TabsContent>
        <TabsContent value="health">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <HealthTab />
          </motion.div>
        </TabsContent>
        <TabsContent value="query-performance">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <QueryPerformanceTab />
          </motion.div>
        </TabsContent>
        <TabsContent value="visitors">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <VisitorsTab />
          </motion.div>
        </TabsContent>
      </AnimatePresence>
    </Tabs>
  );
};
