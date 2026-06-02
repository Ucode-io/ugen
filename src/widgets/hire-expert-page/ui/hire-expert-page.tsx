'use client'
import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Footer } from '@/widgets/footer'
import { BecomeExpertModal } from './become-expert-modal'
// import { LandingCtaSection } from '@/widgets/landing-page/ui/landing-cta-section'

type Expert = {
  id: string
  name: string
  avatar: string
  avatarBg: string
  website?: string
  telegram: string
  phone: string
  rating: number
  services: { name: string; desc: string }[]
  languages: string
  location: string
  budget: string
  rate: string
  serviceTags: string[]
  budgetTag: string
}

const EXPERTS: Expert[] = [
  {
    id: 'udevs',
    name: 'Udevs',
    avatar: '💻',
    avatarBg: 'linear-gradient(135deg,#004eea,#00a8e8)',
    website: 'udevs.io',
    telegram: '@udevs_sales',
    phone: '+998336600999',
    rating: 5.0,
    services: [
      { name: 'Backend Development', desc: 'Builds scalable backend systems and microservices in Go, backed by PostgreSQL and MongoDB — clean REST/gRPC APIs, auth, and high-load architecture.' },
      { name: 'Mobile Development', desc: 'Delivers cross-platform mobile apps with Flutter — a single codebase shipping native-grade iOS and Android experiences.' },
    ],
    languages: 'Uzbek, Russian',
    location: '🇺🇿 Uzbekistan',
    budget: '$5,000 – $60,000',
    rate: '$45 / hr',
    serviceTags: ['backend', 'mobile'],
    budgetTag: 'large',
  },
  {
    id: 'dosux',
    name: 'Doston inc',
    avatar: '🎨',
    avatarBg: 'linear-gradient(135deg,#db2777,#f59e0b)',
    telegram: '@doston_inc',
    phone: '+998977026123',
    rating: 4.9,
    services: [
      { name: 'UI / UX Design', desc: 'Crafts product interfaces end to end in Figma — research, wireframes, and pixel-perfect high-fidelity screens focused on usability and conversion.' },
      { name: 'Design Systems & Prototyping', desc: 'Builds reusable component libraries and interactive prototypes that keep design and engineering in sync as products scale.' },
    ],
    languages: 'Uzbek, Russian',
    location: '🇺🇿 Uzbekistan',
    budget: '$2,000 – $20,000',
    rate: '$35 / hr',
    serviceTags: ['design'],
    budgetTag: 'mid',
  },
  {
    id: 'proxima',
    name: 'Proxima',
    avatar: '⚙️',
    avatarBg: 'linear-gradient(135deg,#059669,#0891b2)',
    website: 'proximaops.io',
    telegram: '@jamshidyerzakov',
    phone: '+998901108889',
    rating: 4.8,
    services: [
      { name: 'DevOps & Infrastructure', desc: 'Containerizes and orchestrates workloads with Docker and Kubernetes — automated CI/CD pipelines, zero-downtime deploys, and infrastructure as code.' },
      { name: 'Cloud & Observability', desc: 'Sets up monitoring, logging, and alerting with Prometheus and Grafana so teams catch issues before users do.' },
    ],
    languages: 'Uzbek, Russian, English',
    location: '🇺🇿 Uzbekistan',
    budget: '$4,000 – $40,000',
    rate: '$50 / hr',
    serviceTags: ['devops'],
    budgetTag: 'large',
  },
  // {
  //   id: 'nextify',
  //   name: 'Nextify',
  //   avatar: '🧩',
  //   avatarBg: 'linear-gradient(135deg,#7c3aed,#004eea)',
  //   website: 'nextify.uz',
  //   rating: 4.8,
  //   services: [
  //     { name: 'Frontend Development', desc: 'Ships fast, accessible web apps with React and Next.js — SSR, design-system-driven UI, and Lighthouse-grade performance out of the box.' },
  //     { name: 'Web App Modernization', desc: 'Migrates legacy frontends to modern, type-safe stacks with incremental refactors that never block release.' },
  //   ],
  //   languages: 'Uzbek, Russian, English',
  //   location: '🇺🇿 Uzbekistan',
  //   budget: '$3,000 – $25,000',
  //   rate: '$40 / hr',
  //   serviceTags: ['frontend'],
  //   budgetTag: 'large',
  // },
  // {
  //   id: 'qalab',
  //   name: 'QAlab',
  //   avatar: '🧪',
  //   avatarBg: 'linear-gradient(135deg,#d97706,#dc2626)',
  //   website: 'qalab.uz',
  //   rating: 4.7,
  //   services: [
  //     { name: 'QA & Test Automation', desc: 'Builds end-to-end and regression test suites with Playwright and Cypress, wired into CI to keep every release green.' },
  //     { name: 'Manual & Exploratory Testing', desc: 'Runs structured manual passes and bug triage to catch the edge cases automation misses before they reach production.' },
  //   ],
  //   languages: 'Uzbek, Russian',
  //   location: '🇺🇿 Uzbekistan',
  //   budget: '$1,500 – $15,000',
  //   rate: '$30 / hr',
  //   serviceTags: ['qa'],
  //   budgetTag: 'mid',
  // },
  // {
  //   id: 'dataforge',
  //   name: 'DataForge',
  //   avatar: '📊',
  //   avatarBg: 'linear-gradient(135deg,#16a34a,#0891b2)',
  //   website: 'dataforge.uz',
  //   rating: 4.9,
  //   services: [
  //     { name: 'Data Engineering', desc: 'Designs ingestion and transformation pipelines that turn raw events into clean, query-ready data for analytics and reporting.' },
  //     { name: 'AI & Analytics', desc: 'Builds dashboards, recommendation engines, and LLM-powered features grounded in your own data.' },
  //   ],
  //   languages: 'Uzbek, Russian, English',
  //   location: '🇺🇿 Uzbekistan',
  //   budget: '$5,000 – $50,000',
  //   rate: '$55 / hr',
  //   serviceTags: ['data'],
  //   budgetTag: 'large',
  // },
]

const BECOME_CHECKLIST = [
  'Set your own rates and availability',
  'Access to verified, pre-screened clients',
  'Free certification training & badge',
  'Featured placement in the expert marketplace',
  'Dedicated partner success manager',
]

export const HireExpertPage = () => {
  const [serviceFilter, setServiceFilter] = useState('')
  const [budgetFilter, setBudgetFilter] = useState('')
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [applyOpen, setApplyOpen] = useState(false)

  // TEMP DIAGNOSTIC: what does the CLIENT see in process.env? Only NEXT_PUBLIC_*
  // are inlined at build; server secrets (HIRE_EXPERT_*) are NEVER present here
  // by design. Logged to the browser console. Remove once the apply issue is fixed.
  useEffect(() => {
    console.log('[hire-expert client] process.env on client:', {
      HIRE_EXPERT_TELEGRAM_BOT_TOKEN:
        process.env.HIRE_EXPERT_TELEGRAM_BOT_TOKEN ?? '<undefined on client>',
      HIRE_EXPERT_TELEGRAM_CHAT_ID:
        process.env.HIRE_EXPERT_TELEGRAM_CHAT_ID ?? '<undefined on client>',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ?? '<undefined>',
      nodeEnv: process.env.NODE_ENV,
    })
  }, [])

  const filtered = EXPERTS.filter((e) => {
    const sMatch = !serviceFilter || e.serviceTags.includes(serviceFilter)
    const bMatch = !budgetFilter || e.budgetTag === budgetFilter
    return sMatch && bMatch
  })

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const reset = () => {
    setServiceFilter('')
    setBudgetFilter('')
  }

  return (
    <div className="min-h-screen bg-bg-main flex flex-col">
      {/* Hero */}
      <div className="bg-bg-card border-b border-border-subtle px-6 py-14">
        <div className="max-w-[1100px] mx-auto">
          <h1
            className="font-extrabold tracking-[-0.04em] leading-[1.1] text-text-main mb-3"
            style={{ fontSize: 'clamp(1.9rem, 3.5vw, 2.8rem)' }}
          >
            Hire a{' '}
            <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              u&#8209;gen expert
            </em>
          </h1>
          <p className="text-[0.96rem] text-text-muted max-w-[560px] leading-[1.7] mb-2.5">
            u&#8209;gen Experts provide the expertise and insight to help you build and launch your products faster — from quick consultations to full project delivery.
          </p>
          <p className="text-[0.84rem] text-text-muted/70">
            Want to become a u&#8209;gen Expert?{' '}
            <button
              type="button"
              onClick={() => setApplyOpen(true)}
              className="text-primary font-semibold no-underline hover:underline bg-transparent border-none cursor-pointer p-0"
            >
              Apply here →
            </button>
          </p>
        </div>
      </div>

      {/* Content */}
      <section className="px-6 pb-20 flex-1">
        <div className="max-w-[1100px] mx-auto">
          {/* Filter bar */}
          <div className="flex items-center gap-2.5 py-6 flex-wrap">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="appearance-none bg-bg-main border border-border-subtle rounded-lg px-3 py-2 pr-8 text-[0.82rem] font-medium text-text-muted cursor-pointer outline-none hover:border-border-subtle/60 focus:border-primary transition-colors"
            >
              <option value="">All Services</option>
              <option value="backend">Backend Development</option>
              <option value="mobile">Mobile Development</option>
              <option value="frontend">Frontend Development</option>
              <option value="design">UI / UX Design</option>
              <option value="devops">DevOps</option>
              <option value="qa">QA & Testing</option>
              <option value="data">Data & AI</option>
            </select>
            <select
              value={budgetFilter}
              onChange={(e) => setBudgetFilter(e.target.value)}
              className="appearance-none bg-bg-main border border-border-subtle rounded-lg px-3 py-2 pr-8 text-[0.82rem] font-medium text-text-muted cursor-pointer outline-none hover:border-border-subtle/60 focus:border-primary transition-colors"
            >
              <option value="">Any Budget</option>
              <option value="small">Under $5K</option>
              <option value="mid">$5K – $20K</option>
              <option value="large">$20K+</option>
            </select>
            <button
              onClick={reset}
              className="text-[0.82rem] text-text-muted/60 px-2 py-2 bg-transparent border-none cursor-pointer hover:text-text-main transition-colors"
            >
              Reset all
            </button>
            <span className="ml-auto text-[0.82rem] text-text-muted/60 font-medium">
              {filtered.length} {filtered.length === 1 ? 'Expert' : 'Experts'}
            </span>
          </div>

          {/* Expert grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((expert) => {
                const isExpanded = expandedCards.has(expert.id)
                return (
                  <div
                    key={expert.id}
                    className="bg-bg-card border border-border-subtle rounded-[10px] overflow-hidden flex flex-col hover:border-border-subtle/60 hover:shadow-md transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3.5 p-5 pb-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-[1.5rem] flex-shrink-0"
                        style={{ background: expert.avatarBg }}
                      >
                        {expert.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[0.95rem] font-bold text-text-main mb-1">{expert.name}</h3>
                        <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                          {expert.website && (
                            <a
                              href={`https://${expert.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[0.74rem] text-text-muted/60 no-underline hover:text-text-main transition-colors"
                            >
                              🌐 {expert.website}
                            </a>
                          )}
                          <a
                            href={`https://t.me/${expert.telegram.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[0.74rem] text-text-muted/60 no-underline hover:text-text-main transition-colors"
                          >
                            ✈️ {expert.telegram}
                          </a>
                          <a
                            href={`tel:${expert.phone}`}
                            className="text-[0.74rem] text-text-muted/60 no-underline hover:text-text-main transition-colors"
                          >
                            📞 {expert.phone}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[0.82rem] font-bold text-text-main whitespace-nowrap">
                        <span className="text-amber-400">★</span>
                        {expert.rating.toFixed(1)}
                      </div>
                    </div>

                    <hr className="border-t border-border-subtle m-0" />

                    {/* Services */}
                    <div className="px-5 py-4">
                      <span className="block text-[0.66rem] font-bold uppercase tracking-[0.09em] text-text-muted/60 mb-2.5">
                        Services
                      </span>
                      <div className="mb-2.5">
                        <div className="text-[0.82rem] font-semibold text-text-main mb-0.5">{expert.services[0].name}</div>
                        <div className="text-[0.76rem] text-text-muted leading-[1.55]">{expert.services[0].desc}</div>
                      </div>
                      {isExpanded && expert.services[1] && (
                        <div className="mb-2.5">
                          <div className="text-[0.82rem] font-semibold text-text-main mb-0.5">{expert.services[1].name}</div>
                          <div className="text-[0.76rem] text-text-muted leading-[1.55]">{expert.services[1].desc}</div>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="px-5 py-3.5 border-t border-border-subtle grid grid-cols-2 gap-x-5 gap-y-3">
                      <div>
                        <div className="text-[0.66rem] font-bold uppercase tracking-[0.08em] text-text-muted/60 mb-0.5">Languages</div>
                        <div className="text-[0.8rem] font-medium text-text-main">{expert.languages}</div>
                      </div>
                      <div>
                        <div className="text-[0.66rem] font-bold uppercase tracking-[0.08em] text-text-muted/60 mb-0.5">Location</div>
                        <div className="text-[0.8rem] font-medium text-text-main">{expert.location}</div>
                      </div>
                      <div>
                        <div className="text-[0.66rem] font-bold uppercase tracking-[0.08em] text-text-muted/60 mb-0.5">Budget range</div>
                        <div className="text-[0.8rem] font-medium text-text-main">{expert.budget}</div>
                      </div>
                      <div>
                        <div className="text-[0.66rem] font-bold uppercase tracking-[0.08em] text-text-muted/60 mb-0.5">Hourly rate</div>
                        <div className="text-[0.8rem] font-medium text-primary">{expert.rate}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-5 py-3.5 border-t border-border-subtle flex items-center justify-between mt-auto">
                      <a
                        href={`https://t.me/${expert.telegram.replace(/^@/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary text-white rounded-lg px-4 py-2 text-[0.82rem] font-semibold hover:opacity-80 transition-opacity no-underline"
                      >
                        Contact
                      </a>
                      <button
                        onClick={() => toggleCard(expert.id)}
                        className="flex items-center gap-1 text-[0.78rem] text-text-muted hover:text-text-main bg-transparent border-none cursor-pointer transition-colors"
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-text-muted">
              <div className="text-[2rem] mb-3">🔍</div>
              <p className="font-semibold text-text-main mb-1.5">No experts found</p>
              <p className="text-[0.85rem]">Try adjusting or resetting your filters.</p>
            </div>
          )}
        </div>
      </section>

      {/* Become an Expert */}
      {/* <section id="become" className="bg-bg-card border-t border-border-subtle px-6 py-20">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-14 items-center">
          <div>
            <span className="inline-block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-text-muted/60 mb-3">
              For experts
            </span>
            <h2
              className="font-extrabold tracking-[-0.04em] leading-[1.1] text-text-main mb-5"
              style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}
            >
              Get certified &{' '}
              <br />
              <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                earn on your terms
              </em>
            </h2>
            <p className="text-text-muted leading-[1.8] mb-6">
              Join the u&#8209;gen expert network and get access to a pipeline of high-quality projects from companies around the world.
            </p>
            <ul className="space-y-2.5 mb-7">
              {BECOME_CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[0.88rem] text-text-main">
                  <span className="text-primary mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="mailto:partners@u-gen.io"
              className="inline-block bg-primary text-white text-[0.95rem] font-semibold px-7 py-3 rounded-lg hover:opacity-85 transition-all no-underline"
            >
              Apply to become an expert →
            </a>
          </div>
          <div className="text-[5rem] text-center">🏆</div>
        </div>
      </section> */}

      {/* <LandingCtaSection /> */}
      <Footer />

      <BecomeExpertModal open={applyOpen} onOpenChange={setApplyOpen} />
    </div>
  )
}
