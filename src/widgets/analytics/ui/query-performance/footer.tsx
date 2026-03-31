"use client"

import { HelpCircle, Wand2, RefreshCw } from "lucide-react";
import { Button } from "@/shared/ui";
import { useTranslations } from "next-intl";

export const QueryPerformanceFooter = () => {
  const t = useTranslations('widgets.analytics');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-bg-sidebar/30 border border-border-subtle rounded-xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-text-muted" />
          <h4 className="font-bold text-text-main">{t("resetReport")}</h4>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          {t("resetDescription")}
        </p>
        <Button variant="outline" size="sm" className="h-8 text-xs bg-bg-card font-bold border-border-subtle">
          {t("resetStats")}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-text-muted" />
          <h4 className="font-bold text-text-main">{t("howReportGenerated")}</h4>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          {t("reportExplanation")}
        </p>
        <a href="#" className="text-xs text-primary hover:underline underline-offset-4 font-bold">
          {t("learnMore")}
        </a>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-text-muted" />
          <h4 className="font-bold text-text-main">{t("indexAdvisor")}</h4>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          {t("indexAdvisorDescription")}
        </p>
        <a href="#" className="text-xs text-primary hover:underline underline-offset-4 font-bold">
          {t("seeRecommendations")}
        </a>
      </div>
    </div>
  );
};
