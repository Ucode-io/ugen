import { useState, useEffect, useRef, useCallback } from "react"
import {
  Type, PaintBucket, Square, BoxSelect, Sparkles,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  RotateCcw, X, Bold, Italic, Underline, Search,
  ChevronDown, ChevronUp,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui"
import { cn } from "@/shared/lib/utils/cn"

const FONT_FAMILIES = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway',
  'Ubuntu', 'Nunito', 'Playfair Display', 'Merriweather', 'Source Code Pro',
  'Fira Code', 'DM Sans', 'Space Grotesk', 'Plus Jakarta Sans', 'Manrope',
  'Outfit', 'Geist', 'Geist Mono', 'Josefin Sans', 'Rubik', 'Work Sans',
  'Karla', 'Mulish', 'Jost', 'Cabin', 'Quicksand', 'Barlow', 'Archivo',
  'Figtree', 'Lexend',
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

type StyleValue = string | number | null
type StyleMap = Record<string, StyleValue>

// ── Stable child components (defined at module scope so React keeps focus on inputs) ──

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{children}</p>
)

interface NumberRowProps {
  label: string
  value: string
  unit?: string
  min?: number
  max?: number
  step?: number
  onChange: (next: string | null) => void
}

const NumberRow = ({ label, value, unit = 'px', min, max, step = 1, onChange }: NumberRowProps) => {
  const numeric = value ? parseFloat(value) : ''
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-text-main">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={min} max={max} step={step}
          value={numeric}
          onChange={(e) => {
            const v = e.target.value
            onChange(v === '' ? null : `${v}${unit}`)
          }}
          className="w-16 h-6 px-1.5 text-[12px] rounded border border-border-subtle bg-bg-sidebar text-text-main outline-none focus:border-primary/50"
        />
        <span className="text-[10px] text-text-muted w-5">{unit}</span>
      </div>
    </div>
  )
}

interface ColorRowProps {
  label: string
  value: string
  onChange: (hex: string) => void
}

const ColorRow = ({ label, value, onChange }: ColorRowProps) => (
  <div className="flex items-center justify-between">
    <span className="text-[12px] text-text-main">{label}</span>
    <label className="flex items-center gap-2 cursor-pointer group">
      <span className="text-[11px] text-text-muted font-mono group-hover:text-text-main transition-colors">
        {value.toUpperCase()}
      </span>
      <div
        className="w-6 h-6 rounded border border-border-subtle shadow-sm overflow-hidden relative"
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
  /** Called when the user closes the toolbar with pending styles. Receives the accumulated style patch. */
  onCommitStyles?: (styles: Record<string, string | number | null>, meta: { tagName?: string }) => void
  tagName?: string
}

export const ElementStyleToolbar = ({
  isVisible, position: initialPosition, containerRef, iframeRef, domPath, onClose, onOpenAiPrompt,
  onCommitStyles, tagName,
}: ElementStyleToolbarProps) => {
  // Position / drag
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Live style state
  const [styles, setStyles] = useState<StyleMap>({})
  const [fontOpen, setFontOpen] = useState(false)
  const [fontSearch, setFontSearch] = useState('')

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

  // Reset state when a different element is selected
  useEffect(() => { setStyles({}); setFontOpen(false); setFontSearch('') }, [domPath])

  const postStyles = useCallback((patch: StyleMap) => {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'STYLE_APPLY',
      domPath,
      styles: patch,
    }, '*')
  }, [iframeRef, domPath])

  const update = useCallback((patch: StyleMap) => {
    setStyles((prev) => ({ ...prev, ...patch }))
    postStyles(patch)
  }, [postStyles])

  const resetAll = useCallback(() => {
    setStyles({})
    iframeRef.current?.contentWindow?.postMessage({ type: 'STYLE_RESET', domPath }, '*')
  }, [iframeRef, domPath])

  const get = useCallback((k: string, fallback = '') => (styles[k] != null ? String(styles[k]) : fallback), [styles])

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

  const filteredFonts = FONT_FAMILIES.filter((f) => f.toLowerCase().includes(fontSearch.toLowerCase()))
  const currentFont = get('fontFamily', 'Inter').replace(/['"]/g, '').split(',')[0].trim()

  return (
    <div
      ref={toolbarRef}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      className={cn(
        "ignore-inspect absolute z-110 flex items-center gap-0.5 bg-bg-card border border-border-subtle rounded-xl px-2 py-1.5 shadow-2xl transition-opacity duration-200",
        isDragging ? "opacity-90" : "opacity-100"
      )}
      style={{
        top: position.y,
        left: Math.max(20, position.x),
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* AI Edit */}
      {onOpenAiPrompt && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenAiPrompt() }}
            className="h-8 px-2.5 flex items-center gap-1.5 rounded-md text-[12px] font-medium text-text-main hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
            title="Edit with AI"
          >
            <Sparkles size={14} className="text-primary" />
            <span>Edit Element</span>
          </button>
          <div className="w-px h-5 bg-border-subtle mx-0.5" />
        </>
      )}

      {/* Text */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Text"
            className="h-8 w-8 flex items-center justify-center rounded-md text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors shrink-0"
          >
            <Type size={15} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" sideOffset={8} className="w-64 p-3 space-y-3" data-popover-content>
          <SectionLabel>Font</SectionLabel>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => { setFontOpen((o) => !o); setFontSearch('') }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border border-border-subtle bg-bg-sidebar text-[12px] text-text-main hover:border-primary/40 transition-colors"
            >
              <span className="truncate">{currentFont}</span>
              {fontOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            {fontOpen && (
              <div className="border border-border-subtle rounded-md overflow-hidden">
                <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border-subtle bg-bg-sidebar">
                  <Search size={10} className="text-text-muted" />
                  <input
                    autoFocus
                    value={fontSearch}
                    onChange={(e) => setFontSearch(e.target.value)}
                    placeholder="Search…"
                    className="flex-1 bg-transparent text-[11px] text-text-main placeholder:text-text-muted outline-none"
                  />
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {filteredFonts.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        ensureGoogleFont(f)
                        update({ fontFamily: `'${f}', sans-serif` })
                        setFontOpen(false)
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-1 text-[11px] transition-colors",
                        f === currentFont ? "bg-primary/10 text-primary font-medium" : "text-text-main hover:bg-hover-bg"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <NumberRow label="Size" value={get('fontSize')} unit="px" min={4} max={200}
            onChange={(v) => update({ fontSize: v })} />

          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-text-main">Weight</span>
            <select
              value={get('fontWeight', '400')}
              onChange={(e) => update({ fontWeight: e.target.value })}
              className="w-24 h-6 px-1.5 text-[12px] rounded border border-border-subtle bg-bg-sidebar text-text-main outline-none focus:border-primary/50"
            >
              {FONT_WEIGHTS.map((w) => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </div>

          <NumberRow label="Line height" value={get('lineHeight')} unit="" step={0.05} min={0} max={5}
            onChange={(v) => update({ lineHeight: v })} />
          <NumberRow label="Letter spacing" value={get('letterSpacing')} unit="px" step={0.1} min={-10} max={20}
            onChange={(v) => update({ letterSpacing: v })} />

          <div className="border-t border-border-subtle pt-3 space-y-2">
            <SectionLabel>Style</SectionLabel>
            <ColorRow label="Color" value={get('color', '#000000')}
              onChange={(hex) => update({ color: hex })} />
            <div className="flex items-center gap-1">
              {([
                { val: '700',       icon: Bold,      prop: 'fontWeight'    },
                { val: 'italic',    icon: Italic,    prop: 'fontStyle'     },
                { val: 'underline', icon: Underline, prop: 'textDecoration'},
              ] as const).map(({ val, icon: Icon, prop }) => {
                const active = get(prop) === val
                return (
                  <button
                    key={prop}
                    type="button"
                    onClick={() => update({ [prop]: active ? null : val })}
                    className={cn(
                      "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                      active ? "bg-text-main text-bg-main" : "text-text-muted hover:bg-hover-bg hover:text-text-main"
                    )}
                  >
                    <Icon size={13} />
                  </button>
                )
              })}
              <div className="w-px h-5 bg-border-subtle mx-1" />
              {([
                { val: 'left',    icon: AlignLeft },
                { val: 'center',  icon: AlignCenter },
                { val: 'right',   icon: AlignRight },
                { val: 'justify', icon: AlignJustify },
              ] as const).map(({ val, icon: Icon }) => {
                const active = get('textAlign') === val
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => update({ textAlign: active ? null : val })}
                    className={cn(
                      "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                      active ? "bg-text-main text-bg-main" : "text-text-muted hover:bg-hover-bg hover:text-text-main"
                    )}
                  >
                    <Icon size={13} />
                  </button>
                )
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Background */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Background"
            className="h-8 w-8 flex items-center justify-center rounded-md text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors shrink-0"
          >
            <PaintBucket size={15} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" sideOffset={8} className="w-56 p-3 space-y-2" data-popover-content>
          <SectionLabel>Background</SectionLabel>
          <ColorRow label="Color" value={get('backgroundColor', '#ffffff')}
            onChange={(hex) => update({ backgroundColor: hex })} />
          <button
            type="button"
            onClick={() => update({ backgroundColor: null })}
            className="text-[11px] text-text-muted hover:text-red-500 transition-colors"
          >
            Clear background
          </button>
        </PopoverContent>
      </Popover>

      {/* Border */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Border"
            className="h-8 w-8 flex items-center justify-center rounded-md text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors shrink-0"
          >
            <Square size={15} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" sideOffset={8} className="w-56 p-3 space-y-2" data-popover-content>
          <SectionLabel>Border</SectionLabel>
          <NumberRow label="Radius" value={get('borderRadius')} unit="px" min={0} max={500}
            onChange={(v) => update({ borderRadius: v })} />
          <NumberRow label="Width" value={get('borderWidth')} unit="px" min={0} max={20}
            onChange={(v) => update({ borderWidth: v })} />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-text-main">Style</span>
            <select
              value={get('borderStyle', 'solid')}
              onChange={(e) => update({ borderStyle: e.target.value })}
              className="w-24 h-6 px-1.5 text-[12px] rounded border border-border-subtle bg-bg-sidebar text-text-main outline-none focus:border-primary/50"
            >
              {['none', 'solid', 'dashed', 'dotted', 'double'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <ColorRow label="Color" value={get('borderColor', '#000000')}
            onChange={(hex) => update({ borderColor: hex })} />
        </PopoverContent>
      </Popover>

      {/* Spacing */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Spacing"
            className="h-8 w-8 flex items-center justify-center rounded-md text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors shrink-0"
          >
            <BoxSelect size={15} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" sideOffset={8} className="w-64 p-3 space-y-3" data-popover-content>
          <SectionLabel>Padding</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <NumberRow label="Top" value={get('paddingTop')} unit="px" min={0} max={500}
              onChange={(v) => update({ paddingTop: v })} />
            <NumberRow label="Right" value={get('paddingRight')} unit="px" min={0} max={500}
              onChange={(v) => update({ paddingRight: v })} />
            <NumberRow label="Bottom" value={get('paddingBottom')} unit="px" min={0} max={500}
              onChange={(v) => update({ paddingBottom: v })} />
            <NumberRow label="Left" value={get('paddingLeft')} unit="px" min={0} max={500}
              onChange={(v) => update({ paddingLeft: v })} />
          </div>
          <div className="border-t border-border-subtle pt-3 space-y-2">
            <SectionLabel>Margin</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <NumberRow label="Top" value={get('marginTop')} unit="px" min={-500} max={500}
                onChange={(v) => update({ marginTop: v })} />
              <NumberRow label="Right" value={get('marginRight')} unit="px" min={-500} max={500}
                onChange={(v) => update({ marginRight: v })} />
              <NumberRow label="Bottom" value={get('marginBottom')} unit="px" min={-500} max={500}
                onChange={(v) => update({ marginBottom: v })} />
              <NumberRow label="Left" value={get('marginLeft')} unit="px" min={-500} max={500}
                onChange={(v) => update({ marginLeft: v })} />
            </div>
          </div>
          <div className="border-t border-border-subtle pt-3 space-y-2">
            <SectionLabel>Size</SectionLabel>
            <NumberRow label="Width" value={get('width')} unit="px" min={0} max={3000}
              onChange={(v) => update({ width: v })} />
            <NumberRow label="Height" value={get('height')} unit="px" min={0} max={3000}
              onChange={(v) => update({ height: v })} />
          </div>
        </PopoverContent>
      </Popover>

      {/* Effects */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Effects"
            className="h-8 w-8 flex items-center justify-center rounded-md text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors shrink-0"
          >
            <Sparkles size={15} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" sideOffset={8} className="w-56 p-3 space-y-3" data-popover-content>
          <SectionLabel>Effects</SectionLabel>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-text-main">Opacity</span>
              <span className="text-[11px] text-text-muted font-mono">{Math.round(parseFloat(get('opacity', '1')) * 100)}%</span>
            </div>
            <input
              type="range"
              min={0} max={100} step={1}
              value={Math.round(parseFloat(get('opacity', '1')) * 100)}
              onChange={(e) => update({ opacity: String(parseInt(e.target.value, 10) / 100) })}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <SectionLabel>Shadow</SectionLabel>
            <div className="grid grid-cols-2 gap-1">
              {[
                { label: 'None', val: 'none' },
                { label: 'Sm', val: '0 1px 2px rgba(0,0,0,0.05)' },
                { label: 'Md', val: '0 4px 6px rgba(0,0,0,0.08)' },
                { label: 'Lg', val: '0 10px 15px rgba(0,0,0,0.1)' },
                { label: 'Xl', val: '0 20px 25px rgba(0,0,0,0.12)' },
                { label: '2xl', val: '0 25px 50px rgba(0,0,0,0.18)' },
              ].map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => update({ boxShadow: s.val === 'none' ? null : s.val })}
                  className="px-2 py-1 text-[11px] rounded border border-border-subtle bg-bg-sidebar text-text-main hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-5 bg-border-subtle mx-0.5" />

      <button
        type="button"
        title="Reset all overrides"
        onClick={(e) => { e.stopPropagation(); resetAll() }}
        className="h-8 w-8 flex items-center justify-center rounded-md text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors shrink-0"
      >
        <RotateCcw size={15} />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          // Commit accumulated styles to source on close (do not reset preview)
          if (Object.keys(styles).length > 0) {
            onCommitStyles?.(styles, { tagName })
          }
          onClose()
        }}
        className="h-8 w-8 flex items-center justify-center rounded-md text-text-muted hover:bg-red-500/10 hover:text-red-500 transition-colors shrink-0"
        title="Apply & close"
      >
        <X size={15} />
      </button>
    </div>
  )
}
