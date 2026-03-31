"use client"

import { Lightbulb, X } from "lucide-react";
import { useAnalyticsStore } from "@/entities/analytics";
import { Button } from "@/shared/ui";
import { motion, AnimatePresence } from "framer-motion";

export const IndexAdvisor = () => {
  const { indexAdvisorVisible, setIndexAdvisorVisible } = useAnalyticsStore();

  return (
    <AnimatePresence>
      {indexAdvisorVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: 50 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 50, x: 50 }}
          className="fixed bottom-6 right-6 z-50 w-[320px] ai-card p-6 shadow-2xl bg-bg-card border-border-subtle rounded-xl"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <button
              onClick={() => setIndexAdvisorVisible(false)}
              className="text-text-muted hover:text-text-main transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-text-main text-sm">Enable Index Advisor</h4>
              <p className="text-xs text-text-muted mt-2 leading-relaxed">
                The Index Advisor analyzes your database's most common and slow queries to suggest potential performance improvements with new indexes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button className="w-full text-xs h-9 bg-primary">Enable Advisor</Button>
              <Button
                variant="outline"
                className="w-full text-xs h-9 bg-bg-card border-border-subtle"
                onClick={() => setIndexAdvisorVisible(false)}
              >
                Not now
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
