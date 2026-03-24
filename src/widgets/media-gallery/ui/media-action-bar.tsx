'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trash2,
  PlusCircle,
  Maximize2,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  CheckSquare,
  X
} from 'lucide-react'
import { Button } from '@/shared/ui/ui/button'

interface MediaActionBarProps {
  selectedCount: number;
  isAllSelected: boolean;
  onSelectAllToggle: () => void;
  onDelete: () => void;
  onCreateOpen: () => void;
  gridColumns: number;
  onCycleGrid: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isDeleting?: boolean;
  isSelectionMode: boolean;
  onEnterSelectionMode: () => void;
  onExitSelectionMode: () => void;
}

export const MediaActionBar = ({
  selectedCount,
  isAllSelected,
  onSelectAllToggle,
  onDelete,
  onCreateOpen,
  gridColumns,
  onCycleGrid,
  searchQuery,
  onSearchChange,
  isDeleting = false,
  isSelectionMode,
  onEnterSelectionMode,
  onExitSelectionMode
}: MediaActionBarProps) => {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {!isSelectionMode ? (
              <motion.div
                key="select"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEnterSelectionMode}
                  className="text-[13px] font-medium h-9 px-4 rounded-lg bg-white/5 border-white/10 hover:bg-white/10"
                >
                  <CheckSquare className="w-4 h-4 mr-2 text-primary" />
                  Select
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="cancel"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExitSelectionMode}
                  className="text-[13px] font-medium h-9 px-4 rounded-lg text-text-muted hover:bg-white/5"
                >
                  <X className="w-4 h-4 mr-2" />
                  Отмена
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isSelectionMode && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSelectAllToggle}
                  className="text-[13px] font-medium h-9 px-4 rounded-lg bg-white/5 border-white/10 hover:bg-white/10"
                >
                  {isAllSelected ? (
                    <XCircle className="w-4 h-4 mr-2 text-destructive" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
                  )}
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="ghost"
            size="icon"
            onClick={onCycleGrid}
            className="w-9 h-9 rounded-lg hover:bg-white/10 transition-colors"
            title={`Current: ${gridColumns} columns. Click to scale.`}
          >
            <Maximize2 className="w-4.5 h-4.5 text-text-muted transition-transform hover:scale-110 active:scale-95" />
          </Button>

          <div className="h-8 w-[1px] bg-border-subtle mx-2" />

          {/* Search Input */}
          <div className="relative group max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search assets..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-[13px] text-text-main placeholder:text-text-muted transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white/[0.08] focus:border-primary/40"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AnimatePresence mode='wait'>
            {isSelectionMode && selectedCount > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="text-[13px] font-semibold h-9 px-4 shadow-lg shadow-destructive/20 hover:scale-102 active:scale-98 transition-all"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  {isDeleting ? 'Deleting...' : `Delete (${selectedCount})`}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="default"
            size="sm"
            onClick={onCreateOpen}
            className="text-[13px] font-semibold h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Create item
          </Button>
        </div>
      </div>
    </div>
  )
}
