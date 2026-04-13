'use client'
import { Link } from "@/shared/lib/i18n/navigation"
import { useTranslations } from "next-intl"
import {
  Settings,
  LogOut,
  Check,
  ChevronRight,
  Palette,
  User as UserIcon,
  Home,
  Bell,
  Zap
} from "lucide-react"

interface ProfileFooterProps {
  isCollapsed: boolean;
  user: any;
  userInitial: string;
  isProfilePopupOpen: boolean;
  setIsProfilePopupOpen: (val: boolean) => void;
  profilePopupRef: React.RefObject<HTMLDivElement | null>;
  isThemeMenuOpen: boolean;
  setIsThemeMenuOpen: (val: boolean) => void;
  theme: string;
  setTheme: (val: 'light' | 'dark') => void;
  setActiveView: (view: 'home' | 'dashboard') => void;
  router: any;
  handleLogout: () => void;
  onOpenProfileModal: () => void;
}

export const ProfileFooter = ({
  isCollapsed,
  user,
  userInitial,
  isProfilePopupOpen,
  setIsProfilePopupOpen,
  profilePopupRef,
  isThemeMenuOpen,
  setIsThemeMenuOpen,
  theme,
  setTheme,
  setActiveView,
  router,
  handleLogout,
  onOpenProfileModal,
}: ProfileFooterProps) => {
  const tNav = useTranslations('Navigation')
  const tWidgets = useTranslations('widgets.sidebar')

  return (
    <div
      className={`space-y-4 p-3 ${isCollapsed ? "flex flex-col items-center" : ""}`}
    >
      {/* Upgrade Card */}
      {/* {isCollapsed ? (
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2e2b5c] transition-opacity hover:opacity-90"
          title={tNav("upgrade_pro")}
        >
          <Zap size={16} className="fill-white text-white" />
        </button>
      ) : (
        <div className="bg-bg-card border-border-subtle group flex cursor-pointer items-center justify-between rounded-xl border p-3.5 shadow-sm transition-colors hover:border-[#4f46e5]/50 hover:bg-[#4f46e5]/5">
          <div>
            <h4 className="text-text-main text-sm font-bold">
              {tNav("upgrade_pro")}
            </h4>
            <p className="text-text-muted mt-0.5 text-xs tracking-tight">
              {tNav("unlock_benefits")}
            </p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2e2b5c]">
            <Zap size={14} className="fill-white text-white" />
          </div>
        </div>
      )} */}

      {/* Bottom Bar: Profile / Settings / Bell */}
      <div
        className={`flex items-center justify-between pb-2 ${isCollapsed ? "flex-col gap-4" : "px-1.5"}`}
      >
        <div className="relative" ref={profilePopupRef}>
          <button
            onClick={() => {
              setIsProfilePopupOpen(!isProfilePopupOpen)
            }}
            className="bg-primary/10 ring-border-subtle flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ring-1 transition-opacity hover:opacity-90"
            title={user?.login || 'Profile'}
          >
            <span className="text-primary text-sm font-bold">
              {userInitial}
            </span>
          </button>

          {isProfilePopupOpen && (
            <div
              className={`absolute bottom-[calc(100%+12px)] ${isCollapsed ? "left-[calc(100%+8px)]" : "left-0"} bg-bg-card border-border-subtle z-[100] flex w-64 flex-col rounded-xl border shadow-lg`}
            >
              {/* Header */}
              <div className="border-border-subtle bg-bg-sidebar/50 flex items-center gap-3 border-b p-3">
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                  {userInitial}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-text-main truncate text-sm font-bold">
                    {user?.login || "User"}
                  </div>
                  <div className="text-text-muted truncate text-xs">
                    {user?.email || "user@example.com"}
                  </div>
                </div>
              </div>
              {/* Body */}
              <div className="border-border-subtle flex flex-col gap-0.5 border-b p-1.5">
                <button
                  onClick={() => {
                    setIsProfilePopupOpen(false)
                    onOpenProfileModal()
                  }}
                  className="hover:bg-hover-bg text-text-main flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors w-full"
                >
                  <UserIcon size={16} className="text-text-muted" />
                  <span>{tWidgets('profile')}</span>
                </button>
                <div
                  className="relative z-[110]"
                  onMouseEnter={() => setIsThemeMenuOpen(true)}
                  onMouseLeave={() => setIsThemeMenuOpen(false)}
                >
                  <button className="hover:bg-hover-bg text-text-main flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Palette size={16} className="text-text-muted" />
                      <span>{tWidgets('appearance')}</span>
                    </div>
                    <ChevronRight size={14} className="text-text-muted" />
                  </button>
                  {isThemeMenuOpen && (
                    <div className="bg-bg-card border-border-subtle absolute bottom-0 left-[calc(100%-8px)] z-[120] min-w-[180px] space-y-0.5 rounded-xl border p-1.5 shadow-xl">
                      <div className="text-text-muted/70 mb-1 px-2 py-1 text-xs font-semibold uppercase">
                        {tWidgets('theme')}
                      </div>
                      {["light", "dark"].map((tOption) => (
                        <button
                          key={tOption}
                          onClick={() => {
                            setTheme(tOption as "light" | "dark");
                            const root = window.document.documentElement;
                            root.setAttribute("data-theme", tOption);
                            if (tOption === "dark")
                              root.classList.add("dark");
                            else if (tOption === "light")
                              root.classList.remove("dark");
                          }}
                          className={`hover:bg-hover-bg flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm capitalize ${theme === tOption ? "text-primary bg-primary/5 font-medium" : "text-text-main"}`}
                        >
                          <span>{tWidgets(tOption)}</span>
                          {theme === tOption && (
                            <Check size={14} className="text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Footer */}
              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  className="text-text-main group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-red-500/10 hover:text-red-500"
                >
                  <LogOut
                    size={16}
                    className="text-text-muted group-hover:text-red-500"
                  />
                  <span>{tWidgets('logout')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
