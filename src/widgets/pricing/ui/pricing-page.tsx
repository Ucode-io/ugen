'use client'
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import NumberFlow from '@number-flow/react'
import { useQuery } from '@tanstack/react-query'
import { Footer } from '@/widgets/footer'
import { api } from '@/shared/api'
import { useAuthStore } from '@/entities/session'
import { cn } from '@/shared/lib/utils/cn'
// import { LandingCtaSection } from '@/widgets/landing-page/ui/landing-cta-section'

/* ── Billing data ── */
const PERIODS = [
  { key: 'month',   label: 'Monthly',  save: null,        multiplier: 1,    per: 'per user · billed monthly' },
  { key: '6month',  label: '6 months', save: 'Save 13%', multiplier: 0.87, per: 'per user · billed every 6 months' },
  { key: 'year',    label: 'Annual',   save: 'Save 24%', multiplier: 0.76, per: 'per user · billed annually' },
] as const
type Period = typeof PERIODS[number]['key']

type PlanMeta = {
  key: string
  fareName: string | null
  desc: string
  cta: string
  featured: boolean
  badge?: string
  href?: string
  perFreeText?: string
}

const PLAN_META: PlanMeta[] = [
  {
    key: 'free',
    fareName: 'free',
    desc: 'Perfect for individuals exploring the platform. No credit card required.',
    cta: 'Get started free',
    featured: false,
    perFreeText: 'per user · forever free',
  },
  {
    key: 'basic',
    fareName: 'basic',
    desc: 'For small teams building and shipping real products.',
    cta: 'Start free trial →',
    featured: false,
  },
  {
    key: 'pro',
    fareName: 'pro',
    desc: 'For growing teams with advanced scale and custom requirements.',
    cta: 'Start free trial →',
    featured: true,
    badge: 'Most popular',
  },
  {
    key: 'enterprise',
    fareName: null,
    desc: 'For large organisations requiring custom scale, security, and compliance.',
    cta: 'Contact sales →',
    href: 'https://calendar.app.google/zUXHa2dh3N3Cv2dp6',
    featured: false,
  },
]

const formatFareValue = (value: string | undefined) => {
  if (!value || value === '-1') return 'Unlimited'
  if (value === '0') return '—'
  const num = Number(value)
  if (!isNaN(num)) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }
  return value
}

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
  const [period, setPeriod] = useState<Period>('month')
  const fareId = useAuthStore((state) => state.project?.fare_id)

  const { data: fareData } = useQuery({
    queryKey: ['fares', 'ugen'],
    queryFn: async () => {
      const { data } = await api.get('/v1/fare', { params: { product_type: 'ugen' } })
      return data
    },
  })

  const fares: any[] = fareData?.data?.fares || []

  const featureMap = new Map<
    string,
    { id: string; name: string; type: string; group?: { id: string; name: string } }
  >()
  fares.forEach((fare) => {
    fare.fare_item_prices?.forEach((fip: any) => {
      if (!featureMap.has(fip.fare_item_id)) {
        featureMap.set(fip.fare_item_id, fip.fare_item)
      }
    })
  })
  const featureRows = Array.from(featureMap.values())

  const OTHER_GROUP_KEY = '__other__'
  const groupedFeatureRows: {
    key: string
    name: string
    items: typeof featureRows
  }[] = []
  const groupIndexMap = new Map<string, number>()
  featureRows.forEach((featureItem) => {
    const groupKey = featureItem.group?.id || OTHER_GROUP_KEY
    const groupName = featureItem.group?.name || 'Other'
    let idx = groupIndexMap.get(groupKey)
    if (idx === undefined) {
      idx = groupedFeatureRows.length
      groupIndexMap.set(groupKey, idx)
      groupedFeatureRows.push({ key: groupKey, name: groupName, items: [] })
    }
    groupedFeatureRows[idx].items.push(featureItem)
  })

  const fareValueMap: Record<string, Record<string, string>> = {}
  fares.forEach((fare) => {
    fareValueMap[fare.id] = {}
    fare.fare_item_prices?.forEach((fip: any) => {
      fareValueMap[fare.id][fip.fare_item_id] = fip.value
    })
  })

  const fareByName = new Map<string, any>(
    fares.map((f: any) => [String(f.name || '').toLowerCase(), f]),
  )
  const currentPeriod = PERIODS.find((p) => p.key === period) ?? PERIODS[0]

  const formatPeriodPrice = (monthly: number) =>
    monthly <= 0 ? '$0' : `$${Math.round(monthly * currentPeriod.multiplier)}`

  const buildFeatures = (fare: any | undefined): string[] => {
    if (!fare?.fare_item_prices) return []
    return (fare.fare_item_prices as any[])
      .filter((fip) => fip.value && fip.value !== '0')
      .slice(0, 4)
      .map((fip) => {
        const name = fip.fare_item?.name ?? ''
        return `${formatFareValue(fip.value)} ${name}`.trim()
      })
  }

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
        <div className="bg-hover-bg border-border-subtle inline-flex rounded-full border p-1 shadow-sm">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className="relative px-5 py-1.5 text-[0.8rem] font-medium"
            >
              {period === p.key && (
                <motion.span
                  className="bg-bg-card absolute inset-0 rounded-full shadow-sm"
                  layoutId="period-bg"
                  transition={{ type: 'spring', duration: 0.4 }}
                />
              )}
              <span className={cn(
                'relative z-10 flex items-center gap-1.5 whitespace-nowrap',
                period === p.key ? 'text-text-main font-semibold' : 'text-text-muted',
              )}>
                {p.label}
                {p.save && (
                  <span className="rounded-full bg-green-600 px-1.5 py-0.5 text-[0.6rem] font-bold tracking-[0.02em] text-white">
                    {p.save}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Pricing Cards */}
      <section className="px-6 pt-0 pb-20" style={{ marginTop: '-20px' }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
            {PLAN_META.map((plan) => {
              const fare = plan.fareName ? fareByName.get(plan.fareName) : null
              const isEnterprise = plan.fareName === null
              const isFree = fare ? Number(fare.price) <= 0 : plan.fareName === 'free'

              const displayName = fare?.name ?? plan.key.charAt(0).toUpperCase() + plan.key.slice(1)
              const displayPrice = isEnterprise ? 'Custom' : fare ? formatPeriodPrice(Number(fare.price) || 0) : '--'
              const numericPrice =
                !isEnterprise && fare
                  ? Math.round((Number(fare.price) || 0) * currentPeriod.multiplier)
                  : null
              const displayPer = isEnterprise
                ? 'tailored to your needs'
                : isFree
                  ? (plan.perFreeText ?? 'forever free')
                  : currentPeriod.per
              const features = fare ? buildFeatures(fare) : []
              const featuresDisplay =
                features.length > 0
                  ? features
                  : isEnterprise
                    ? ['Custom Builders', 'Custom credit limit', 'Custom Projects']
                    : []

              return (
                <div
                  key={plan.key}
                  className={cn(
                    'relative flex flex-col overflow-hidden rounded-xl border bg-bg-card transition-all',
                    plan.featured
                      ? 'z-10 scale-[1.03] border-primary shadow-[0_4px_20px_0_rgba(0,0,0,0.1)]'
                      : 'border-border-subtle shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.1)]',
                  )}
                >
                  {/* ── Card Header ── */}
                  <div className={cn('relative border-b border-border-subtle/50 p-5', plan.featured && 'bg-primary/8')}>
                    {plan.featured && plan.badge && (
                      <div className="absolute top-3 right-3 rounded-md bg-primary px-2 py-0.5 text-[0.62rem] font-bold tracking-[0.07em] whitespace-nowrap text-white uppercase">
                        {plan.badge}
                      </div>
                    )}

                    <div className="text-text-main pr-16 font-medium text-base">{displayName}</div>
                    <p className="text-text-muted mt-0.5 text-[0.75rem]">{plan.desc}</p>

                    <div className="mt-5 mb-1 flex items-end gap-1">
                      {numericPrice !== null ? (
                        <NumberFlow
                          value={numericPrice}
                          prefix="$"
                          suffix="/mo"
                          format={{ notation: 'compact' }}
                          className="text-text-main font-extrabold leading-none text-[2.2rem] [&::part(suffix)]:text-text-muted [&::part(suffix)]:text-sm [&::part(suffix)]:font-normal"
                        />
                      ) : (
                        <span className="text-text-main font-extrabold leading-none text-[2.2rem]">
                          {displayPrice}
                        </span>
                      )}
                    </div>
                    <p className="text-text-muted text-[0.7rem]">{displayPer}</p>
                  </div>

                  {/* ── Features ── */}
                  <div className="flex-1 space-y-2.5 px-5 pt-5 pb-6">
                    {featuresDisplay.map((f) => (
                      <div key={f} className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-500" strokeWidth={2.5} />
                        <p className="text-text-muted text-[0.8rem]">{f}</p>
                      </div>
                    ))}
                  </div>

                  {/* ── CTA ── */}
                  <div className="mt-auto border-t border-border-subtle/50 p-3">
                    {plan.href ? (
                      <a
                        href={plan.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'block w-full rounded-lg border py-2 text-center text-[0.82rem] font-semibold no-underline transition-all',
                          !isFree
                            ? 'bg-primary border-primary text-white hover:opacity-85'
                            : 'bg-hover-bg border-border-subtle text-text-muted hover:text-text-main',
                        )}
                      >
                        {plan.cta}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'register' }))}
                        className={cn(
                          'flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border py-2 text-[0.82rem] font-semibold transition-all',
                          isFree
                            ? 'bg-hover-bg border-border-subtle text-text-muted hover:text-text-main'
                            : 'bg-primary border-primary text-white hover:opacity-85',
                        )}
                      >
                        {plan.cta}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Compare table (dynamic from API) */}
          {fares.length > 0 && groupedFeatureRows.length > 0 && (
            <div style={{ marginTop: '72px', overflowX: 'auto' }}>
              <h2 className="font-extrabold tracking-[-0.04em] text-text-main text-center mb-8"
                style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}>
                Compare{' '}
                <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">plans</em>
              </h2>
              <table className="w-full table-fixed border-collapse text-[0.86rem]" style={{ minWidth: '820px' }}>
                <thead>
                  <tr className="border-b-2 border-border-subtle">
                    <th className="w-[16%] py-3 px-3.5 text-left font-semibold text-text-muted text-[0.86rem]">Feature</th>
                    {fares.map((fare) => {
                      const isCurrent = fare.id === fareId
                      const isRecommended = String(fare.name || '').toLowerCase() === 'pro'
                      return (
                        <th
                          key={fare.id}
                          className={`w-[20%] py-3 px-3.5 font-bold relative ${
                            isRecommended
                              ? 'bg-primary/5 text-primary border-x border-x-primary/30 border-t-2 border-t-primary'
                              : isCurrent
                                ? 'text-primary'
                                : 'text-text-main'
                          }`}
                        >
                          <div>{fare.name}{isCurrent && ' ✓'}</div>
                          <div className={`mt-0.5 text-[11px] font-normal normal-case ${isRecommended ? 'text-primary/70' : 'text-text-muted'}`}>
                            {fare.price > 0 ? `$${fare.price}/mo` : 'Free'}
                          </div>
                        </th>
                      )
                    })}
                    <th className="w-[20%] py-3 px-3.5 font-bold relative text-text-main">
                      <div>Enterprise</div>
                      <div className="mt-0.5 text-[11px] font-normal normal-case text-text-muted">Custom</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedFeatureRows.map((group, groupIdx) => {
                    const isLastGroup = groupIdx === groupedFeatureRows.length - 1
                    return (
                      <React.Fragment key={group.key}>
                        <tr className="bg-hover-bg">
                          <td colSpan={fares.length + 2} className="py-2 px-3.5 text-[0.72rem] font-bold uppercase tracking-[0.07em] text-text-muted/60">
                            {group.name}
                          </td>
                        </tr>
                        {group.items.map((featureItem, itemIdx) => {
                          const isLastRow = isLastGroup && itemIdx === group.items.length - 1
                          return (
                            <tr key={featureItem.id} className="border-b border-border-subtle/50">
                              <td className="py-3 px-3.5 text-text-muted">{featureItem.name}</td>
                              {fares.map((fare) => {
                                const isCurrent = fare.id === fareId
                                const isRecommended = String(fare.name || '').toLowerCase() === 'pro'
                                const rawValue = fareValueMap[fare.id]?.[featureItem.id]
                                const displayValue = formatFareValue(rawValue)
                                return (
                                  <td
                                    key={fare.id}
                                    className={`py-3 px-3.5 text-center ${
                                      isRecommended
                                        ? `bg-primary/5 text-primary font-semibold border-x border-x-primary/30 ${
                                            isLastRow ? 'border-b-2 border-b-primary' : ''
                                          }`
                                        : isCurrent
                                          ? 'text-primary font-semibold'
                                          : 'text-text-muted'
                                    }`}
                                  >
                                    {displayValue}
                                  </td>
                                )
                              })}
                              <td className="py-3 px-3.5 text-center text-text-muted">Custom</td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

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

      {/* <LandingCtaSection /> */}
      <Footer />
    </div>
  )
}
