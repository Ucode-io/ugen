'use client'
import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from "@/shared/lib/i18n/navigation";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/entities/session";
import Image from 'next/image'
import { useUIStore } from "@/shared/model/theme/use-ui-store";
import { SearchModal } from "@/features/search";

import { useClickOutside } from "../lib/use-click-outside";
import { CoreNav } from "./components/core-nav";
import { RecentsNav } from "./components/recents-nav";
import { ProjectDropdown } from "./components/project-dropdown";
import { ProfileFooter } from "./components/profile-footer";
import { ProfileModal } from "./components/profile-modal";
import { cn } from "@/shared/lib/utils/cn";

interface SidebarProps {
  className?: string
  hideLogo?: boolean
  onProfilePopupChange?: (isOpen: boolean) => void
}

export const Sidebar = ({ className, hideLogo, onProfilePopupChange }: SidebarProps) => {
  const router = useRouter();
  const t = useTranslations('Navigation');
  const { user, project, logout, setActiveView } = useAuthStore();
  const isUgen = project?.is_ugen ?? false;
  const { theme, setTheme } = useUIStore();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [isProjectPopupOpen, setIsProjectPopupOpen] = useState(false);

  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const profilePopupRef = useRef<HTMLDivElement>(null);
  useClickOutside(profilePopupRef, () => setIsProfilePopupOpen(false));

  useEffect(() => {
    onProfilePopupChange?.(isProfilePopupOpen);
  }, [isProfilePopupOpen, onProfilePopupChange]);

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const queryClient = useQueryClient()

  const handleLogout = () => {
    logout();
    queryClient.clear();
    router.push("/");
  };

  const handleNewChat = () => {
    if (isUgen) router.push("/");
  };

  const projectInitial = project?.title?.[0] || "U";
  const userInitial = user?.login?.[0]?.toUpperCase() || "U";

  return (
    <aside className={cn("bg-bg-sidebar border-border-subtle text-text-muted z-50 flex h-screen w-64 shrink-0 flex-col overflow-visible border-r font-sans text-sm font-medium", className)}>
      {/* Header Area */}
      <div className="p-3 space-y-2">
        <div className="flex h-8 min-w-0 items-center gap-2 px-1">
          {!hideLogo && (
            <>
              <Link href="/" className="flex shrink-0 items-center">
                <Image
                  src="/logo.svg"
                  alt="Logo"
                  width={80}
                  height={24}
                  className="h-5 w-auto"
                />
              </Link>
              <span className="text-text-muted/40 shrink-0 text-sm">/</span>
            </>
          )}
          <ProjectDropdown
            project={project}
            projectInitial={projectInitial}
            isProjectPopupOpen={isProjectPopupOpen}
            setIsProjectPopupOpen={setIsProjectPopupOpen}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
          />
        </div>

        {isUgen && (
          <button
            onClick={handleNewChat}
            className="bg-bg-card hover:bg-hover-bg border-border-subtle text-text-main flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-1 text-sm font-medium transition-colors"
          >
            <Plus size={16} strokeWidth={2} />
            <span>{t('new_chat')}</span>
          </button>
        )}
      </div>

      {/* Scrollable Nav Area */}
      <div className="scrollbar-hide flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        <CoreNav
          onSearchClick={() => setIsSearchOpen(true)}
          isUgen={isUgen}
        />

        <RecentsNav />
      </div>

      <ProfileFooter
        isCollapsed={false}
        user={user}
        userInitial={userInitial}
        isProfilePopupOpen={isProfilePopupOpen}
        setIsProfilePopupOpen={setIsProfilePopupOpen}
        profilePopupRef={profilePopupRef}
        isThemeMenuOpen={isThemeMenuOpen}
        setIsThemeMenuOpen={setIsThemeMenuOpen}
        theme={theme}
        setTheme={setTheme}
        setActiveView={setActiveView}
        router={router}
        handleLogout={handleLogout}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      <SearchModal isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <ProfileModal isOpen={isProfileModalOpen} onOpenChange={setIsProfileModalOpen} />
    </aside>
  );
}
