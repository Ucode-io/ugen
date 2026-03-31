"use client"

import { useDeploymentInfo } from "@/features/analytics";
import { Skeleton } from "@/shared/ui";
import { ExternalLink, Github } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import { useTranslations } from "next-intl";

export const DeploymentSummary = () => {
  const t = useTranslations('widgets.analytics');
  const { data: deployment, isLoading } = useDeploymentInfo();

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!deployment) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
          <span className="text-text-muted">{t("environment")}</span>
          <span className={cn(
            "px-2 py-0.5 rounded text-[11px] font-bold uppercase",
            deployment.environment === 'production' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {deployment.environment}
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
          <span className="text-text-muted">{t("projectName")}</span>
          <span className="text-text-main font-medium">{deployment.projectName}</span>
        </div>
        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
          <span className="text-text-muted">{t("region")}</span>
          <span className="text-text-main font-medium">{deployment.region}</span>
        </div>
        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
          <span className="text-text-muted">{t("runtimeVersion")}</span>
          <div className="flex items-center gap-2">
            <span className="text-text-main font-medium">{deployment.runtimeVersion}</span>
            {deployment.hasUpdate && (
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold">{t("updateAvailable")}</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
          <span className="text-text-muted">{t("lastDeploy")}</span>
          <span className="text-text-main font-medium">
            {t("lastDeployBy", { 
              date: new Date(deployment.lastDeploy.date).toLocaleDateString(), 
              author: deployment.lastDeploy.author 
            })}
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
          <span className="text-text-muted">{t("backupStatus")}</span>
          <span className="text-text-main font-medium">{deployment.backupStatus}</span>
        </div>
      </div>

      <div className="space-y-4 h-full flex flex-col justify-start">
        <div className="flex flex-col gap-2">
          <span className="text-text-muted text-xs uppercase font-bold tracking-wider">{t("projectUrls")}</span>
          <a
            href={deployment.cloudUrl}
            target="_blank"
            className="flex items-center gap-2 text-primary hover:underline group w-fit"
            rel="noreferrer"
          >
            <span className="bg-primary/10 p-1.5 rounded-md group-hover:bg-primary/20 transition-colors">
              <ExternalLink className="w-4 h-4" />
            </span>
            {deployment.cloudUrl}
          </a>
          <a
            href={deployment.actionsUrl}
            target="_blank"
            className="flex items-center gap-2 text-primary hover:underline group w-fit"
            rel="noreferrer"
          >
            <span className="bg-primary/10 p-1.5 rounded-md group-hover:bg-primary/20 transition-colors">
              <Github className="w-4 h-4" />
            </span>
            {t("httpActionsUrl")}
          </a>
        </div>
      </div>
    </div>
  );
};
