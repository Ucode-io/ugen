'use client'
import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from "@/shared/lib/i18n/navigation";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { useAuthStore } from "@/entities/session";
import Image from 'next/image'
import { useUIStore } from "@/shared/model/theme/use-ui-store";
import { SearchModal } from "@/features/search";

import { useClickOutside } from "../lib/use-click-outside";
import { CoreNav } from "./components/core-nav";
import { ProjectsNav } from "./components/projects-nav";
import { ProjectsNavReadOnly } from "./components/projects-nav-readonly";
import { RecentsNav } from "./components/recents-nav";
import { ProjectDropdown } from "./components/project-dropdown";
import { ProfileFooter } from "./components/profile-footer";
import { ProfileModal } from "./components/profile-modal";

export const Sidebar = () => {
  const router = useRouter();
  const { user, project, logout, setActiveView } = useAuthStore();
  const isUgen = project?.is_ugen ?? false;
  const { theme, setTheme } = useUIStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAllProjectsOpen, setIsAllProjectsOpen] = useState(true);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [isProjectPopupOpen, setIsProjectPopupOpen] = useState(false);
  const projectPopupRef = useRef<HTMLDivElement>(null);
  useClickOutside(projectPopupRef, () => setIsProjectPopupOpen(false));

  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const profilePopupRef = useRef<HTMLDivElement>(null);
  useClickOutside(profilePopupRef, () => setIsProfilePopupOpen(false));

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const queryClient = useQueryClient()

  const handleLogout = () => {
    logout();
    queryClient.clear();
    router.push("/");
  };

  const projectInitial = project?.title?.[0] || "U";
  const userInitial = user?.login?.[0]?.toUpperCase() || "U";

  return (
    <aside
      className={`bg-bg-sidebar border-border-subtle text-text-muted z-50 flex h-screen flex-col overflow-visible border-r font-sans text-sm font-medium transition-all duration-300 ${isCollapsed ? "w-[68px]" : "w-64 shrink-0"
        }`}
    >
      {/* Header Area */}
      <div className="p-3">
        {/* Top bar with Logo & Collapse Icon */}
        <div
          className={`flex h-8 items-center ${isCollapsed ? "justify-center" : "justify-between px-1"}`}
        >
          {!isCollapsed && (
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.svg"
                alt="Logo"
                width={100}
                height={28}
                className="h-6 w-auto"
              />
            </Link>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-text-muted hover:text-text-main hover:bg-hover-bg flex items-center justify-center rounded-md p-1 transition-colors"
          >
            {isCollapsed ? (
              <PanelLeft size={18} strokeWidth={2} />
            ) : (
              <PanelLeftClose size={18} strokeWidth={2} />
            )}
          </button>
        </div>

        <ProjectDropdown
          isCollapsed={isCollapsed}
          project={project}
          projectInitial={projectInitial}
          isProjectPopupOpen={isProjectPopupOpen}
          setIsProjectPopupOpen={setIsProjectPopupOpen}
          projectPopupRef={projectPopupRef}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
        />
      </div>

      {/* Scrollable Nav Area */}
      <div className="scrollbar-hide flex-1 space-y-7 overflow-y-auto px-3 pb-4">
        <CoreNav
          isCollapsed={isCollapsed}
          onSearchClick={() => setIsSearchOpen(true)}
          isUgen={isUgen}
        />

        {isUgen ? (
          <ProjectsNav
            isCollapsed={isCollapsed}
            isAllProjectsOpen={isAllProjectsOpen}
            setIsAllProjectsOpen={setIsAllProjectsOpen}
          />
        ) : (
          <ProjectsNavReadOnly
            isCollapsed={isCollapsed}
            isAllProjectsOpen={isAllProjectsOpen}
            setIsAllProjectsOpen={setIsAllProjectsOpen}
          />
        )}

        <RecentsNav isCollapsed={isCollapsed} />
      </div>

      <ProfileFooter
        isCollapsed={isCollapsed}
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
