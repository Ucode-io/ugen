'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon, Sparkles } from 'lucide-react'

interface PlaceholderViewProps {
  title: string
  description: string
  icon: LucideIcon
}

export const PlaceholderView = ({ title, description, icon: Icon }: PlaceholderViewProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 border border-dashed border-border-subtle rounded-ai bg-bg-card/30 backdrop-blur-sm">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center text-center space-y-4 max-w-[320px]"
      >
        <div className="relative">
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-primary">
            <Icon size={32} />
          </div>
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-2 -right-2 text-primary/40"
          >
            <Sparkles size={16} />
          </motion.div>
        </div>
        
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-text-main tracking-tight">{title}</h3>
          <p className="text-sm text-text-muted leading-relaxed italic">{description}</p>
        </div>
      </motion.div>
    </div>
  )
}
