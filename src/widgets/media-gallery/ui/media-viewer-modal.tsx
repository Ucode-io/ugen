'use client'

import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Download from 'yet-another-react-lightbox/plugins/download'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Video from 'yet-another-react-lightbox/plugins/video'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'
import { FileItem } from '@/entities/media-file/model/types'

interface MediaViewerModalProps {
  files: FileItem[]
  initialIndex: number
  isOpen: boolean
  onClose: () => void
}

export const MediaViewerModal = ({ files, initialIndex, isOpen, onClose }: MediaViewerModalProps) => {
  if (!isOpen) return null

  const slides = files.map((file) => {
    const mediaName = `${file.link} ${file.file_name_disk} ${file.file_name_download}`
    const isVideo =
      file.mimetype?.startsWith('video/') ||
      /\.(mp4|ogg|webm)(?:$|[\s?#])/i.test(mediaName)

    if (isVideo) {
      return {
        type: 'video' as const,
        sources: [{ src: file.link, type: 'video/mp4' }],
        title: file.title,
      }
    }

    return {
      src: file.link,
      title: file.title,
      description: `${(file.file_size / (1024 * 1024)).toFixed(2)} MB`,
    }
  })

  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      index={initialIndex}
      slides={slides}
      plugins={[Zoom, Download, Thumbnails, Video]}
      zoom={{
        maxZoomPixelRatio: 5,
        zoomInMultiplier: 1.5,
        doubleTapDelay: 300,
        doubleClickDelay: 300,
        scrollToZoom: true,
      }}
      styles={{
        container: {
          backgroundColor: 'rgba(0, 0, 0, 0.92)',
          backdropFilter: 'blur(12px)',
        },
      }}
      carousel={{ finite: false }}
    />
  )
}
