'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CloudUpload,
  X,
  FileIcon,
  CheckCircle2,
  Loader2,
  Trash2
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/shared/ui'
import { Button } from '@/shared/ui'
import { useTranslations } from 'next-intl'

interface CreateMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void;
}

export const CreateMediaModal = ({ isOpen, onClose, onUpload }: CreateMediaModalProps) => {
  const t = useTranslations('widgets.mediaGallery')
  const [dragActive, setDragActive] = useState(false)
  const [filesToUpload, setFilesToUpload] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files)
      setFilesToUpload(prev => [...prev, ...newFiles])
    }
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      const newFiles = Array.from(e.target.files)
      setFilesToUpload(prev => [...prev, ...newFiles])
    }
  }, [])

  const removeFile = (index: number) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (filesToUpload.length === 0) return
    setIsUploading(true)
    // Simulated upload
    await new Promise(resolve => setTimeout(resolve, 1500))
    onUpload(filesToUpload)
    setIsUploading(false)
    setFilesToUpload([])
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[480px] p-6 !rounded-[24px] border-white/5 bg-bg-card shadow-2xl overflow-hidden glassmorphism">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold tracking-tight text-text-main flex items-center gap-2">
            <CloudUpload className="w-6 h-6 text-primary" />
            {t('uploadNewAssets')}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-text-muted">
            Drag and drop your media files here or click to browse. Supported formats: MP4, OGG, PNG, JPEG, GIF.
          </DialogDescription>
        </DialogHeader>

        <form
          onDragEnter={handleDrag}
          className="relative group p-1"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="file"
            id="input-file-upload"
            multiple={true}
            onChange={handleChange}
            className="hidden"
          />

          <label
            htmlFor="input-file-upload"
            className={`flex flex-col items-center justify-center h-[180px] w-full border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer 
            ${dragActive
                ? 'border-primary bg-primary/10 scale-[1.01]'
                : 'border-white/10 bg-white/5 hover:border-primary/40 hover:bg-white/[0.08]'
              }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`p-4 rounded-full transition-all duration-300 ${dragActive ? 'bg-primary text-white' : 'bg-primary/5 text-primary group-hover:bg-primary/10'}`}>
                <CloudUpload className="w-8 h-8" />
              </div>
              <p className="text-sm font-medium text-text-subtle">
                {dragActive ? 'Release to upload' : 'Drop your files here, or click to browse'}
              </p>
            </div>
          </label>

          {dragActive && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className="absolute inset-0 z-50 rounded-xl"
            />
          )}
        </form>

        <AnimatePresence>
          {filesToUpload.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 max-h-[160px] overflow-y-auto space-y-2 pr-1 custom-scrollbar"
            >
              {filesToUpload.map((file, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded bg-primary/10">
                      <FileIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="text-[13px] font-medium text-text-main truncate">{file.name}</p>
                      <p className="text-[11px] text-text-muted">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(idx)}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className="mt-8 flex gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 font-semibold hover:bg-white/5"
          >
            {t('cancelBtn')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={filesToUpload.length === 0 || isUploading}
            className="flex-2 font-bold px-8 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:scale-102 active:scale-98"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            {isUploading ? 'Uploading...' : `Upload ${filesToUpload.length} items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
