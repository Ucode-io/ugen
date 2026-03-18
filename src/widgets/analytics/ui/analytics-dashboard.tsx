"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/ui/tabs";
import { OverviewTab } from "./overview";
import { HealthTab } from "./health";
import { QueryPerformanceTab } from "./query-performance";
import { VisitorsTab } from "./visitors";
import { motion, AnimatePresence } from "framer-motion";

export const AnalyticsDashboard = () => {
  return (
    <Tabs defaultValue="overview" className="w-full space-y-6">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <TabsList className="bg-transparent p-0 h-auto gap-1">
          {["Overview", "Health", "Query Performance", "Visitors"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab.toLowerCase().replace(" ", "-")}
              className="px-4 py-2 text-text-muted data-[state=active]:text-text-main data-[state=active]:bg-bg-card data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none transition-all"
            >
              {tab}
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
