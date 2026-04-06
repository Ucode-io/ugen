'use client'

import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Play, FileText, Image as ImageIcon } from 'lucide-react'
import { FileItem } from '@/entities/media-file/model/types'

interface MediaCardProps {
  item: FileItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
  isSelectionMode: boolean;
  onPreview: (item: FileItem) => void;
}

export const MediaCard = ({
  item,
  isSelected,
  onToggle,
  isSelectionMode,
  onPreview
}: MediaCardProps) => {
  const [hasError, setHasError] = useState(false)

  const isVideo = useMemo(() => {
    return (
      item.link.endsWith('.mp4') ||
      item.link.endsWith('.ogg') ||
      item.link.endsWith('.webm')
    )
  }, [item.link])

  const isImage = useMemo(() => {
    return (
      item.link.endsWith('.png') ||
      item.link.endsWith('.jpg') ||
      item.link.endsWith('.jpeg') ||
      item.link.endsWith('.webp') ||
      item.link.endsWith('.gif')
    )
  }, [item.link])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={() => isSelectionMode ? onToggle(item.id) : onPreview(item)}
      className={`group relative bg-bg-card border rounded-xl overflow-hidden cursor-pointer transition-all duration-150 flex flex-col shadow-sm
        ${isSelectionMode
          ? isSelected
            ? 'border-primary ring-1 ring-primary/40'
            : 'border-border-subtle hover:border-primary/30'
          : 'border-border-subtle hover:border-[#004eea]'
        }`}
    >
      {/* Selection Overlay */}
      <AnimatePresence>
        {isSelectionMode && isSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-primary/5 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Checkbox Icon */}
      {isSelectionMode && (
        <div className={`absolute top-2 right-2 z-20 w-5 h-5 rounded flex items-center justify-center border transition-all duration-150
          ${isSelected
            ? 'bg-primary border-primary'
            : 'bg-bg-main border-border-subtle group-hover:border-primary/50'
          }`}>
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>
      )}

      {/* Thumbnail Area */}
      <div className="w-full h-[120px] bg-bg-subtle relative flex items-center justify-center overflow-hidden">
        {(isImage && !hasError) ? (
          <img
            src={item.link}
            alt={item.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
            onError={() => setHasError(true)}
          />
        ) : isVideo ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black/5">
            <div className="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center backdrop-blur-sm">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FileText className="w-8 h-8 text-text-muted opacity-80" />
            <span className="text-[10px] uppercase font-bold text-text-muted truncate max-w-full px-2">
              {item.file_name_disk?.split('.').pop()}
            </span>
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="p-3 bg-bg-card flex flex-col justify-center border-t border-border-subtle flex-1">
        <div className="text-[12px] font-medium text-text-main whitespace-nowrap overflow-hidden text-ellipsis">
          {item.title || item.file_name_disk}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5 flex justify-between items-center">
          <span>{(item.file_size / (1024 * 1024)).toFixed(2)} MB</span>
          <span className="uppercase text-[9px] font-semibold opacity-70">
            {item.file_name_disk?.split('.').pop() || 'FILE'}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
