import { useCallback, useRef, useState, type DragEvent } from 'react'

/** True when the drag payload contains files (ignores text/element drags). */
const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')

/**
 * Drag-and-drop file handling with a flicker-free `isDragging` flag.
 *
 * dragenter/dragleave fire for every child element, so a naive boolean toggles
 * on/off as the cursor moves over nested nodes. We count enter/leave depth and
 * only clear `isDragging` once the cursor has truly left the drop zone.
 *
 * Spread `dragProps` on the drop container and render an overlay keyed off
 * `isDragging`. Keep the overlay `pointer-events-none` so it never intercepts
 * the drag and re-triggers the counter.
 */
export const useFileDrop = (onFiles: (files: FileList) => void) => {
  const [isDragging, setIsDragging] = useState(false)
  const depth = useRef(0)

  const onDragEnter = useCallback((e: DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    depth.current += 1
    setIsDragging(true)
  }, [])

  const onDragOver = useCallback((e: DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault() // required so the element becomes a valid drop target
  }, [])

  const onDragLeave = useCallback((e: DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    depth.current -= 1
    if (depth.current <= 0) {
      depth.current = 0
      setIsDragging(false)
    }
  }, [])

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      depth.current = 0
      setIsDragging(false)
      const files = e.dataTransfer?.files
      if (files?.length) onFiles(files)
    },
    [onFiles],
  )

  return {
    isDragging,
    dragProps: { onDragEnter, onDragOver, onDragLeave, onDrop },
  }
}
