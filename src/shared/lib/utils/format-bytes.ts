/**
 * Format bytes to the most appropriate unit (B, KB, MB, GB, TB)
 */
export const formatBytes = (bytes: number): string => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Format bytes always as GB (e.g. for database / asset size limits)
 */
export const formatBytesAsGB = (bytes: number): string => {
  if (!bytes) return '0 GB'
  const gb = bytes / (1024 * 1024 * 1024)
  return `${gb.toFixed(2)} GB`
}

/**
 * Format megabytes always as GB
 */
export const formatMBAsGB = (mb: number): string => {
  if (!mb) return '0 GB'
  const gb = mb / 1024
  return `${gb.toFixed(2)} GB`
}

/**
 * Format megabytes: show as MB if < 1000, otherwise as GB
 */
export const formatMBSmart = (mb: number): string => {
  if (!mb) return '0 MB'
  if (mb < 1000) return `${mb.toFixed(2)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}
