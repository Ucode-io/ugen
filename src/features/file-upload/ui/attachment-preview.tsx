'use client'

import { useState } from 'react'
import {
  X,
  Eye,
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  FileVideo,
  FileAudio,
  Presentation,
  File as FileIcon,
  type LucideIcon,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui'
import { cn } from '@/shared/lib/utils/cn'
import type { UploadedFile } from '@/shared/hooks/useFileUpload'
import {
  getFileKind,
  getFileLabel,
  formatFileSize,
  type FileKind,
} from '../lib/file-meta'

// Per-kind icon + accent. PDF is special-cased to the bundled brand SVG.
const KIND_ICON: Record<Exclude<FileKind, 'image' | 'pdf'>, LucideIcon> = {
  word: FileText,
  sheet: FileSpreadsheet,
  slides: Presentation,
  archive: FileArchive,
  code: FileCode,
  video: FileVideo,
  audio: FileAudio,
  text: FileText,
  file: FileIcon,
}

const KIND_ACCENT: Record<Exclude<FileKind, 'image' | 'pdf'>, string> = {
  word: 'text-blue-500 bg-blue-500/10',
  sheet: 'text-emerald-500 bg-emerald-500/10',
  slides: 'text-orange-500 bg-orange-500/10',
  archive: 'text-amber-500 bg-amber-500/10',
  code: 'text-violet-500 bg-violet-500/10',
  video: 'text-pink-500 bg-pink-500/10',
  audio: 'text-teal-500 bg-teal-500/10',
  text: 'text-text-muted bg-border-subtle',
  file: 'text-text-muted bg-border-subtle',
}

export type AttachmentSize = 'md' | 'sm'

// Visual density presets. 'sm' is for tight containers like the chat input.
const SIZES = {
  md: {
    thumb: 'h-10 w-10',
    pdfImg: 'h-6 w-6',
    icon: 18,
    eye: 14,
    pad: 'p-2',
    innerGap: 'gap-2',
    maxW: 'max-w-[220px]',
    name: 'text-xs',
    meta: 'text-[11px]',
  },
  sm: {
    thumb: 'h-7 w-7',
    pdfImg: 'h-[18px] w-[18px]',
    icon: 14,
    eye: 12,
    pad: 'p-1.5',
    innerGap: 'gap-1.5',
    maxW: 'max-w-[170px]',
    name: 'text-[11px]',
    meta: 'text-[10px]',
  },
} as const

/** Image thumbnail, PDF brand icon, or a typed accent icon, sized by `size`. */
const FileThumb = ({ file, size }: { file: UploadedFile; size: AttachmentSize }) => {
  const kind = getFileKind(file.name, file.type)
  const s = SIZES[size]

  if (kind === 'image') {
    return (
      <div
        className={cn(
          'border-border-subtle relative shrink-0 overflow-hidden rounded-md border',
          s.thumb,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Eye size={s.eye} className="text-white" />
        </div>
      </div>
    )
  }

  if (kind === 'pdf') {
    return (
      <div className={cn('bg-border-subtle/60 flex shrink-0 items-center justify-center rounded-md', s.thumb)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pdf-icon.svg" alt="PDF" className={s.pdfImg} />
      </div>
    )
  }

  const Icon = KIND_ICON[kind]
  return (
    <div className={cn('flex shrink-0 items-center justify-center rounded-md', s.thumb, KIND_ACCENT[kind])}>
      <Icon size={s.icon} />
    </div>
  )
}

/** Modal lightbox: full image or embedded PDF, with open/download actions. */
const PreviewDialog = ({
  file,
  onClose,
}: {
  file: UploadedFile | null
  onClose: () => void
}) => {
  const kind = file ? getFileKind(file.name, file.type) : 'file'

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      {file && (
        <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
          <div className="border-border-subtle flex items-center gap-2 border-b px-4 py-2.5 pr-10">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-sm font-medium">{file.name}</DialogTitle>
              <DialogDescription className="text-text-muted text-xs">
                {[getFileLabel(file.name, file.type), formatFileSize(file.size)]
                  .filter(Boolean)
                  .join(' · ')}
              </DialogDescription>
            </div>
            <a
              href={file.url}
              download={file.name}
              className="text-text-muted hover:bg-hover-bg hover:text-text-main flex h-8 w-8 items-center justify-center rounded-md transition-colors"
              title="Download"
            >
              <Download size={16} />
            </a>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:bg-hover-bg hover:text-text-main flex h-8 w-8 items-center justify-center rounded-md transition-colors"
              title="Open in new tab"
            >
              <ExternalLink size={16} />
            </a>
          </div>

          {kind === 'image' ? (
            <div className="bg-bg-main flex max-h-[78vh] items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={file.url}
                alt={file.name}
                className="max-h-[70vh] w-auto max-w-full rounded object-contain"
              />
            </div>
          ) : (
            <iframe src={file.url} title={file.name} className="h-[78vh] w-full bg-white" />
          )}
        </DialogContent>
      )}
    </Dialog>
  )
}

export interface AttachmentPreviewsProps {
  files: UploadedFile[]
  onRemove: (id: string) => void
  className?: string
  /** Visual density. Use 'sm' in tight containers like the chat input. */
  size?: AttachmentSize
}

/**
 * Renders uploaded attachments as chips with a type-aware icon, name and size.
 * Images and PDFs open in an in-app lightbox; other types open in a new tab.
 */
export const AttachmentPreviews = ({ files, onRemove, className, size = 'md' }: AttachmentPreviewsProps) => {
  const [preview, setPreview] = useState<UploadedFile | null>(null)
  const s = SIZES[size]

  if (files.length === 0) return null

  const open = (file: UploadedFile) => {
    const kind = getFileKind(file.name, file.type)
    if (kind === 'image' || kind === 'pdf') {
      setPreview(file)
    } else {
      window.open(file.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <>
      <div className={cn('flex gap-2 overflow-x-auto pb-1', className)}>
        {files.map((file) => (
          <div
            key={file.id}
            className={cn(
              'group bg-bg-main border-border-subtle relative flex shrink-0 items-center rounded-lg border',
              s.maxW,
            )}
          >
            <button
              type="button"
              onClick={() => open(file)}
              title={`Preview ${file.name}`}
              className={cn(
                'hover:bg-hover-bg/60 flex min-w-0 items-center rounded-lg text-left transition-colors',
                s.pad,
                s.innerGap,
              )}
            >
              <FileThumb file={file} size={size} />
              <div className="min-w-0 flex-1">
                <p className={cn('text-text-main truncate font-medium', s.name)}>{file.name}</p>
                <p className={cn('text-text-muted truncate', s.meta)}>
                  {[getFileLabel(file.name, file.type), formatFileSize(file.size)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(file.id)
              }}
              title="Remove"
              className="absolute -top-1.5 -right-1.5 z-10 rounded-full bg-red-500 p-0.5 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus:opacity-100"
            >
              <X size={10} strokeWidth={3} />
            </button>
          </div>
        ))}
      </div>

      <PreviewDialog file={preview} onClose={() => setPreview(null)} />
    </>
  )
}
