// Lightweight, dependency-free helpers for describing an uploaded file from
// its name + MIME type — used by the attachment-preview UI to pick an icon,
// a human label and a readable size. Detection prefers the MIME type (the
// upload response has none, but the local File does) and falls back to the
// file extension.

export type FileKind =
  | 'image'
  | 'pdf'
  | 'word'
  | 'sheet'
  | 'slides'
  | 'archive'
  | 'code'
  | 'video'
  | 'audio'
  | 'text'
  | 'file'

const EXT_KIND: Record<string, FileKind> = {
  // images
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', gif: 'image',
  svg: 'image', bmp: 'image', avif: 'image', heic: 'image', ico: 'image',
  // documents
  pdf: 'pdf',
  doc: 'word', docx: 'word', rtf: 'word', odt: 'word',
  xls: 'sheet', xlsx: 'sheet', csv: 'sheet', ods: 'sheet',
  ppt: 'slides', pptx: 'slides', odp: 'slides', key: 'slides',
  // archives
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive',
  gz: 'archive', tgz: 'archive', bz2: 'archive',
  // code
  js: 'code', jsx: 'code', ts: 'code', tsx: 'code', json: 'code',
  html: 'code', css: 'code', scss: 'code', py: 'code', go: 'code',
  java: 'code', rb: 'code', php: 'code', c: 'code', cpp: 'code',
  rs: 'code', sh: 'code', yml: 'code', yaml: 'code', xml: 'code', sql: 'code',
  // media
  mp4: 'video', mov: 'video', webm: 'video', avi: 'video', mkv: 'video',
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio', flac: 'audio',
  // text
  txt: 'text', md: 'text', log: 'text',
}

const KIND_LABEL: Record<FileKind, string> = {
  image: 'Image',
  pdf: 'PDF',
  word: 'Document',
  sheet: 'Spreadsheet',
  slides: 'Presentation',
  archive: 'Archive',
  code: 'Code',
  video: 'Video',
  audio: 'Audio',
  text: 'Text',
  file: 'File',
}

/** The lowercase extension (no dot), or '' when the name has none. */
export const getFileExtension = (name: string): string => {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim())
  return match ? match[1].toLowerCase() : ''
}

/** Classify a file by MIME type first, then by extension. */
export const getFileKind = (name: string, mime?: string): FileKind => {
  const m = (mime ?? '').toLowerCase()
  if (m) {
    if (m.startsWith('image/')) return 'image'
    if (m.startsWith('video/')) return 'video'
    if (m.startsWith('audio/')) return 'audio'
    if (m === 'application/pdf') return 'pdf'
    if (m.includes('word') || m.includes('opendocument.text')) return 'word'
    if (m.includes('sheet') || m.includes('excel') || m === 'text/csv') return 'sheet'
    if (m.includes('presentation') || m.includes('powerpoint')) return 'slides'
    if (m.includes('zip') || m.includes('compressed') || m.includes('tar')) return 'archive'
    if (m === 'text/plain') return 'text'
  }
  return EXT_KIND[getFileExtension(name)] ?? 'file'
}

export const isImageFile = (name: string, mime?: string) => getFileKind(name, mime) === 'image'
export const isPdfFile = (name: string, mime?: string) => getFileKind(name, mime) === 'pdf'

/** Short badge shown under the filename, e.g. "PDF", "PNG", "Document". */
export const getFileLabel = (name: string, mime?: string): string => {
  const kind = getFileKind(name, mime)
  const ext = getFileExtension(name)
  if (kind === 'pdf') return 'PDF'
  // For images/code/archives the extension is the most informative label.
  if (ext && (kind === 'image' || kind === 'code' || kind === 'archive')) {
    return ext.toUpperCase()
  }
  return KIND_LABEL[kind]
}

/** Human-readable size, e.g. 1536 -> "1.5 KB". Returns '' when unknown. */
export const formatFileSize = (bytes?: number): string => {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${i === 0 ? value : value.toFixed(value >= 10 || value % 1 === 0 ? 0 : 1)} ${units[i]}`
}
