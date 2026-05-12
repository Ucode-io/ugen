'use client'
import { useState } from 'react'
import { Check } from 'lucide-react'
import { Footer } from '@/widgets/footer'
import { LandingCtaSection } from '@/widgets/landing-page/ui/landing-cta-section'

/* ── Billing data ── */
const PERIODS = [
  { key: 'year',    label: 'Annual',   save: 'Save 24%' },
  { key: '6month',  label: '6 months', save: 'Save 13%' },
  { key: 'month',   label: 'Monthly',  save: null },
] as const
type Period = typeof PERIODS[number]['key']

const PRICES: Record<Period, { starter: string; pro: string; per: string }> = {
  year:   { starter: '$48', pro: '$74', per: 'per user · billed annually' },
  '6month': { starter: '$55', pro: '$85', per: 'per user · billed every 6 months' },
  month:  { starter: '$63', pro: '$98', per: 'per user · billed monthly' },
}

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: () => '$0',
    per: 'per user · forever free',
    desc: 'Perfect for individuals exploring the platform. No credit card required.',
    features: ['1 Builder', '50K credit limit / month', '1 Project'],
    cta: 'Get started free',
    featured: false,
  },
  {
    key: 'starter',
    name: 'Starter',
    price: (p: Period) => PRICES[p].starter,
    per: (p: Period) => PRICES[p].per,
    desc: 'For small teams building and shipping real products.',
    features: ['2 Builders', '500K credit limit / month', '5 Projects'],
    cta: 'Start free trial →',
    featured: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: (p: Period) => PRICES[p].pro,
    per: (p: Period) => PRICES[p].per,
    desc: 'For growing teams with advanced scale and custom requirements.',
    features: ['5 Builders', '1M credit limit / month', '10 Projects'],
    cta: 'Start free trial →',
    featured: true,
    badge: 'Most popular',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: () => 'Custom',
    per: 'tailored to your needs',
    desc: 'For large organisations requiring custom scale, security, and compliance.',
    features: ['Custom Builders', 'Custom credit limit', 'Custom Projects'],
    cta: 'Contact sales →',
    href: 'mailto:enterprise@u-code.io',
    featured: false,
  },
]

/* ── Compare table ── */
type TableRow = { label: string; free: string; starter: string; pro: string; ent: string; cls?: string }
const TABLE_SECTIONS: { heading: string; rows: TableRow[] }[] = [
  {
    heading: 'Pricing (per user / month)',
    rows: [
      { label: 'Annual',   free: '$0', starter: '$48', pro: '$74', ent: 'Custom', cls: 'custom' },
      { label: '6 months', free: '$0', starter: '$55', pro: '$85', ent: 'Custom', cls: 'custom' },
      { label: 'Monthly',  free: '$0', starter: '$63', pro: '$98', ent: 'Custom', cls: 'custom' },
    ],
  },
  {
    heading: 'Workspace',
    rows: [
      { label: 'Builders',            free: '1',   starter: '2',     pro: '5',     ent: 'Custom' },
      { label: 'Projects',            free: '1',   starter: '5',     pro: '10',    ent: 'Custom' },
      { label: 'Users',               free: '—',   starter: '1,000', pro: '10,000',ent: 'Custom' },
      { label: 'Credit limit / month',free: '50K', starter: '500K',  pro: '1M',    ent: 'Custom' },
    ],
  },
  {
    heading: 'API',
    rows: [
      { label: 'Requests / month',  free: '100K', starter: '250K', pro: '500K', ent: 'Custom' },
      { label: 'Requests / second', free: '100',  starter: '200',  pro: '500',  ent: 'Custom' },
    ],
  },
  {
    heading: 'Infrastructure',
    rows: [
      { label: 'Server Functions', free: '1',    starter: '10',   pro: '20',   ent: 'Custom' },
      { label: 'Microfrontends',   free: '1',    starter: '5',    pro: '10',   ent: 'Custom' },
      { label: 'Database size',    free: '10 GB',starter: '50 GB',pro: '100 GB',ent: 'Custom' },
      { label: 'File storage',     free: '10 GB',starter: '50 GB',pro: '100 GB',ent: 'Custom' },
    ],
  },
]

/* ── FAQ ── */
const FAQ = [
  { q: 'Can I switch plans anytime?', a: 'Yes. Upgrade or downgrade at any time. Upgrades take effect immediately; downgrades apply at the end of your billing period.' },
  { q: 'Can I change my billing period?', a: 'Yes — you can switch between monthly, 6-month, and annual billing at renewal. Switching to annual applies immediately and you\'re credited for any unused time.' },
  { q: 'Do you offer a free trial on paid plans?', a: 'Starter and Pro plans come with a 14-day free trial — no credit card required. Cancel anytime.' },
  { q: 'What happens when I exceed my limits?', a: 'API requests over limit are charged at $0.001 per request. API requests over the per-second limit are blocked. Extra server functions and microfrontends are $10 and $20 each. Storage overages are $10 per 10 GB.' },
  { q: 'What happens to my apps if I downgrade?', a: 'Your apps remain intact but may become read-only if you exceed the free plan limits. You have 30 days to export your data or upgrade again.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards (Visa, Mastercard, Amex) and wire transfers for annual enterprise contracts.' },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-border-subtle last:border-b last:border-border-subtle">
      <button
        className="w-full flex justify-between items-center py-[17px] text-left font-semibold text-[0.9rem] text-text-main cursor-pointer bg-transparent border-none"
        onClick={() => setOpen(!open)}
      >
        {q}
        <span className="text-[1.1rem] text-text-muted font-normal flex-shrink-0 ml-4">
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <p className="pb-4 text-[0.875rem] text-text-muted leading-[1.75]">{a}</p>
      )}
    </div>
  )
}

export const PricingPage = () => {
  const [period, setPeriod] = useState<Period>('year')

  const getPrice = (plan: typeof PLANS[number]) =>
    (plan.price as (p?: Period) => string)(period)
  const getPer = (plan: typeof PLANS[number]) =>
    typeof plan.per === 'string' ? plan.per : (plan.per as (p: Period) => string)(period)

  return (
    <div className="min-h-screen bg-bg-main flex flex-col">

      {/* Inner Hero */}
      <div className="bg-bg-card border-b border-border-subtle px-6 text-center"
        style={{ paddingTop: '80px', paddingBottom: '52px' }}>
        <span className="inline-block bg-bg-main border border-border-subtle rounded-full text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-text-muted px-3 py-1 mb-[18px]">
          Pricing
        </span>
        <h1 className="font-extrabold tracking-[-0.04em] leading-[1.1] text-text-main mb-4 max-w-[700px] mx-auto"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}>
          Simple, transparent{' '}
          <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">pricing</em>
        </h1>
        <p className="text-[1rem] text-text-muted max-w-[500px] mx-auto leading-[1.7] mb-7">
          Start for free and scale as you grow. Per-user pricing — pay only for what you use.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex bg-hover-bg border border-border-subtle rounded-[10px] p-1 gap-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`flex items-center gap-1.5 rounded-lg px-5 py-2 text-[0.82rem] font-medium cursor-pointer border-none transition-all whitespace-nowrap ${
                period === p.key
                  ? 'bg-bg-card text-text-main font-semibold shadow-sm'
                  : 'bg-transparent text-text-muted hover:text-text-main'
              }`}
            >
              {p.label}
              {p.save && (
                <span className="bg-green-600 text-white text-[0.62rem] font-bold px-1.5 py-0.5 rounded-full tracking-[0.02em]">
                  {p.save}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing Cards */}
      <section className="px-6 pt-0 pb-20" style={{ marginTop: '-20px' }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`bg-bg-main border rounded-[10px] p-8 relative transition-all hover:shadow-md ${
                  plan.featured
                    ? 'border-primary shadow-md'
                    : 'border-border-subtle hover:border-border-subtle/60'
                }`}
              >
                {plan.featured && plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[0.66rem] font-bold uppercase tracking-[0.07em] px-3 py-1 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}
                <div className="text-[0.8rem] font-semibold text-text-muted uppercase tracking-[0.06em] mb-[7px]">
                  {plan.name}
                </div>
                <div className="font-black tracking-[-0.05em] text-text-main mb-1"
                  style={{ fontSize: plan.key === 'enterprise' ? '2rem' : '2.8rem', lineHeight: 1 }}>
                  {getPrice(plan)}
                  {plan.key !== 'enterprise' && (
                    <span className="text-[0.9rem] font-normal text-text-muted">/mo</span>
                  )}
                </div>
                <p className="text-[0.72rem] text-text-muted mb-1">{getPer(plan)}</p>
                <p className="text-[0.82rem] text-text-muted leading-[1.6] mb-5 mt-3">{plan.desc}</p>
                <hr className="border-t border-border-subtle mb-5" />
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[0.83rem] text-text-muted">
                      <Check size={14} className="text-green-500 flex-shrink-0 mt-0.5" strokeWidth={3} />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.href ? (
                  <a
                    href={plan.href}
                    className={`block w-full text-center py-2.5 rounded-lg text-[0.85rem] font-semibold transition-all border no-underline ${
                      plan.featured
                        ? 'bg-primary border-primary text-white hover:opacity-85'
                        : 'bg-hover-bg border-border-subtle text-text-muted hover:border-border-subtle/60 hover:text-text-main'
                    }`}
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'register' }))}
                    className={`w-full py-2.5 rounded-lg text-[0.85rem] font-semibold cursor-pointer transition-all border ${
                      plan.featured
                        ? 'bg-primary border-primary text-white hover:opacity-85'
                        : 'bg-hover-bg border-border-subtle text-text-muted hover:border-border-subtle/60 hover:text-text-main'
                    }`}
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Compare table */}
          <div style={{ marginTop: '72px', overflowX: 'auto' }}>
            <h2 className="font-extrabold tracking-[-0.04em] text-text-main text-center mb-8"
              style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}>
              Compare{' '}
              <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">plans</em>
            </h2>
            <table className="w-full border-collapse text-[0.86rem]" style={{ minWidth: '600px' }}>
              <thead>
                <tr className="border-b-2 border-border-subtle">
                  <th className="py-3 px-3.5 text-left font-semibold text-text-muted text-[0.86rem]">Feature</th>
                  {['Free', 'Starter', 'Pro', 'Enterprise', 'Overlimit'].map((h) => (
                    <th key={h} className={`py-3 px-3.5 font-bold text-text-main ${h === 'Pro' ? 'text-primary' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_SECTIONS.map((sec) => (
                  <>
                    <tr key={sec.heading} className="bg-hover-bg">
                      <td colSpan={6} className="py-2 px-3.5 text-[0.72rem] font-bold uppercase tracking-[0.07em] text-text-muted/60">
                        {sec.heading}
                      </td>
                    </tr>
                    {sec.rows.map((row) => (
                      <tr key={row.label} className="border-b border-border-subtle/50">
                        <td className="py-3 px-3.5 text-text-muted">{row.label}</td>
                        <td className="py-3 px-3.5 text-center text-text-muted">{row.free}</td>
                        <td className="py-3 px-3.5 text-center text-text-muted">{row.starter}</td>
                        <td className={`py-3 px-3.5 text-center font-bold ${row.cls === 'custom' ? 'text-primary' : 'text-text-main'}`}>{row.pro}</td>
                        <td className={`py-3 px-3.5 text-center ${row.cls === 'custom' ? 'text-primary font-semibold' : 'text-text-muted'}`}>{row.ent}</td>
                        <td className="py-3 px-3.5 text-center text-text-muted/60 text-[0.78rem] italic">—</td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* FAQ */}
          <div style={{ marginTop: '72px', maxWidth: '680px', marginLeft: 'auto', marginRight: 'auto' }}>
            <h2 className="font-extrabold tracking-[-0.04em] text-text-main text-center mb-8"
              style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}>
              Frequently asked{' '}
              <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">questions</em>
            </h2>
            {FAQ.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <div className="bg-bg-card border-t border-b border-border-subtle py-20 px-6 text-center">
        <h2 className="font-extrabold tracking-[-0.04em] text-text-main mb-3"
          style={{ fontSize: 'clamp(1.6rem, 3vw, 2.6rem)' }}>
          Start building for free
        </h2>
        <p className="text-[0.95rem] text-text-muted mb-7">No credit card. No engineers needed. Just you and your ideas.</p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'register' }))}
          className="inline-block bg-primary text-white text-[0.95rem] font-semibold px-7 py-3 rounded-lg hover:opacity-85 transition-all cursor-pointer border-none"
        >
          Create free account →
        </button>
      </div>

      <LandingCtaSection />
      <Footer />
    </div>
  )
}
