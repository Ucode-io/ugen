"use client";

import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
import { Checkbox } from "@/shared/ui";
import { AppVisibility } from "@/entities/app/model/types";

interface VisibilitySelectorProps {
  value: AppVisibility;
  onChange: (value: AppVisibility) => void;
  requireLogin: boolean;
  onRequireLoginChange: (value: boolean) => void;
}

export const VisibilitySelector = ({
  value,
  onChange,
  requireLogin,
  onRequireLoginChange,
}: VisibilitySelectorProps) => {
  const t = useTranslations('features.appVisibility')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Select value={value} onValueChange={(v) => onChange(v as AppVisibility)}>
            <SelectTrigger leftIcon={Globe}>
              <SelectValue placeholder={t('placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Public">{t('options.public')}</SelectItem>
              <SelectItem value="Private">{t('options.private')}</SelectItem>
              <SelectItem value="Team only">{t('options.teamOnly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-2">
          <Checkbox
            label={t('requireLogin')}
            checked={requireLogin}
            onCheckedChange={(checked) => onRequireLoginChange(!!checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
