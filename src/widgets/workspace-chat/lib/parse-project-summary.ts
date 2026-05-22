// After a project is generated the backend sends a final chat message as a
// strictly-structured markdown string with emoji markers. We detect it by
// content and render it as a rich card instead of a wall of text. The format
// is owned by the backend, so detection/parsing keys off those markers.

export interface ProjectSummaryTable {
  name: string
  fields: string[]
  isAuth: boolean
}

export interface ProjectSummaryDatabase {
  tableCount: number
  authTable?: string
  tables: ProjectSummaryTable[]
  relations: Array<{ from: string; to: string[] }>
  hasMockData: boolean
  mockCount: number
}

export interface ProjectSummary {
  title: string
  subtitle: string
  projectType: 'web' | 'admin_panel' | 'landing'
  stats: {
    files: number
    components: number
    pages: number
    hooks: number
    duration: string
  }
  design?: {
    style: string
    fonts: string
    primaryColor: string
  }
  database?: ProjectSummaryDatabase
  pages: string[]
  techStack: string[]
  roles?: string[]
}

// Detection: backend prefixes the summary with ✅ and always includes a 📊
// stats line. Cheap to evaluate on every message, works mid-stream and after
// reload from DB since it keys off content only.
export const isProjectSummary = (content: string): boolean =>
  !!content && content.trimStart().startsWith('✅') && content.includes('📊')

const parseStats = (line: string): ProjectSummary['stats'] => {
  const files = parseInt(line.match(/(\d+)\s*файлов/)?.[1] ?? '0', 10)
  const components = parseInt(line.match(/(\d+)\s*компонент/)?.[1] ?? '0', 10)
  const pages = parseInt(line.match(/(\d+)\s*(страниц|модул)/)?.[1] ?? '0', 10)
  const hooks = parseInt(line.match(/(\d+)\s*хуков/)?.[1] ?? '0', 10)
  const duration = line.match(/⏱\s*(.+)$/)?.[1]?.trim() ?? ''
  return { files, components, pages, hooks, duration }
}

const parseDesign = (line: string): ProjectSummary['design'] => {
  // "🎨 Дизайн — Warm Professional · Plus Jakarta Sans / Inter · #2563eb"
  const afterDash = line.split('—')[1]?.trim() ?? ''
  const parts = afterDash.split('·').map((s) => s.trim())
  return {
    style: parts[0] ?? '',
    fonts: parts.find((p) => p.includes('/')) ?? parts[1] ?? '',
    primaryColor: parts.find((p) => p.startsWith('#')) ?? '',
  }
}

const parseDatabase = (lines: string[]): ProjectSummaryDatabase => {
  const dbLine = lines.find((l) => l.startsWith('🗄')) ?? ''
  const tableCount = parseInt(dbLine.match(/(\d+)\s*таблиц/)?.[1] ?? '0', 10)
  const authTable = dbLine.match(/авторизация через \*(.+?)\*/)?.[1]

  const tables: ProjectSummaryTable[] = []
  for (const line of lines) {
    if (!line.trimStart().startsWith('•')) continue
    // "• **Categories** — Name, Description, Icon"
    // "• **Users** — авторизация (login, email, password)"
    const name = line.match(/\*\*(.+?)\*\*/)?.[1]
    if (!name) continue
    const isAuth = line.includes('авторизация')
    const afterDash = line.split('—')[1]?.trim() ?? ''
    const fields = isAuth
      ? ['login', 'email', 'password']
      : afterDash.split(',').map((s) => s.trim()).filter(Boolean)
    tables.push({ name, fields, isAuth })
  }

  // "🔗 Courses → Categories, Users · Enrollments → Courses, Users"
  const relLine = lines.find((l) => l.startsWith('🔗'))
  const relations: ProjectSummaryDatabase['relations'] = []
  if (relLine) {
    for (const chunk of relLine.replace('🔗', '').split('·')) {
      const [from, toStr] = chunk.split('→')
      if (from && toStr) {
        relations.push({
          from: from.trim(),
          to: toStr.split(',').map((s) => s.trim()).filter(Boolean),
        })
      }
    }
  }

  const mockLine = lines.find((l) => l.startsWith('📋'))
  const mockCount = parseInt(mockLine?.match(/(\d+)\s*таблиц/)?.[1] ?? '0', 10)

  return { tableCount, authTable, tables, relations, hasMockData: mockCount > 0, mockCount }
}

// Re-emit the parsed summary as clean, structured markdown so it renders with
// the chat's normal markdown typography (headings, lists, inline emphasis)
// instead of a wall of flat emoji lines or a boxed card. `t` is the
// `widgets.workspaceChat.projectSummary` translator.
type Translator = (key: string, values?: Record<string, string | number>) => string

export const formatProjectSummary = (summary: ProjectSummary, t: Translator): string => {
  const { stats, design, database, pages, techStack, roles, projectType } = summary
  const md: string[] = []

  // Header
  const heading = summary.title ? `## ✅ ${summary.title}` : '## ✅'
  md.push(heading)
  if (summary.subtitle) md.push(summary.subtitle)

  // Stats
  const pageLabel = projectType === 'admin_panel' ? t('statModules') : t('statPages')
  const statParts = [
    stats.files ? `${stats.files} ${t('statFiles')}` : '',
    stats.components ? `${stats.components} ${t('statComponents')}` : '',
    stats.pages ? `${stats.pages} ${pageLabel}` : '',
    stats.hooks ? `${stats.hooks} ${t('statHooks')}` : '',
    stats.duration ? `⏱ ${stats.duration}` : '',
  ].filter(Boolean)
  if (statParts.length) md.push(`**📊 ${t('stats')}:** ${statParts.join(' · ')}`)

  // Design
  if (design && (design.style || design.primaryColor)) {
    const designParts = [
      design.style,
      design.fonts,
      design.primaryColor ? `\`${design.primaryColor}\`` : '',
    ].filter(Boolean)
    md.push(`**🎨 ${t('design')}:** ${designParts.join(' · ')}`)
  }

  // Database
  if (database && projectType !== 'landing') {
    const dbHead = [
      database.tableCount ? t('tablesCount', { count: database.tableCount }) : '',
      database.authTable ? `🔑 ${t('auth', { table: database.authTable })}` : '',
    ].filter(Boolean)
    md.push(`**🗄 ${t('database')}:**${dbHead.length ? ` ${dbHead.join(' · ')}` : ''}`)

    if (database.tables.length) {
      md.push(
        database.tables
          .map((table) => `- **${table.name}** — ${table.fields.join(', ')}`)
          .join('\n')
      )
    }

    if (database.relations.length) {
      md.push(`**🔗 ${t('relations')}:**`)
      md.push(
        database.relations.map((rel) => `- ${rel.from} → ${rel.to.join(', ')}`).join('\n')
      )
    }

    if (database.hasMockData) md.push(`✓ ${t('mockData', { count: database.mockCount })}`)
  }

  // Pages
  if (pages.length) {
    const label =
      projectType === 'admin_panel' ? t('modules') : projectType === 'landing' ? t('sections') : t('pages')
    md.push(`**🖥 ${label}** (${pages.length}): ${pages.join(' · ')}`)
  }

  // Footer
  const footer: string[] = []
  if (techStack.length) footer.push(`**⚙️ ${t('tech')}:** ${techStack.join(' · ')}`)
  if (roles?.length) footer.push(`**👥 ${t('roles')}:** ${roles.join(', ')}`)
  if (footer.length) {
    md.push('---')
    md.push(...footer)
  }

  // Blank line between blocks so markdown treats them as separate paragraphs.
  return md.join('\n\n')
}

export const parseProjectSummary = (content: string): ProjectSummary => {
  const lines = content.replace(/\\n/g, '\n').split('\n')

  // Header: "✅ **Learning Center** — сайт готов!"
  const headerLine = lines.find((l) => l.trimStart().startsWith('✅')) ?? lines[0] ?? ''
  const title = headerLine.match(/\*\*(.+?)\*\*/)?.[1] ?? ''
  const subtitle = headerLine.split('—')[1]?.trim().replace(/!+$/, '') ?? ''

  let projectType: ProjectSummary['projectType'] = 'web'
  if (headerLine.includes('сгенерирован')) projectType = 'admin_panel'
  else if (headerLine.includes('лендинг')) projectType = 'landing'

  const stats = parseStats(lines.find((l) => l.startsWith('📊')) ?? '')

  const designLine = lines.find((l) => l.startsWith('🎨'))
  const design = designLine ? parseDesign(designLine) : undefined

  const database = lines.some((l) => l.startsWith('🗄')) ? parseDatabase(lines) : undefined

  // "🖥 **Страницы** (6)\nInstructors · About · Courses"
  const pagesIdx = lines.findIndex((l) => l.startsWith('🖥'))
  const pagesLine = pagesIdx >= 0 ? lines[pagesIdx + 1] ?? '' : ''
  const pages = pagesLine ? pagesLine.split('·').map((s) => s.trim()).filter(Boolean) : []

  // "⚙️ React 18 · TypeScript · Tailwind CSS · Vite"
  const techLine = lines.find((l) => l.startsWith('⚙️')) ?? ''
  const techStack = techLine.replace('⚙️', '').split('·').map((s) => s.trim()).filter(Boolean)

  const rolesLine = lines.find((l) => l.startsWith('👥'))
  const roles = rolesLine
    ? rolesLine.replace(/👥\s*\*\*Роли:?\*\*/, '').replace('👥', '').split(',').map((s) => s.trim()).filter(Boolean)
    : undefined

  return { title, subtitle, projectType, stats, design, database, pages, techStack, roles }
}
