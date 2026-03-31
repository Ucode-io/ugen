"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Users, Copy, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/ui";
import { Button } from "@/shared/ui";

export const InviteUsersCard = () => {
  const t = useTranslations('features.inviteUsers')
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // In a real app, you would copy the actual link
    // navigator.clipboard.writeText("https://app.base44.ai/homehub");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="relative overflow-hidden group h-full">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="space-y-1.5">
          <CardTitle className="text-xl">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </div>
        <div className="p-2 rounded-ai bg-accent/50 text-text-muted group-hover:text-primary transition-colors duration-300">
          <Users className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="secondary"
          className="flex-1 h-11"
          onClick={handleCopy}
          leftIcon={copied ? Check : Copy}
        >
          {copied ? t('copied') : t('copyLink')}
        </Button>
        <Button className="flex-1 h-11">
          {t('sendInvites')}
        </Button>
      </CardContent>
    </Card>
  );
};
