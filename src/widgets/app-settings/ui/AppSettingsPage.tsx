"use client";

import { useState } from "react";
import { 
  Pencil, 
  ExternalLink, 
  Share2, 
  Star, 
  Check,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { VisibilitySelector } from "@/features/app-visibility";
import { InviteUsersCard } from "@/features/invite-users";
import { PlatformBadgeCard } from "@/features/platform-badge";
import { AppSettings, AppVisibility } from "@/entities/app/model/types";
import { cn } from "@/shared/lib/utils/cn";

export const AppSettingsPage = () => {
  const [settings, setSettings] = useState<AppSettings>({
    name: "HomeHub",
    description: "Smart home management platform",
    visibility: "Public",
    requireLogin: true,
    platformBadgeVisible: true,
    createdAt: "2 hours ago",
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col gap-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 pb-4 border-b border-border-subtle/50">
        <div className="flex items-start gap-6">
          {/* App Logo */}
          <div className="relative group/logo w-20 h-20 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl transform transition-all duration-500 hover:rotate-3 hover:scale-105">
            <span className="text-white text-3xl font-bold drop-shadow-md">{settings.name[0]}</span>
            <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover/logo:opacity-100 transition-opacity" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 group">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    className="text-3xl font-bold bg-transparent border-b-2 border-primary outline-none px-1 py-0 min-w-[200px]"
                    value={settings.name}
                    onChange={(e) => updateSetting("name", e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                  />
                  <button 
                    onClick={() => setIsEditingName(false)}
                    className="p-1.5 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <h1 className="text-4xl font-extrabold tracking-tight text-text-main group-hover:text-primary transition-colors cursor-default">
                  {settings.name}
                </h1>
              )}
              {!isEditingName && (
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="p-2 rounded-full hover:bg-accent text-text-muted hover:text-primary transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 group">
              {isEditingDesc ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    autoFocus
                    className="text-lg text-text-secondary bg-transparent border-b border-primary outline-none px-1 py-0 w-full"
                    value={settings.description}
                    onChange={(e) => updateSetting("description", e.target.value)}
                    onBlur={() => setIsEditingDesc(false)}
                    onKeyDown={(e) => e.key === "Enter" && setIsEditingDesc(false)}
                  />
                </div>
              ) : (
                <p className="text-xl text-text-secondary leading-relaxed">
                  {settings.description}
                </p>
              )}
              {!isEditingDesc && (
                <button 
                  onClick={() => setIsEditingDesc(true)}
                  className="p-1.5 rounded-full hover:bg-accent text-text-muted hover:text-primary transition-all opacity-0 group-hover:opacity-100 scale-90"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                App ID: BH-9231
              </span>
              <p className="text-sm text-text-muted">
                Created {settings.createdAt}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 self-end lg:self-center">
          <button 
            onClick={() => setIsStarred(!isStarred)}
            title={isStarred ? "Remove from favorites" : "Add to favorites"}
            className={cn(
              "p-3 rounded-xl border transition-all duration-300",
              isStarred 
                ? "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20 text-yellow-500 shadow-sm scale-110" 
                : "bg-bg-card border-border-subtle text-text-muted hover:border-yellow-200 hover:text-yellow-500 hover:scale-105"
            )}
          >
            <Star className={cn("h-5.5 w-5.5 transition-all duration-500", isStarred && "fill-current rotate-[360deg]")} />
          </button>
          
          <Button variant="outline" size="lg" className="h-12 px-6" leftIcon={ExternalLink}>
            Open App
          </Button>
          
          <div className="relative">
            <Button size="lg" className="h-12 px-6 shadow-lg shadow-primary/25" leftIcon={Share2}>
              Share App
            </Button>
            <span className="absolute -top-3 -right-2 bg-gradient-to-r from-orange-500 to-amber-500 text-[10px] text-white px-2 py-0.5 rounded-full font-bold animate-bounce shadow-md">
              win free credits!
            </span>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="col-span-1">
          <VisibilitySelector 
            value={settings.visibility}
            onChange={(v) => updateSetting("visibility", v)}
            requireLogin={settings.requireLogin}
            onRequireLoginChange={(v) => updateSetting("requireLogin", v)}
          />
        </div>
        
        <div className="col-span-1">
          <InviteUsersCard />
        </div>
        
        <div className="md:col-span-2">
          <PlatformBadgeCard 
            isVisible={settings.platformBadgeVisible}
            onToggle={() => updateSetting("platformBadgeVisible", !settings.platformBadgeVisible)}
          />
        </div>
      </div>
    </div>
  );
};
