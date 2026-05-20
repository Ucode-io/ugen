'use client'
import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { LogOut } from "lucide-react"

interface ProfileFooterProps {
  isCollapsed: boolean;
  user: any;
  userInitial: string;
  isProfilePopupOpen: boolean;
  setIsProfilePopupOpen: (val: boolean) => void;
  profilePopupRef: React.RefObject<HTMLDivElement | null>;
  handleLogout: () => void;
}

export const ProfileFooter = ({
  isCollapsed,
  user,
  userInitial,
  isProfilePopupOpen,
  setIsProfilePopupOpen,
  profilePopupRef,
  handleLogout,
}: ProfileFooterProps) => {
  const tWidgets = useTranslations('widgets.sidebar')

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openPopup = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setIsProfilePopupOpen(true)
  }

  const scheduleClosePopup = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setIsProfilePopupOpen(false)
    }, 150)
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  return (
    <div
      className={`space-y-4 p-3 ${isCollapsed ? "flex flex-col items-center" : ""}`}
      onMouseLeave={scheduleClosePopup}
    >
      <div
        className={`flex items-center justify-between pb-2 ${isCollapsed ? "flex-col gap-4" : "px-1.5"}`}
      >
        <div
          className="relative"
          ref={profilePopupRef}
          onMouseEnter={openPopup}
        >
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
            // Wrapper keeps a transparent hover bridge (padding) so moving the
            // cursor across the gap to the popup doesn't trigger onMouseLeave.
            <div
              className={`absolute bottom-full z-[100] pb-3 ${isCollapsed ? "left-full pl-2" : "left-0"}`}
            >
              <div className="bg-bg-card border-border-subtle flex w-64 flex-col rounded-xl border shadow-lg">
                {/* Header */}
                <div className="border-border-subtle bg-bg-sidebar/50 flex items-center gap-2 border-b px-2.5 py-2">
                  <div className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                    {userInitial}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-text-main truncate text-xs font-semibold leading-tight">
                      {user?.login || "User"}
                    </div>
                    <div className="text-text-muted truncate text-[11px] leading-tight">
                      {user?.email || "user@example.com"}
                    </div>
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
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
