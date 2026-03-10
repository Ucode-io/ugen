'use client'

import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Play, FileText, Image as ImageIcon } from 'lucide-react'
import { FileItem } from '@/entities/media-file/model/types'

interface MediaCardProps {
  item: FileItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export const MediaCard = ({ item, isSelected, onToggle }: MediaCardProps) => {
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
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={() => onToggle(item.id)}
      className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-300 shadow-sm
        ${isSelected
          ? 'border-primary shadow-lg ring-1 ring-primary/40 bg-primary/5'
          : 'border-transparent hover:border-primary/30 bg-bg-card'
        }`}
    >
      {/* Selection Overlay */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-primary/10 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Checkbox Icon */}
      <div className={`absolute top-2 right-2 z-20 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300
        ${isSelected
          ? 'bg-primary border-primary'
          : 'bg-white/50 border-white/80 group-hover:border-primary/50'
        }`}>
        {isSelected && <Check className="w-4 h-4 text-white" />}
      </div>

      {/* Content Rendering */}
      <div className="w-full h-full flex items-center justify-center bg-bg-subtle relative transition-opacity group-hover:opacity-90">
        {(isImage && !hasError) ? (
          <img
            src={item.link}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
          />
        ) : isVideo ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              src={item.link}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
              <div className="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center backdrop-blur-sm">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {isImage ? (
              <ImageIcon className="w-10 h-10 text-text-muted opacity-50" />
            ) : (
              <FileText className="w-10 h-10 text-text-muted" />
            )}
            <span className="text-[10px] uppercase font-bold text-text-muted truncate max-w-full px-2">
              {item.file_name_disk?.split('.').pop()}
            </span>
          </div>
        )}
      </div>

      {/* Info Hover Bar */}
      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10">
        <p className="text-[11px] font-medium text-white truncate">{item.title}</p>
        <p className="text-[9px] text-white/70">{(item.file_size / (1024 * 1024)).toFixed(2)} MB</p>
      </div>
    </motion.div>
  )
}
