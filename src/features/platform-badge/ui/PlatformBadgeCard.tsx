"use client";

import { Eye, EyeOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";

interface PlatformBadgeCardProps {
  isVisible: boolean;
  onToggle: () => void;
}

export const PlatformBadgeCard = ({ isVisible, onToggle }: PlatformBadgeCardProps) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5">
          <CardTitle className="text-xl">Platform Badge</CardTitle>
          <CardDescription className="text-base">
            The &quot;Edit with Base44&quot; badge is currently {isVisible ? (
              <span className="text-green-500 font-semibold italic">visible</span>
            ) : (
              <span className="text-text-muted font-semibold italic">hidden</span>
            )} on your application
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          className="h-11 px-8 min-w-[160px] shrink-0"
          onClick={onToggle}
          leftIcon={isVisible ? EyeOff : Eye}
        >
          {isVisible ? "Hide Badge" : "Show Badge"}
        </Button>
      </CardContent>
    </Card>
  );
};
