'use client'
import { useState } from 'react'
import { Link } from '@/shared/lib/i18n/navigation'
import { Footer } from '@/widgets/footer'
import { ChevronDown } from 'lucide-react'

const RELATED = [
  {
    id: 'asset',
    bg: 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800',
    titleColor: 'text-slate-800 dark:text-slate-100',
    descColor: 'text-slate-500 dark:text-blue-400',
    name: 'AssetWise',
    cat: 'Apps',
    title: 'The only asset tracker\nbuilt for your team',
    desc: 'Track every asset in one place',
    summary: 'Track company equipment, assign assets to team members...',
  },
  {
    id: 'commission',
    bg: 'bg-gradient-to-br from-slate-900 to-blue-900',
    titleColor: 'text-slate-100',
    descColor: 'text-blue-400',
    name: 'CommCalc',
    cat: 'Apps',
    title: 'Stop guessing commissions.\nStart calculating them.',
    desc: 'Real-time commission engine',
    summary: 'Real-time commission engine with complete audit trail...',
  },
  {
    id: 'habits',
    bg: 'bg-gradient-to-br from-amber-950 to-orange-900',
    titleColor: 'text-amber-100',
    descColor: 'text-purple-300',
    name: 'Continuum',
    cat: 'Apps',
    title: 'Build lasting habits,\none day at a time',
    desc: 'Distraction-free habit tracker',
    summary: 'A calm, distraction-free habit tracker...',
  },
]

const FEATURES = [
  'Kanban Pipeline Board',
  'Real-Time Deal Tracking',
  'Contact & Company Records',
  'Activity Timeline',
  'Revenue Forecasting',
  'Email & Calendar Sync',
  'Role-Based Access Control',
  'Custom Fields & Filters',
]

const HIGHLIGHTS = [
  { icon: '⚡', title: 'Visual Pipeline Board', desc: 'Drag-and-drop kanban stages you can fully configure to match your sales process.' },
  { icon: '📊', title: 'Real-Time Analytics', desc: 'Live revenue charts, win-rate tracking, and conversion funnel reports updated automatically.' },
  { icon: '👥', title: 'Contact Management', desc: 'Full CRM with contacts, companies, activity history, and deal associations in one place.' },
  { icon: '⏰', title: 'Smart Automation', desc: 'Trigger workflows automatically on deal stage changes, wins, or stalled pipelines.' },
  { icon: '🔗', title: 'Native Integrations', desc: 'Gmail, Stripe, Slack, Outlook, and 50+ connectors built in — no code needed.' },
]

interface TemplateDetailPageProps {
  id: string
}

export const TemplateDetailPage = ({ id }: TemplateDetailPageProps) => {
  const [activeTab, setActiveTab] = useState<'live' | 'thumb'>('live')
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set())

  const toggleFeature = (f: string) => {
    setExpandedFeatures(prev => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else next.add(f)
      return next
    })
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>

      <div className="max-w-[1200px] mx-auto px-6 pb-20 pt-8">
        <div className="grid gap-0" style={{ gridTemplateColumns: '1fr 400px' }}>

          {/* ═══ LEFT ═══ */}
          <div style={{ paddingRight: '40px' }}>

            {/* Preview frame */}
            <div className="rounded-xl overflow-hidden mb-3"
              style={{ background: '#111', border: '1px solid #2a2a2a' }}>
              {/* Browser bar */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5"
                style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a' }}>
                <div className="flex gap-1.5">
                  <span className="w-[11px] h-[11px] rounded-full bg-[#ff5f57]" />
                  <span className="w-[11px] h-[11px] rounded-full bg-[#febc2e]" />
                  <span className="w-[11px] h-[11px] rounded-full bg-[#28c840]" />
                </div>
                <div className="flex-1 flex items-center gap-1.5 rounded text-[0.72rem] px-3 py-1.5"
                  style={{ background: '#222', border: '1px solid #333', color: '#555' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  your-crm.u-gen.io
                </div>
              </div>

              {/* Fake CRM App */}
              {activeTab === 'live' ? (
                <div className="flex" style={{ background: '#0f1117', minHeight: '360px' }}>
                  {/* Sidebar */}
                  <div className="flex-shrink-0 p-[18px_12px]" style={{ width: '180px', background: '#12141a', borderRight: '1px solid #1e2028' }}>
                    <div className="text-[0.8rem] font-extrabold px-1.5 pb-4 opacity-90" style={{ color: '#fff', letterSpacing: '-0.03em' }}>u&#8209;CRM</div>
                    {['Dashboard', 'Deals', 'Contacts', 'Companies', 'Activities', 'Reports', 'Settings'].map((item, i) => (
                      <div key={item} className="flex items-center gap-2 py-2 px-2.5 rounded mb-0.5 text-[0.72rem] font-medium"
                        style={{
                          background: i === 0 ? 'rgba(255,255,255,0.07)' : 'transparent',
                          color: i === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                        }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'currentColor' }} />
                        {item}
                      </div>
                    ))}
                  </div>
                  {/* Main content */}
                  <div className="flex-1 p-5 overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[0.84rem] font-bold" style={{ color: '#e0e0e0' }}>Sales Pipeline</span>
                      <div className="flex gap-2">
                        <span className="text-[0.67rem] font-semibold px-3 py-1.5 rounded" style={{ background: '#1e2028', border: '1px solid #2a2d38', color: '#777' }}>Export</span>
                        <span className="text-[0.67rem] font-semibold px-3 py-1.5 rounded" style={{ background: '#004eea', color: '#fff' }}>+ Add Deal</span>
                      </div>
                    </div>
                    <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                      {[
                        { lbl: 'Total Revenue', val: '$284K', chg: '↑ 18% this month' },
                        { lbl: 'Open Deals',    val: '47',    chg: '↑ 6 new this week' },
                        { lbl: 'Win Rate',      val: '62%',   chg: '↑ 4% vs last month' },
                        { lbl: 'Avg Deal Size', val: '$6.1K', chg: '↑ 11% vs last month' },
                      ].map(s => (
                        <div key={s.lbl} className="p-3 rounded-lg" style={{ background: '#1a1d24', border: '1px solid #252830' }}>
                          <div className="text-[0.58rem] font-bold uppercase tracking-[0.06em] mb-1" style={{ color: '#555' }}>{s.lbl}</div>
                          <div className="text-[1.05rem] font-extrabold" style={{ color: '#e0e0e0' }}>{s.val}</div>
                          <div className="text-[0.57rem] font-semibold mt-0.5" style={{ color: '#22c55e' }}>{s.chg}</div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg overflow-hidden" style={{ background: '#1a1d24', border: '1px solid #252830' }}>
                      <div className="grid text-[0.6rem] font-bold uppercase tracking-[0.06em] px-3 py-[7px]"
                        style={{ gridTemplateColumns: '2fr 1.2fr 1fr 1fr .8fr', borderBottom: '1px solid #252830', background: '#131519', color: '#4a4d58', gap: '8px' }}>
                        <span>Company</span><span>Contact</span><span>Stage</span><span>Value</span><span>Close</span>
                      </div>
                      {[
                        { co: 'Acme Corp', ct: 'J. Miller', st: 'Won',         stc: '#4ade80', stbg: 'rgba(22,163,74,.15)', val: '$24,000', cl: 'Apr 28' },
                        { co: 'Globex Inc',ct: 'S. Burns',  st: 'Negotiation', stc: '#fbbf24', stbg: 'rgba(234,179,8,.13)', val: '$18,500', cl: 'May 12' },
                        { co: 'Initech LLC',ct:'P. Gibbons', st: 'Proposal',   stc: '#60a5fa', stbg: 'rgba(59,130,246,.15)',val: '$9,200',  cl: 'May 20' },
                        { co: 'Umbrella Co',ct:'A. Wesker',  st: 'Qualified',  stc: '#c084fc', stbg: 'rgba(168,85,247,.15)',val: '$31,000', cl: 'Jun 3' },
                      ].map(r => (
                        <div key={r.co} className="grid px-3 py-2 border-b last:border-b-0 text-[0.67rem] items-center"
                          style={{ gridTemplateColumns: '2fr 1.2fr 1fr 1fr .8fr', borderColor: '#1e2028', color: '#777', gap: '8px' }}>
                          <span className="font-semibold" style={{ color: '#ccc' }}>{r.co}</span>
                          <span>{r.ct}</span>
                          <span>
                            <span className="text-[0.56rem] font-bold px-[7px] py-[2px] rounded-full" style={{ background: r.stbg, color: r.stc }}>{r.st}</span>
                          </span>
                          <span>{r.val}</span>
                          <span>{r.cl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center" style={{ minHeight: '360px', background: 'linear-gradient(135deg, #004eea, #00a8e8)' }}>
                  <div className="text-center text-white/80">
                    <div className="text-4xl mb-3">📊</div>
                    <p className="text-sm font-semibold">CRM Dashboard Preview</p>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail tabs */}
            <div className="flex gap-2.5 mb-8">
              <button
                onClick={() => setActiveTab('live')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[0.75rem] font-semibold cursor-pointer border transition-colors ${
                  activeTab === 'live'
                    ? 'border-white text-white'
                    : 'text-[#777] hover:border-[#444]'
                }`}
                style={{ background: '#111', borderColor: activeTab === 'live' ? '#fff' : '#2a2a2a' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                </svg>
                Live
              </button>
              <button
                onClick={() => setActiveTab('thumb')}
                className="rounded-lg overflow-hidden cursor-pointer border transition-colors"
                style={{
                  background: '#111',
                  borderColor: activeTab === 'thumb' ? '#fff' : '#2a2a2a',
                  width: '100px',
                  height: '62px',
                  backgroundImage: 'linear-gradient(135deg, #004eea, #00a8e8)',
                }}
              />
            </div>

            {/* About content */}
            <div className="rounded-xl p-9" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
              <h2 className="text-[1.35rem] font-bold mb-4" style={{ color: '#e5e5e5', letterSpacing: '-0.02em' }}>About this template</h2>
              <p className="text-[0.875rem] leading-[1.8] mb-3.5" style={{ color: '#888' }}>
                Build a complete sales pipeline without writing a single line of code. Combine intuitive kanban deal tracking with real-time analytics, contact management, and automated workflows — ready to deploy in minutes.
              </p>
              <h3 className="text-[1rem] font-bold mb-3 mt-7" style={{ color: '#e5e5e5' }}>Perfect For</h3>
              <ul className="space-y-2 mb-3.5 pl-0 list-none">
                {[
                  ['Sales Teams', 'Track every deal across every stage with real-time updates'],
                  ['SaaS Startups', 'Monitor trials, expansions, and churned accounts in one view'],
                  ['Consultants', 'Manage multiple client pipelines from a single dashboard'],
                  ['Agencies', 'Track projects and client relationships together'],
                  ['Recruiters', 'Adapt the pipeline for candidate tracking and hiring flows'],
                ].map(([b, t]) => (
                  <li key={b} className="pl-[18px] relative text-[0.875rem] leading-[1.65]" style={{ color: '#888' }}>
                    <span className="absolute left-[5px] font-black" style={{ color: '#555' }}>·</span>
                    <strong style={{ color: '#ccc', fontWeight: 600 }}>{b}</strong>: {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ═══ RIGHT (sticky) ═══ */}
          <div style={{ paddingTop: '0' }}>
            <div className="rounded-xl p-7 sticky" style={{
              top: 'calc(64px + 20px)',
              background: '#111',
              border: '1px solid #1e1e1e',
            }}>
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-[0.72rem] mb-5 flex-wrap" style={{ color: '#555' }}>
                <Link href="/templates" className="no-underline hover:text-[#999] transition-colors" style={{ color: '#555' }}>Templates</Link>
                <span style={{ color: '#3a3a3a' }}>›</span>
                <Link href="/templates" className="no-underline hover:text-[#999] transition-colors" style={{ color: '#555' }}>Apps</Link>
                <span style={{ color: '#3a3a3a' }}>›</span>
                <Link href="/templates" className="no-underline hover:text-[#999] transition-colors" style={{ color: '#555' }}>SaaS</Link>
              </div>

              <h1 className="font-extrabold mb-2.5 leading-[1.08]" style={{ fontSize: '1.7rem', color: '#f0f0f0', letterSpacing: '-0.04em' }}>
                CRM Dashboard —<br />Sales Template
              </h1>
              <p className="text-[0.85rem] mb-3.5" style={{ color: '#666' }}>Full pipeline management system</p>

              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.65rem] flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #004eea, #00a8e8)' }}>🏗</div>
                <span className="text-[0.8rem]" style={{ color: '#666' }}>u&#8209;gen team &nbsp;·&nbsp; 2.4k remixes</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mb-7">
                <button
                  className="flex-1 text-center py-2.5 rounded-lg text-[0.82rem] font-semibold border cursor-pointer transition-all"
                  style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa' }}
                  onMouseOver={e => { (e.target as HTMLElement).style.borderColor = '#444'; (e.target as HTMLElement).style.color = '#e0e0e0' }}
                  onMouseOut={e => { (e.target as HTMLElement).style.borderColor = '#2a2a2a'; (e.target as HTMLElement).style.color = '#aaa' }}
                >
                  Preview
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'register' }))}
                  className="flex-[1.6] text-center py-2.5 rounded-lg text-[0.82rem] font-bold cursor-pointer transition-all border-none"
                  style={{ background: '#e0e0e0', color: '#111' }}
                >
                  Create your own
                </button>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #1e1e1e', margin: '20px 0' }} />

              {/* Key Highlights */}
              <div className="text-[0.95rem] font-bold mb-4" style={{ color: '#e0e0e0' }}>Key Highlights</div>
              <div className="space-y-3 mb-2">
                {HIGHLIGHTS.map((h) => (
                  <div key={h.title} className="flex items-start gap-3">
                    <div className="w-[34px] h-[34px] flex-shrink-0 rounded-lg flex items-center justify-center text-[0.8rem]"
                      style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                      {h.icon}
                    </div>
                    <div>
                      <h4 className="text-[0.82rem] font-bold mb-0.5" style={{ color: '#ccc' }}>{h.title}</h4>
                      <p className="text-[0.74rem] leading-[1.5]" style={{
                        color: '#555',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>{h.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #1e1e1e', margin: '20px 0' }} />

              {/* Features & Capabilities */}
              <div className="text-[0.95rem] font-bold mb-1.5" style={{ color: '#e0e0e0' }}>Features & Capabilities</div>
              <p className="text-[0.75rem] leading-[1.6] mb-3.5" style={{ color: '#555' }}>
                Production-ready features built for exceptional sales team performance
              </p>
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e1e' }}>
                {FEATURES.map((f) => (
                  <div key={f}>
                    <button
                      onClick={() => toggleFeature(f)}
                      className="w-full flex items-center justify-between px-3.5 py-[11px] border-b last:border-b-0 text-left cursor-pointer transition-colors"
                      style={{ borderColor: '#1a1a1a', background: 'transparent' }}
                      onMouseOver={e => (e.currentTarget as HTMLElement).style.background = '#161616'}
                      onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div className="flex items-center gap-2.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span className="text-[0.8rem] font-medium" style={{ color: '#bbb' }}>{f}</span>
                      </div>
                      <ChevronDown
                        size={13}
                        color="#3a3a3a"
                        className={`transition-transform ${expandedFeatures.has(f) ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {expandedFeatures.has(f) && (
                      <div className="px-3.5 pb-3 pt-1 text-[0.74rem] leading-[1.6]" style={{ color: '#555', borderBottom: '1px solid #1a1a1a' }}>
                        Built-in {f.toLowerCase()} capability with full customisation options and real-time sync across your workspace.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related templates */}
      <div className="max-w-[1200px] mx-auto px-6 pb-20">
        <h2 className="font-extrabold mb-6" style={{ fontSize: '1.4rem', color: '#e0e0e0', letterSpacing: '-0.03em' }}>Related Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {RELATED.map((r) => (
            <Link
              key={r.id}
              href={`/templates/${r.id}` as any}
              className="rounded-xl overflow-hidden no-underline block transition-all hover:-translate-y-0.5"
              style={{ background: '#111', border: '1px solid #1e1e1e' }}
            >
              <div className={`aspect-video relative ${r.bg} flex items-end`}>
                <div className="p-5 w-full">
                  <div className={`text-[0.75rem] font-extrabold tracking-[-0.02em] whitespace-pre-line ${r.titleColor}`}>{r.title}</div>
                  <div className={`text-[0.66rem] mt-1 ${r.descColor}`}>{r.desc}</div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3.5" style={{ borderTop: '1px solid #1a1a1a' }}>
                <span className="text-[0.84rem] font-bold" style={{ color: '#ccc' }}>{r.name}</span>
                <span className="text-[0.68rem] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#666' }}>{r.cat}</span>
              </div>
              <div className="px-4 pb-3.5 text-[0.76rem] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: '#555' }}>{r.summary}</div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  )
}
