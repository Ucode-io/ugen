import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react"
import {
  Type, Sparkles, RotateCw, RotateCcw, MessageSquare, Search,
  ChevronDown, ChevronUp, X, Trash2, Blend, AlignHorizontalSpaceAround,
  Image as ImageIcon, Loader2, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Underline, Strikethrough, Italic, Baseline, Minus,
  MoveHorizontal, MoveVertical, ArrowUp, ArrowRight, ArrowDown, ArrowLeft,
  SlidersHorizontal, LayoutGrid, Columns3,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui"
import { cn } from "@/shared/lib/utils/cn"
import { fileService } from "@/shared/api/file-service"

function rgbToHex(rgb: string): string | null {
  const ma = rgb.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/)
  if (!ma) return null
  if (ma[4] !== undefined && parseFloat(ma[4]) === 0) return null
  return '#' + [ma[1], ma[2], ma[3]].map((v) => parseInt(v).toString(16).padStart(2, '0')).join('')
}

const FONT_FAMILIES = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway',
  'Ubuntu', 'Nunito', 'Playfair Display', 'Merriweather', 'Source Code Pro',
  'Fira Code', 'DM Sans', 'Space Grotesk', 'Plus Jakarta Sans', 'Manrope',
  'Outfit', 'Geist', 'Geist Mono', 'Josefin Sans', 'Rubik', 'Work Sans',
  'Karla', 'Mulish', 'Jost', 'Cabin', 'Quicksand', 'Barlow', 'Archivo',
  'Figtree', 'Lexend', 'Abril Fatface', 'Albert Sans', 'Alegreya',
  'Architects Daughter',
]

const FONT_WEIGHTS = [
  { label: 'Thin', value: '100' },
  { label: 'Light', value: '300' },
  { label: 'Regular', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semibold', value: '600' },
  { label: 'Bold', value: '700' },
  { label: 'Black', value: '900' },
]

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72]

type StyleValue = string | number | null
type StyleMap = Record<string, StyleValue>

type CommitMeta = {
  tagName?: string
  domPath?: string
  outerHTML?: string | null
  flush?: boolean
}

type IconType = React.ComponentType<{ size?: number; className?: string }>

// ── Stable child components (module scope so React keeps focus on inputs) ──

const PopoverTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[15px] font-semibold text-text-main">{children}</p>
)

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[13px] font-medium text-text-muted">{children}</p>
)

const ChevronRightTiny = () => (
  <ChevronDown size={13} className="-rotate-90 text-text-muted shrink-0" />
)

interface SegItem {
  key: string
  icon?: IconType
  label?: React.ReactNode
  active: boolean
  title?: string
  onClick: () => void
}

const Segmented = ({ items }: { items: SegItem[] }) => (
  <div className="flex items-center gap-1 rounded-lg bg-bg-sidebar p-1">
    {items.map((it) => {
      const Icon = it.icon
      return (
        <button
          key={it.key}
          type="button"
          title={it.title}
          onClick={it.onClick}
          className={cn(
            "flex-1 h-8 flex items-center justify-center rounded-md text-[13px] font-semibold transition-colors",
            it.active
              ? "bg-bg-card text-text-main shadow-sm"
              : "text-text-muted hover:text-text-main",
          )}
        >
          {Icon ? <Icon size={15} /> : it.label}
        </button>
      )
    })}
  </div>
)

interface StepperRowProps {
  icon?: IconType
  value: string
  min?: number
  max?: number
  onChange: (next: string | null) => void
  onExpand?: () => void
  expanded?: boolean
}

const StepperRow = ({ icon: Icon, value, min, max, onChange, onExpand, expanded }: StepperRowProps) => {
  const numeric = value === '' ? '' : Number(value)
  const step = (delta: number) => {
    const base = value === '' ? 0 : Number(value)
    let n = base + delta
    if (min != null) n = Math.max(min, n)
    if (max != null) n = Math.min(max, n)
    onChange(String(n))
  }
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon size={15} className="shrink-0 text-text-muted" />}
      <div className="relative flex-1">
        <input
          type="number"
          value={numeric}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
          className="w-full h-8 pl-2.5 pr-7 rounded-lg bg-bg-sidebar border border-border-subtle text-[13px] text-text-main outline-none focus:border-primary/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col">
          <button type="button" onClick={() => step(1)} className="text-text-muted hover:text-text-main">
            <ChevronUp size={11} />
          </button>
          <button type="button" onClick={() => step(-1)} className="text-text-muted hover:text-text-main">
            <ChevronDown size={11} />
          </button>
        </div>
      </div>
      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          title="Edit each side"
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-md transition-colors shrink-0",
            expanded ? "bg-hover-bg text-text-main" : "text-text-muted hover:bg-hover-bg hover:text-text-main",
          )}
        >
          <SlidersHorizontal size={15} />
        </button>
      )}
    </div>
  )
}

// Illustrated layout presets for the Schema tab. Each draws a little UI diagram
// (boxes arranged in the resulting layout) and, when picked, applies that layout
// to the selected container via the normal STYLE_APPLY path.
const LAYOUT_PRESETS: Array<{
  key: string
  label: string
  apply: StyleMap
  preview: React.CSSProperties
  boxes: number
  box: React.CSSProperties
}> = [
  {
    key: 'row', label: 'Row',
    apply: { display: 'flex', flexDirection: 'row', flexWrap: null, justifyContent: 'flex-start', alignItems: 'center', gridTemplateColumns: null },
    preview: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }, boxes: 3, box: { flex: '1 1 0', height: '62%' },
  },
  {
    key: 'stack', label: 'Stack',
    apply: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'stretch', gridTemplateColumns: null },
    preview: { display: 'flex', flexDirection: 'column', gap: 4 }, boxes: 3, box: { width: '100%', flex: '1 1 0' },
  },
  {
    key: 'cols2', label: '2 columns',
    apply: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', flexDirection: null, flexWrap: null },
    preview: { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 4 }, boxes: 4, box: { width: '100%', height: '100%' },
  },
  {
    key: 'cols3', label: '3 columns',
    apply: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', flexDirection: null, flexWrap: null },
    preview: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 3 }, boxes: 6, box: { width: '100%', height: '100%' },
  },
  {
    key: 'center', label: 'Centered',
    apply: { display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gridTemplateColumns: null },
    preview: { display: 'flex', justifyContent: 'center', alignItems: 'center' }, boxes: 1, box: { width: '42%', height: '52%' },
  },
  {
    key: 'between', label: 'Space between',
    apply: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gridTemplateColumns: null },
    preview: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, boxes: 3, box: { width: '22%', height: '56%' },
  },
]

interface ColorRowProps {
  label: string
  value: string
  onChange: (hex: string) => void
}

const ColorRow = ({ label, value, onChange }: ColorRowProps) => (
  <div className="flex items-center justify-between">
    <span className="text-[13px] text-text-main">{label}</span>
    <label className="flex items-center gap-2 cursor-pointer group">
      <span className="text-[12px] text-text-muted font-mono group-hover:text-text-main transition-colors">
        {value.toUpperCase()}
      </span>
      <div
        className="w-7 h-7 rounded-lg border border-border-subtle shadow-sm overflow-hidden relative"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </label>
  </div>
)

interface ElementStyleToolbarProps {
  isVisible: boolean
  position: { x: number; y: number }
  containerRef: React.RefObject<HTMLDivElement | null>
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  domPath?: string
  onClose: () => void
  onOpenAiPrompt?: () => void
  /** Called when the current edit session is closing. Live preview uses STYLE_APPLY only. */
  onCommitStyles?: (styles: Record<string, string | number | null>, meta: CommitMeta) => void
  tagName?: string
  sourceOuterHTML?: string | null
}

export const ElementStyleToolbar = ({
  isVisible, position: initialPosition, containerRef, iframeRef, domPath, onClose, onOpenAiPrompt,
  onCommitStyles, tagName, sourceOuterHTML,
}: ElementStyleToolbarProps) => {
  // Position / drag
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Live style state
  const [styles, setStyles] = useState<StyleMap>({})
  const stylesRef = useRef<StyleMap>({})
  const [computedStyles, setComputedStyles] = useState<Record<string, string>>({})
  const [fontSearch, setFontSearch] = useState('')
  const [marginExpanded, setMarginExpanded] = useState(false)
  const [paddingExpanded, setPaddingExpanded] = useState(false)
  const [layoutTab, setLayoutTab] = useState<'block' | 'schema'>('block')

  useEffect(() => { setPosition(initialPosition) }, [initialPosition])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setPosition({ x: e.clientX - rect.left - dragOffset.x, y: e.clientY - rect.top - dragOffset.y })
    }
    const onUp = () => setIsDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDragging, dragOffset, containerRef])

  // Reset state when a different element is selected and fetch computed styles
  useEffect(() => {
    setStyles({})
    stylesRef.current = {}
    setComputedStyles({})
    setFontSearch('')
    setMarginExpanded(false)
    setPaddingExpanded(false)
    setLayoutTab('block')
    if (domPath) {
      iframeRef.current?.contentWindow?.postMessage({ type: 'GET_COMPUTED_STYLES', domPath }, '*')
    }
  }, [domPath, iframeRef])

  // Listen for computed styles response from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'COMPUTED_STYLES_RESULT') return
      if (e.data.domPath !== domPath) return
      const s = e.data.styles || {}
      const fsPx = parseFloat(s.fontSize)
      const lhPx = parseFloat(s.lineHeight)
      const next: Record<string, string> = {}
      const c1 = s.color && rgbToHex(s.color); if (c1) next.color = c1
      const c2 = s.backgroundColor && rgbToHex(s.backgroundColor); if (c2) next.backgroundColor = c2
      const c3 = s.borderColor && rgbToHex(s.borderColor); if (c3) next.borderColor = c3
      if (s.fontSize) next.fontSize = s.fontSize
      if (s.fontWeight) next.fontWeight = s.fontWeight
      if (s.fontFamily) next.fontFamily = s.fontFamily
      if (s.letterSpacing && s.letterSpacing !== 'normal') next.letterSpacing = s.letterSpacing
      if (!isNaN(fsPx) && !isNaN(lhPx) && fsPx > 0) {
        next.lineHeight = String(Math.round((lhPx / fsPx) * 100) / 100)
      }
      if (s.textAlign) next.textAlign = s.textAlign === 'start' ? 'left' : s.textAlign === 'end' ? 'right' : s.textAlign
      if (s.textTransform) next.textTransform = s.textTransform
      if (s.fontStyle) next.fontStyle = s.fontStyle
      if (s.textDecorationLine) next.textDecorationLine = s.textDecorationLine
      if (s.opacity) next.opacity = s.opacity
      if (s.display) next.display = s.display
      if (s.flexDirection) next.flexDirection = s.flexDirection
      if (s.justifyContent) next.justifyContent = s.justifyContent
      if (s.alignItems) next.alignItems = s.alignItems
      if (s.justifyItems) next.justifyItems = s.justifyItems
      if (s.flexWrap) next.flexWrap = s.flexWrap
      if (s.gridTemplateColumns) next.gridTemplateColumns = s.gridTemplateColumns
      for (const k of ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'columnGap', 'rowGap']) {
        if (s[k]) next[k] = s[k]
      }
      setComputedStyles(next)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [domPath])

  const postStyles = useCallback((patch: StyleMap) => {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'STYLE_APPLY',
      domPath,
      styles: patch,
    }, '*')
  }, [iframeRef, domPath])

  const emitCommit = useCallback((nextStyles: StyleMap, flush = false) => {
    if (Object.keys(nextStyles).length === 0) return
    onCommitStyles?.(nextStyles, {
      tagName,
      domPath,
      outerHTML: sourceOuterHTML ?? null,
      flush,
    })
  }, [domPath, onCommitStyles, sourceOuterHTML, tagName])

  const update = useCallback((patch: StyleMap) => {
    const nextStyles = { ...stylesRef.current, ...patch }
    stylesRef.current = nextStyles
    setStyles(nextStyles)
    postStyles(patch)
  }, [postStyles])

  const wasVisibleRef = useRef(isVisible)
  useEffect(() => {
    if (wasVisibleRef.current && !isVisible) {
      emitCommit(stylesRef.current, true)
      stylesRef.current = {}
      setStyles({})
    }
    wasVisibleRef.current = isVisible
  }, [emitCommit, isVisible])

  useEffect(() => {
    return () => {
      emitCommit(stylesRef.current, true)
    }
  }, [emitCommit])

  const resetAll = useCallback(() => {
    const resetPatch = Object.fromEntries(
      Object.keys(stylesRef.current).map((key) => [key, null]),
    ) as StyleMap
    stylesRef.current = resetPatch
    setStyles(resetPatch)
    iframeRef.current?.contentWindow?.postMessage({ type: 'STYLE_RESET', domPath }, '*')
  }, [iframeRef, domPath])

  const get = useCallback((k: string, fallback = '') => {
    if (styles[k] != null) return String(styles[k])
    if (computedStyles[k]) return computedStyles[k]
    return fallback
  }, [styles, computedStyles])

  const pxVal = useCallback((k: string) => {
    const n = parseFloat(get(k))
    return isNaN(n) ? '' : String(Math.round(n))
  }, [get])

  const setSpacing = useCallback((keys: string[], raw: string | null) => {
    const v = raw == null || raw === '' ? null : `${parseFloat(raw) || 0}px`
    update(Object.fromEntries(keys.map((k) => [k, v])))
  }, [update])

  // Image replace — upload a file and swap the <img> via the CSS `content`
  // property so it rides the same live-apply + persistence as every other edit.
  const isImage = (tagName ?? '').toUpperCase() === 'IMG'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const handleImagePick = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await fileService.folderUpload(formData, { folder_name: 'preview-uploads' })
      const cdn = process.env.NEXT_PUBLIC_CDN_BASE_URL || 'https://cdn.u-code.io'
      const link = (result as { data?: { link?: string } })?.data?.link
      if (link) update({ content: `url("${cdn}/${link}")` })
    } catch (err) {
      console.error('[image-upload] failed', err)
    } finally {
      setIsUploadingImage(false)
    }
  }, [update])

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('input, button, [data-popover-content]')) return
    e.preventDefault(); e.stopPropagation()
    setIsDragging(true)
    const rect = toolbarRef.current?.getBoundingClientRect()
    if (rect) setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const ensureGoogleFont = (font: string) => {
    const doc = iframeRef.current?.contentDocument
    if (!doc?.head) return
    const id = `ugen-style-font-${font.replace(/\s+/g, '-')}`
    if (doc.getElementById(id)) return
    const link = doc.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`
    doc.head.appendChild(link)
  }

  if (!isVisible) return null

  const currentFont = get('fontFamily', 'Inter').replace(/['"]/g, '').split(',')[0].trim()
  const filteredFonts = FONT_FAMILIES.filter((f) => f.toLowerCase().includes(fontSearch.toLowerCase()))
  const brandFonts = Array.from(new Set([currentFont, 'Inter']))
  const currentSize = (() => { const n = parseFloat(get('fontSize')); return isNaN(n) ? null : Math.round(n) })()

  const deco = get('textDecorationLine')
  const hasUnderline = deco.includes('underline')
  const hasStrike = deco.includes('line-through')
  const isItalic = get('fontStyle') === 'italic'
  const tt = get('textTransform')
  const align = get('textAlign')

  // Layout (flex / grid)
  const display = get('display')
  const isFlex = display.includes('flex')
  const isGrid = display.includes('grid')
  const flexDir = get('flexDirection', 'row')
  const justify = get('justifyContent', 'normal')
  const alignI = get('alignItems', 'normal')
  const wrap = get('flexWrap', 'nowrap')
  const gridCols = (() => {
    const local = styles['gridTemplateColumns']
    const raw = local != null ? String(local) : (computedStyles['gridTemplateColumns'] ?? '')
    if (!raw || raw === 'none') return ''
    const m = raw.match(/repeat\(\s*(\d+)/)
    if (m) return m[1]
    return String(raw.trim().split(/\s+/).filter(Boolean).length)
  })()
  const setGridCols = (raw: string | null) => {
    if (raw == null || raw === '') { update({ gridTemplateColumns: null }); return }
    const n = Math.max(1, Math.round(parseFloat(raw) || 1))
    update({ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` })
  }
  // Which illustrated preset (Schema tab) matches the element's current layout.
  const presetActive = (key: string) => {
    switch (key) {
      case 'row': return isFlex && flexDir === 'row' && justify !== 'center' && justify !== 'space-between'
      case 'stack': return isFlex && flexDir === 'column'
      case 'cols2': return isGrid && gridCols === '2'
      case 'cols3': return isGrid && gridCols === '3'
      case 'center': return isFlex && justify === 'center' && alignI === 'center'
      case 'between': return isFlex && justify === 'space-between'
      default: return false
    }
  }

  const applyFont = (f: string) => {
    ensureGoogleFont(f)
    update({ fontFamily: `'${f}', sans-serif` })
  }

  // ── shared trigger styles ──
  const iconBtn = "h-8 w-8 flex items-center justify-center rounded-md text-text-muted hover:bg-hover-bg hover:text-text-main data-[state=open]:bg-hover-bg data-[state=open]:text-text-main transition-colors shrink-0"
  const labelBtn = "h-8 px-2.5 flex items-center gap-1 rounded-md text-[13px] font-medium text-text-main hover:bg-hover-bg data-[state=open]:bg-hover-bg transition-colors shrink-0"
  const Divider = () => <div className="w-px h-5 bg-border-subtle mx-0.5" />
  const popoverShadow = "shadow-[0_8px_30px_rgba(0,0,0,0.12)]"

  return (
    <div
      ref={toolbarRef}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('input, button, select, label, [data-popover-content]')) return
        e.preventDefault()
        e.stopPropagation()
      }}
      className={cn(
        "ignore-inspect absolute z-110 flex items-center gap-1.5 transition-opacity duration-200",
        isDragging ? "opacity-90" : "opacity-100",
      )}
      style={{
        top: position.y,
        left: Math.max(20, position.x),
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* ── Pill A: AI regenerate ── */}
      {onOpenAiPrompt && (
        <div className={cn("flex items-center bg-bg-card border border-border-subtle rounded-xl p-1", popoverShadow)}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenAiPrompt() }}
            title="Regenerate with AI"
            className="h-8 w-8 flex items-center justify-center rounded-md text-text-main hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <span className="relative inline-flex">
              <RotateCw size={15} />
              <Sparkles size={9} className="absolute -top-1 -right-1.5 text-primary" />
            </span>
          </button>
        </div>
      )}

      {/* ── Pill B: editing toolbar ── */}
      <div className={cn("flex items-center gap-0.5 bg-bg-card border border-border-subtle rounded-xl px-1.5 py-1", popoverShadow)}>
        {/* Edit Element (AI) */}
        {onOpenAiPrompt && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenAiPrompt() }}
              className="h-8 px-2.5 flex items-center gap-1.5 rounded-md text-[13px] font-medium text-text-main hover:bg-hover-bg transition-colors shrink-0"
              title="Edit with AI"
            >
              <MessageSquare size={15} className="text-text-muted" />
              <span>Edit Element</span>
            </button>
            <Divider />
          </>
        )}

        {/* Image replace (only for <img>) */}
        {isImage && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            <button
              type="button"
              title="Upload a new image"
              disabled={isUploadingImage}
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              className="h-8 px-2.5 flex items-center gap-1.5 rounded-md text-[13px] font-medium text-text-main hover:bg-hover-bg transition-colors shrink-0 disabled:opacity-50"
            >
              {isUploadingImage
                ? <Loader2 size={15} className="animate-spin text-primary" />
                : <ImageIcon size={15} className="text-text-muted" />}
              <span>{isUploadingImage ? 'Uploading…' : 'Replace'}</span>
            </button>
            <Divider />
          </>
        )}

        {/* Color */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" title="Color" className={iconBtn}>
              <span className="h-4 w-4 rounded-full border border-border-subtle shadow-sm" style={{ background: get('color', '#000000') }} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={10} className={cn("w-60 p-4 space-y-3", popoverShadow)} data-popover-content>
            <PopoverTitle>Color</PopoverTitle>
            <ColorRow label="Text" value={get('color', '#000000')} onChange={(hex) => update({ color: hex })} />
            <ColorRow label="Background" value={get('backgroundColor', '#ffffff')} onChange={(hex) => update({ backgroundColor: hex })} />
            <button
              type="button"
              onClick={() => update({ backgroundColor: null })}
              className="text-[12px] text-text-muted hover:text-red-500 transition-colors"
            >
              Clear background
            </button>
          </PopoverContent>
        </Popover>

        {/* Text content */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" title="Text content" className={iconBtn}>
              <Type size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={10} className={cn("w-72 p-4 space-y-3", popoverShadow)} data-popover-content>
            <PopoverTitle>Text Content</PopoverTitle>
            <div className="rounded-lg bg-bg-sidebar p-3 text-[13px] leading-relaxed text-text-muted">
              This content is dynamically generated and cannot be edited directly. You can modify the content via the chat.
            </div>
            {onOpenAiPrompt && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenAiPrompt() }}
                className="w-full h-9 flex items-center justify-center gap-1.5 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors"
              >
                <MessageSquare size={14} />
                Edit via chat
              </button>
            )}
          </PopoverContent>
        </Popover>

        {/* Font family */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" title="Font" className={labelBtn}>
              <span className="max-w-[120px] truncate">{currentFont}</span>
              <ChevronDown size={13} className="text-text-muted" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={10} className={cn("w-64 p-2", popoverShadow)} data-popover-content>
            <div className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg border border-border-subtle bg-bg-sidebar mb-2">
              <Search size={13} className="text-text-muted" />
              <input
                autoFocus
                value={fontSearch}
                onChange={(e) => setFontSearch(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent text-[13px] text-text-main placeholder:text-text-muted outline-none"
              />
            </div>
            {!fontSearch && (
              <div className="mb-1">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Brand Fonts</p>
                {brandFonts.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => applyFont(f)}
                    style={{ fontFamily: `'${f}', sans-serif` }}
                    className={cn(
                      "w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-md text-[14px] transition-colors",
                      f === currentFont ? "bg-primary/10 text-primary" : "text-text-main hover:bg-hover-bg",
                    )}
                  >
                    <span className="truncate">{f}</span>
                    <ChevronRightTiny />
                  </button>
                ))}
                <div className="my-1 border-t border-border-subtle" />
              </div>
            )}
            <div className="max-h-56 overflow-y-auto">
              {filteredFonts.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => applyFont(f)}
                  style={{ fontFamily: `'${f}', sans-serif` }}
                  className={cn(
                    "w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-md text-[14px] transition-colors",
                    f === currentFont ? "bg-primary/10 text-primary" : "text-text-main hover:bg-hover-bg",
                  )}
                >
                  <span className="truncate">{f}</span>
                  <ChevronRightTiny />
                </button>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-border-subtle flex items-center justify-between gap-2">
              <span className="text-[13px] text-text-muted">Weight</span>
              <select
                value={get('fontWeight', '400')}
                onChange={(e) => update({ fontWeight: e.target.value })}
                className="h-8 px-2 text-[13px] rounded-lg border border-border-subtle bg-bg-sidebar text-text-main outline-none focus:border-primary/50"
              >
                {FONT_WEIGHTS.map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
          </PopoverContent>
        </Popover>

        {/* Size */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" title="Font size" className={labelBtn}>
              <span>{currentSize ? `${currentSize}` : 'Size'}</span>
              <ChevronDown size={13} className="text-text-muted" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={10} className={cn("w-40 p-2", popoverShadow)} data-popover-content>
            <input
              type="number"
              min={4}
              max={400}
              value={currentSize ?? ''}
              onChange={(e) => update({ fontSize: e.target.value === '' ? null : `${e.target.value}px` })}
              placeholder="Size"
              className="w-full h-9 px-2.5 mb-1 rounded-lg border border-border-subtle bg-bg-sidebar text-[13px] text-text-main outline-none focus:border-primary/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <div className="max-h-56 overflow-y-auto">
              {FONT_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update({ fontSize: `${s}px` })}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-md text-[14px] transition-colors",
                    currentSize === s ? "bg-primary/10 text-primary font-medium" : "text-text-main hover:bg-hover-bg",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Text style */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" title="Text style" className={iconBtn}>
              <Baseline size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={10} className={cn("w-72 p-4 space-y-4", popoverShadow)} data-popover-content>
            <PopoverTitle>Text style</PopoverTitle>
            <div className="space-y-2">
              <FieldLabel>Alignment</FieldLabel>
              <Segmented items={[
                { key: 'left', icon: AlignLeft, active: align === 'left', onClick: () => update({ textAlign: 'left' }) },
                { key: 'center', icon: AlignCenter, active: align === 'center', onClick: () => update({ textAlign: 'center' }) },
                { key: 'right', icon: AlignRight, active: align === 'right', onClick: () => update({ textAlign: 'right' }) },
                { key: 'justify', icon: AlignJustify, active: align === 'justify', onClick: () => update({ textAlign: 'justify' }) },
              ]} />
            </div>
            <div className="space-y-2">
              <FieldLabel>Case</FieldLabel>
              <Segmented items={[
                { key: 'none', icon: Minus, title: 'None', active: tt === '' || tt === 'none', onClick: () => update({ textTransform: null }) },
                { key: 'upper', label: 'AA', title: 'Uppercase', active: tt === 'uppercase', onClick: () => update({ textTransform: 'uppercase' }) },
                { key: 'lower', label: 'aa', title: 'Lowercase', active: tt === 'lowercase', onClick: () => update({ textTransform: 'lowercase' }) },
                { key: 'cap', label: 'Aa', title: 'Capitalize', active: tt === 'capitalize', onClick: () => update({ textTransform: 'capitalize' }) },
              ]} />
            </div>
            <div className="space-y-2">
              <FieldLabel>Decoration</FieldLabel>
              <Segmented items={[
                { key: 'none', icon: Minus, title: 'None', active: !hasUnderline && !hasStrike && !isItalic, onClick: () => update({ textDecorationLine: null, fontStyle: null }) },
                { key: 'underline', icon: Underline, title: 'Underline', active: hasUnderline, onClick: () => update({ textDecorationLine: hasUnderline ? (hasStrike ? 'line-through' : null) : (hasStrike ? 'underline line-through' : 'underline') }) },
                { key: 'strike', icon: Strikethrough, title: 'Strikethrough', active: hasStrike, onClick: () => update({ textDecorationLine: hasStrike ? (hasUnderline ? 'underline' : null) : (hasUnderline ? 'underline line-through' : 'line-through') }) },
                { key: 'italic', icon: Italic, title: 'Italic', active: isItalic, onClick: () => update({ fontStyle: isItalic ? null : 'italic' }) },
              ]} />
            </div>
          </PopoverContent>
        </Popover>

        {/* Opacity */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" title="Opacity" className={iconBtn}>
              <Blend size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={10} className={cn("w-72 p-4 space-y-3", popoverShadow)} data-popover-content>
            <PopoverTitle>Opacity</PopoverTitle>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0} max={100} step={1}
                value={Math.round(parseFloat(get('opacity', '1')) * 100)}
                onChange={(e) => update({ opacity: String(parseInt(e.target.value, 10) / 100) })}
                className="flex-1 accent-primary"
              />
              <span className="text-[13px] text-text-main font-medium w-10 text-right">
                {Math.round(parseFloat(get('opacity', '1')) * 100)}%
              </span>
            </div>
          </PopoverContent>
        </Popover>

        {/* Spacing */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" title="Spacing" className={iconBtn}>
              <AlignHorizontalSpaceAround size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={10} className={cn("w-80 p-4 space-y-4", popoverShadow)} data-popover-content>
            {/* Margin */}
            <div className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-2 items-center">
              <FieldLabel>Margin</FieldLabel>
              {marginExpanded ? (
                <div className="space-y-2">
                  <StepperRow icon={ArrowUp} value={pxVal('marginTop')} onChange={(v) => setSpacing(['marginTop'], v)} onExpand={() => setMarginExpanded(false)} expanded />
                  <StepperRow icon={ArrowRight} value={pxVal('marginRight')} onChange={(v) => setSpacing(['marginRight'], v)} />
                  <StepperRow icon={ArrowDown} value={pxVal('marginBottom')} onChange={(v) => setSpacing(['marginBottom'], v)} />
                  <StepperRow icon={ArrowLeft} value={pxVal('marginLeft')} onChange={(v) => setSpacing(['marginLeft'], v)} />
                </div>
              ) : (
                <div className="space-y-2">
                  <StepperRow icon={MoveHorizontal} value={pxVal('marginLeft')} onChange={(v) => setSpacing(['marginLeft', 'marginRight'], v)} onExpand={() => setMarginExpanded(true)} expanded={false} />
                  <StepperRow icon={MoveVertical} value={pxVal('marginTop')} onChange={(v) => setSpacing(['marginTop', 'marginBottom'], v)} onExpand={() => setMarginExpanded(true)} expanded={false} />
                </div>
              )}
            </div>
            <div className="border-t border-border-subtle" />
            {/* Padding */}
            <div className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-2 items-center">
              <FieldLabel>Padding</FieldLabel>
              {paddingExpanded ? (
                <div className="space-y-2">
                  <StepperRow icon={ArrowUp} value={pxVal('paddingTop')} min={0} onChange={(v) => setSpacing(['paddingTop'], v)} onExpand={() => setPaddingExpanded(false)} expanded />
                  <StepperRow icon={ArrowRight} value={pxVal('paddingRight')} min={0} onChange={(v) => setSpacing(['paddingRight'], v)} />
                  <StepperRow icon={ArrowDown} value={pxVal('paddingBottom')} min={0} onChange={(v) => setSpacing(['paddingBottom'], v)} />
                  <StepperRow icon={ArrowLeft} value={pxVal('paddingLeft')} min={0} onChange={(v) => setSpacing(['paddingLeft'], v)} />
                </div>
              ) : (
                <div className="space-y-2">
                  <StepperRow icon={MoveHorizontal} value={pxVal('paddingLeft')} min={0} onChange={(v) => setSpacing(['paddingLeft', 'paddingRight'], v)} onExpand={() => setPaddingExpanded(true)} expanded={false} />
                  <StepperRow icon={MoveVertical} value={pxVal('paddingTop')} min={0} onChange={(v) => setSpacing(['paddingTop', 'paddingBottom'], v)} onExpand={() => setPaddingExpanded(true)} expanded={false} />
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Layout (flex / grid) */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" title="Layout" className={iconBtn}>
              <LayoutGrid size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={10} className={cn("w-80 max-h-[70vh] overflow-y-auto p-4 space-y-4", popoverShadow)} data-popover-content>
            <PopoverTitle>Layout</PopoverTitle>
            <Segmented items={[
              { key: 'block', label: 'Block', active: layoutTab === 'block', onClick: () => setLayoutTab('block') },
              { key: 'schema', label: 'Schema', active: layoutTab === 'schema', onClick: () => setLayoutTab('schema') },
            ]} />

            {layoutTab === 'block' ? (
              <>
                <div className="space-y-2">
                  <FieldLabel>Display</FieldLabel>
                  <Segmented items={[
                    { key: 'block', label: 'Block', active: !isFlex && !isGrid, onClick: () => update({ display: 'block' }) },
                    { key: 'flex', label: 'Flex', active: isFlex, onClick: () => update({ display: 'flex' }) },
                    { key: 'grid', label: 'Grid', active: isGrid, onClick: () => update({ display: 'grid' }) },
                  ]} />
                </div>

                {isFlex && (
                  <>
                    <div className="space-y-2">
                      <FieldLabel>Direction</FieldLabel>
                      <Segmented items={[
                        { key: 'row', icon: ArrowRight, title: 'Row', active: flexDir === 'row', onClick: () => update({ flexDirection: 'row' }) },
                        { key: 'column', icon: ArrowDown, title: 'Column', active: flexDir === 'column', onClick: () => update({ flexDirection: 'column' }) },
                        { key: 'row-reverse', icon: ArrowLeft, title: 'Row reverse', active: flexDir === 'row-reverse', onClick: () => update({ flexDirection: 'row-reverse' }) },
                        { key: 'column-reverse', icon: ArrowUp, title: 'Column reverse', active: flexDir === 'column-reverse', onClick: () => update({ flexDirection: 'column-reverse' }) },
                      ]} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <FieldLabel>Gap</FieldLabel>
                        <StepperRow value={pxVal('columnGap')} min={0} onChange={(v) => setSpacing(['columnGap', 'rowGap'], v)} />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel>Wrap</FieldLabel>
                        <Segmented items={[
                          { key: 'nowrap', label: 'Off', active: wrap === 'nowrap', onClick: () => update({ flexWrap: 'nowrap' }) },
                          { key: 'wrap', label: 'On', active: wrap === 'wrap' || wrap === 'wrap-reverse', onClick: () => update({ flexWrap: 'wrap' }) },
                        ]} />
                      </div>
                    </div>
                  </>
                )}

                {isGrid && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <FieldLabel>Columns</FieldLabel>
                      <StepperRow icon={Columns3} value={gridCols} min={1} onChange={setGridCols} />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>Gap</FieldLabel>
                      <StepperRow value={pxVal('columnGap')} min={0} onChange={(v) => setSpacing(['columnGap', 'rowGap'], v)} />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <FieldLabel>Pick a layout</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {LAYOUT_PRESETS.map((preset) => {
                    const active = presetActive(preset.key)
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => update(preset.apply)}
                        className={cn(
                          "flex flex-col gap-1.5 rounded-lg border p-2 text-left transition-colors",
                          active
                            ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                            : "border-border-subtle hover:border-primary/40 hover:bg-hover-bg",
                        )}
                      >
                        <div className="h-12 w-full overflow-hidden rounded-md border border-border-subtle bg-bg-card p-1.5" style={preset.preview}>
                          {Array.from({ length: preset.boxes }).map((_, i) => (
                            <span key={i} className="rounded-sm bg-primary/50" style={preset.box} />
                          ))}
                        </div>
                        <span className={cn("text-[12px] font-medium", active ? "text-primary" : "text-text-main")}>{preset.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Divider />

        {/* Reset */}
        <button
          type="button"
          title="Reset changes"
          onClick={(e) => { e.stopPropagation(); resetAll() }}
          className={iconBtn}
        >
          <RotateCcw size={15} />
        </button>

        {/* Remove (hide) */}
        <button
          type="button"
          title="Hide element (reset to restore)"
          onClick={(e) => { e.stopPropagation(); update({ display: 'none' }) }}
          className="h-8 w-8 flex items-center justify-center rounded-md text-text-muted hover:bg-red-500/10 hover:text-red-500 transition-colors shrink-0"
        >
          <Trash2 size={15} />
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            emitCommit(stylesRef.current, true)
            stylesRef.current = {}
            setStyles({})
            onClose()
          }}
          className={iconBtn}
          title="Done"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
