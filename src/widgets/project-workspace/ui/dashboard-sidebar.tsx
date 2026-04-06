'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils/cn'

export interface NavigationItem {
  id: string
  label: string
  category?: string
  icon?: LucideIcon
  isGroup?: boolean
  items?: NavigationItem[]
  path?: string
}

interface DashboardSidebarProps {
  items: NavigationItem[]
  activeSection: string
  onSelectSection: (id: string) => void
  isCollapsed: boolean
  expandedGroups: string[]
  onToggleGroup: (id: string) => void
}

export const DashboardSidebar = ({
  items,
  activeSection,
  onSelectSection,
  isCollapsed,
  expandedGroups,
  onToggleGroup
}: DashboardSidebarProps) => {
  return (
    <aside
      className={cn(
        "bg-bg-card border-r border-border-subtle flex flex-col transition-all duration-500 shrink-0 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden",
        isCollapsed ? "w-0 border-r-0" : "w-[220px]"
      )}
    >
      <div
        className={cn(
          "flex flex-col p-2 gap-1 h-full w-full overflow-y-auto custom-scrollbar transition-opacity duration-300",
          isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        {items.map((item, index) => {
          const showCategory = item.category && item.category !== items[index - 1]?.category

          let content = null

          if (item.isGroup) {
            const isGroupExpanded = expandedGroups.includes(item.id)
            const isSubItemActive = item.items?.some((sub) => sub.id === activeSection)

            content = (
              <div key={item.id} className="flex flex-col gap-1 mb-1">
                <button
                  onClick={() => onToggleGroup(item.id)}
                  className={cn(
                    "flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-300 group relative overflow-hidden",
                    isSubItemActive && !isGroupExpanded
                      ? "bg-[#004eea]/10 text-[#004eea]"
                      : "text-text-muted hover:text-text-main hover:bg-bg-sidebar active:scale-[0.98]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon && (
                      <item.icon
                        size={14}
                        className={cn(
                          "transition-transform duration-300 group-hover:scale-110",
                          isSubItemActive ? "text-[#004eea]" : "text-text-muted/60 group-hover:text-text-main"
                        )}
                      />
                    )}
                    <span className="tracking-tight">{item.label}</span>
                  </div>

                  <motion.div
                    animate={{ rotate: isGroupExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="opacity-60"
                  >
                    <ChevronDown size={14} />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isGroupExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      className="flex flex-col gap-1 px-1 overflow-hidden"
                    >
                      {item.items?.map((sub) => {
                        const SubIcon = sub.icon
                        const isActive = activeSection === sub.id

                        return (
                          <button
                            key={sub.id}
                            onClick={() => onSelectSection(sub.id)}
                            className={cn(
                              "flex items-center gap-2.5 pl-6 pr-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-300 group relative",
                              isActive
                                ? "bg-[#004eea]/10 text-[#004eea]"
                                : "text-text-muted hover:text-text-main hover:bg-bg-sidebar active:scale-[0.98]"
                            )}
                          >
                            {/* {isActive && (
                              <motion.div
                                layoutId="active-indicator-sub"
                                className="absolute left-8 w-1 h-4 bg-[#004eea] rounded-full"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              />
                            )} */}
                            {SubIcon && (
                              <SubIcon
                                size={12}
                                className={cn(
                                  "transition-colors duration-300",
                                  isActive ? "text-[#004eea]" : "text-text-muted/40 group-hover:text-text-main/60"
                                )}
                              />
                            )}
                            <span className="truncate">{sub.label}</span>
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          } else {
            const Icon = item.icon
            const isActive = activeSection === item.id

            content = (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-300 group relative overflow-hidden shrink-0",
                  isActive
                    ? "bg-[#004eea]/10 text-[#004eea]"
                    : "text-text-muted hover:text-text-main hover:bg-bg-sidebar active:scale-[0.98]"
                )}
              >
                {/* {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute left-0 w-1 h-6 bg-[#004eea] rounded-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )} */}
                {Icon && (
                  <Icon
                    size={14}
                    className={cn(
                      "transition-transform duration-300 group-hover:scale-110",
                      isActive ? "text-[#004eea]" : "text-text-muted/60 group-hover:text-text-main"
                    )}
                  />
                )}
                <span className="tracking-tight">{item.label}</span>

                {/* {isActive && (
                <motion.div
                  layoutId="active-bg"
                  className="absolute inset-0 bg-[#004eea]/5 -z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )} */}
              </button>
            )
          }

          return (
            <React.Fragment key={item.id}>
              {showCategory && !isCollapsed && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.8px] text-text-muted/60 mt-1 first:mt-0">
                  {item.category}
                </div>
              )}
              {content}
            </React.Fragment>
          )
        })}
      </div>
    </aside>
  )
}
