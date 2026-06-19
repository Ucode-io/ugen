// Helpers to manage a self-contained "visual edits" CSS block at the bottom
// of src/index.css. Rules are keyed by selector so repeated edits to the same
// element merge instead of duplicating.

const BLOCK_START = '/* === ugen:visual-edits — auto-managed === */'
const BLOCK_END = '/* === ugen:visual-edits:end === */'

const camelToKebab = (s: string) => s.replace(/([A-Z])/g, '-$1').toLowerCase()

const normalizeStylePatch = (
  styles: Record<string, string | number | null | undefined>,
): Record<string, string | null> => {
  const declarations: Record<string, string | null> = {}
  for (const [key, raw] of Object.entries(styles)) {
    const property = camelToKebab(key)
    declarations[property] = raw == null || raw === '' ? null : String(raw)
  }
  return declarations
}

interface ParsedRule {
  selector: string
  declarations: Record<string, string>
}

const parseBlock = (block: string): ParsedRule[] => {
  const rules: ParsedRule[] = []
  // Naive but adequate parser for the rules we generate ourselves: `selector { decl; ... }`
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = ruleRe.exec(block)) != null) {
    const selector = m[1].trim()
    const body = m[2]
    const declarations: Record<string, string> = {}
    body.split(';').forEach((decl) => {
      const [k, ...rest] = decl.split(':')
      if (!k || rest.length === 0) return
      const key = k.trim()
      const value = rest.join(':').trim()
      if (key && value) declarations[key] = value
    })
    if (selector) rules.push({ selector, declarations })
  }
  return rules
}

const serializeRules = (rules: ParsedRule[]): string => {
  return rules
    .map(({ selector, declarations }) => {
      const decls = Object.entries(declarations)
        .map(([k, v]) => `  ${k}: ${v};`)
        .join('\n')
      return `${selector} {\n${decls}\n}`
    })
    .join('\n\n')
}

export interface VisualEditPatch {
  /** CSS selector to target. Prefer `[data-source-location="..."]`; fall back to domPath. */
  selector: string
  /** Camel-case style keys (matching what ElementStyleToolbar produces) */
  styles: Record<string, string | number | null | undefined>
}

/**
 * Merge a visual-edit patch into the managed block of `src/index.css`.
 * Returns the new file content. If the block doesn't exist, it's appended.
 */
export const applyVisualEditToCss = (cssContent: string, patch: VisualEditPatch): string => {
  const incomingDecls = normalizeStylePatch(patch.styles)
  if (Object.keys(incomingDecls).length === 0) return cssContent

  const startIdx = cssContent.indexOf(BLOCK_START)
  const endIdx = cssContent.indexOf(BLOCK_END)

  let blockBody = ''
  let before = cssContent
  let after = ''

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    before = cssContent.slice(0, startIdx).replace(/\s+$/, '\n\n')
    blockBody = cssContent.slice(startIdx + BLOCK_START.length, endIdx).trim()
    after = cssContent.slice(endIdx + BLOCK_END.length).replace(/^\s+/, '\n')
  } else {
    before = cssContent.replace(/\s+$/, '') + '\n\n'
  }

  const existing = parseBlock(blockBody)
  const idx = existing.findIndex((r) => r.selector === patch.selector)
  if (idx >= 0) {
    const declarations = { ...existing[idx].declarations }
    Object.entries(incomingDecls).forEach(([property, value]) => {
      if (value == null) delete declarations[property]
      else declarations[property] = value
    })
    existing[idx] = {
      selector: patch.selector,
      declarations,
    }
  } else {
    const declarations = Object.fromEntries(
      Object.entries(incomingDecls).filter(([, value]) => value != null),
    ) as Record<string, string>
    if (Object.keys(declarations).length > 0) {
      existing.push({ selector: patch.selector, declarations })
    }
  }

  // Drop declarations whose value is empty (e.g. when the toolbar resets to default)
  existing.forEach((r) => {
    Object.keys(r.declarations).forEach((k) => {
      if (!r.declarations[k]) delete r.declarations[k]
    })
  })
  const filtered = existing.filter((r) => Object.keys(r.declarations).length > 0)

  const body = serializeRules(filtered)
  return `${before}${BLOCK_START}\n${body}\n${BLOCK_END}${after}`
}

/**
 * Try to extract `data-source-location` from outer HTML. Returns the value or null.
 */
export const extractSourceLocation = (outerHTML: string | null | undefined): string | null => {
  if (!outerHTML) return null
  const m = outerHTML.match(/data-source-location\s*=\s*"([^"]+)"/)
  return m?.[1] ?? null
}

/**
 * Build a CSS selector for a visual edit patch. Prefers data-source-location
 * (precise, survives re-renders); falls back to the inspector's domPath.
 */
export const buildSelector = (
  domPath: string | null | undefined,
  outerHTML: string | null | undefined,
): string | null => {
  const sourceLoc = extractSourceLocation(outerHTML)
  if (sourceLoc) return `[data-source-location="${sourceLoc}"]`
  if (domPath) return domPath
  return null
}
