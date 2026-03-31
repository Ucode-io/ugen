"use client";

import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardTitle, CardDescription, CardContent, Button } from "@/shared/ui";

interface PlatformBadgeCardProps {
  isVisible: boolean;
  onToggle: () => void;
}

export const PlatformBadgeCard = ({ isVisible, onToggle }: PlatformBadgeCardProps) => {
  const t = useTranslations('features.platformBadge')

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5">
          <CardTitle className="text-xl">{t('title')}</CardTitle>
          <CardDescription className="text-base text-text-muted">
            {t.rich('description', {
              status: () => (
                <span className={isVisible ? "text-green-500 font-semibold italic" : "text-text-muted font-semibold italic"}>
                  {isVisible ? t('visible') : t('hidden')}
                </span>
              )
            })}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          className="h-11 px-8 min-w-[160px] shrink-0"
          onClick={onToggle}
          leftIcon={isVisible ? EyeOff : Eye}
        >
          {isVisible ? t('hideBadge') : t('showBadge')}
        </Button>
      </CardContent>
    </Card>
  );
};
