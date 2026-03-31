'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CloudUpload, X, FileIcon, Loader2, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/shared/ui'
import { Button } from '@/shared/ui'
import { useFileUpload } from '../model/use-file-upload'

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderName: string;
  onSuccess?: () => void;
}

export const FileUploadModal = ({ isOpen, onClose, folderName, onSuccess }: FileUploadModalProps) => {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const { uploadFile, isLoading } = useFileUpload({
    folderName,
    onSuccess: () => {
      setSelectedFile(null)
      onSuccess?.()
      onClose()
    }
  })

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
      setSelectedFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }, [])

  const handleSubmit = () => {
    if (selectedFile) {
      uploadFile(selectedFile)
    }
  }

  const clearFile = () => setSelectedFile(null)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[480px] p-6 rounded-[24px] border-white/5 bg-bg-card shadow-2xl overflow-hidden glassmorphism">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold tracking-tight text-text-main flex items-center gap-2">
            <CloudUpload className="w-6 h-6 text-primary" />
            Upload Asset
          </DialogTitle>
          <DialogDescription className="text-[13px] text-text-muted">
            Upload file to {folderName} folder. Drag & drop or click to browse.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragEnter={handleDrag}
          className="relative"
        >
          {!selectedFile ? (
            <>
              <input
                type="file"
                id="file-upload"
                onChange={handleChange}
                className="hidden"
                disabled={isLoading}
              />
              <label
                htmlFor="file-upload"
                className={`flex flex-col items-center justify-center h-[200px] w-full border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer 
                ${dragActive
                    ? 'border-primary bg-primary/10 scale-[1.01]'
                    : 'border-white/10 bg-white/5 hover:border-primary/40 hover:bg-white/[0.08]'
                  } ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`p-4 rounded-full transition-all duration-300 ${dragActive ? 'bg-primary text-white' : 'bg-primary/5 text-primary'}`}>
                    <CloudUpload className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-medium text-text-muted text-center px-4">
                    {dragActive ? 'Release to upload' : 'Drop your file here, or click to browse'}
                  </p>
                </div>
                {dragActive && (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className="absolute inset-0 z-50 rounded-2xl"
                  />
                )}
              </label>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-primary/20 max-w-[400px] m-auto"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <FileIcon size={24} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-text-main truncate pr-2">
                    {selectedFile.name}
                  </span>
                  <span className="text-xs text-text-muted">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              </div>
              {!isLoading && (
                <button
                  onClick={clearFile}
                  className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </motion.div>
          )}
        </div>

        <DialogFooter className="mt-8 flex gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 font-semibold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || isLoading}
            className="flex-2 font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Upload Content
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
