'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Footer } from '@/widgets/footer'
import { LandingCtaSection } from '@/widgets/landing-page/ui/landing-cta-section'

type Expert = {
  id: string
  name: string
  avatar: string
  avatarBg: string
  website: string
  rating: number
  services: { name: string; desc: string }[]
  languages: string
  location: string
  budget: string
  rate: string
  serviceTag: string
  budgetTag: string
}

const EXPERTS: Expert[] = [
  {
    id: 'alex',
    name: 'Alex Reeve',
    avatar: '👨‍💻',
    avatarBg: 'linear-gradient(135deg,#004eea,#00a8e8)',
    website: 'alexreeve.dev',
    rating: 4.9,
    services: [
      { name: 'SaaS Platform Development', desc: 'Designs and builds multi-tenant SaaS apps from scratch — auth, billing, admin panels, and role-based access control.' },
      { name: 'Workflow Automation', desc: 'Creates custom automation pipelines connecting databases, third-party APIs, and business logic with trigger-based flows.' },
    ],
    languages: 'English',
    location: '🇬🇧 United Kingdom',
    budget: '$5,000 – $50,000',
    rate: '$120 / hr',
    serviceTag: 'saas',
    budgetTag: 'large',
  },
  {
    id: 'yuki',
    name: 'Yuki Tanaka',
    avatar: '👩‍🎨',
    avatarBg: 'linear-gradient(135deg,#db2777,#f59e0b)',
    website: 'yukitanaka.io',
    rating: 5.0,
    services: [
      { name: 'UI / UX Design', desc: 'Transforms wireframes and ideas into pixel-perfect interfaces with a strong focus on conversion rates and user experience.' },
      { name: 'Mobile-First Apps', desc: 'Builds fully responsive, touch-optimized apps with accessibility best practices and cross-device compatibility.' },
    ],
    languages: 'English, Japanese',
    location: '🇯🇵 Japan',
    budget: '$2,000 – $20,000',
    rate: '$95 / hr',
    serviceTag: 'design',
    budgetTag: 'mid',
  },
  {
    id: 'dmitri',
    name: 'Dmitri Volkov',
    avatar: '🔧',
    avatarBg: 'linear-gradient(135deg,#059669,#0891b2)',
    website: 'dvolkov.dev',
    rating: 4.8,
    services: [
      { name: 'Enterprise Integration', desc: 'Connects u‑gen apps to Salesforce, SAP, and other enterprise platforms via REST, GraphQL, and webhook-based APIs.' },
      { name: 'Custom API Development', desc: 'Architects and builds robust, well-documented APIs tailored to specific business requirements and data flows.' },
    ],
    languages: 'English, German, Russian',
    location: '🇩🇪 Germany',
    budget: '$3,000 – $30,000',
    rate: '$110 / hr',
    serviceTag: 'integration',
    budgetTag: 'large',
  },
  {
    id: 'priya',
    name: 'Priya Sharma',
    avatar: '👩‍💼',
    avatarBg: 'linear-gradient(135deg,#d97706,#dc2626)',
    website: 'priyabuilds.com',
    rating: 4.7,
    services: [
      { name: 'E-commerce Stores', desc: 'Builds high-converting online stores with product management, inventory tracking, cart, and complete checkout flows.' },
      { name: 'Payment Integration', desc: 'Integrates Stripe, PayPal, and local payment gateways with full PCI compliance and subscription billing support.' },
    ],
    languages: 'English, Hindi',
    location: '🇮🇳 India',
    budget: '$2,000 – $15,000',
    rate: '$75 / hr',
    serviceTag: 'ecommerce',
    budgetTag: 'mid',
  },
  {
    id: 'carlos',
    name: 'Carlos Mendez',
    avatar: '🤖',
    avatarBg: 'linear-gradient(135deg,#16a34a,#0891b2)',
    website: 'carlosbuilds.io',
    rating: 4.9,
    services: [
      { name: 'Business Automation', desc: 'Automates repetitive tasks with triggers, cron jobs, and event-driven workflows to save teams hours every week.' },
      { name: 'CRM & Sales Tools', desc: 'Builds custom CRM systems with lead tracking, pipeline management, and detailed reporting for sales teams.' },
    ],
    languages: 'English, Spanish',
    location: '🇲🇽 Mexico',
    budget: '$1,000 – $10,000',
    rate: '$85 / hr',
    serviceTag: 'automation',
    budgetTag: 'mid',
  },
  {
    id: 'sarah',
    name: 'Sarah Chen',
    avatar: '📊',
    avatarBg: 'linear-gradient(135deg,#7c3aed,#004eea)',
    website: 'sarahchen.ca',
    rating: 5.0,
    services: [
      { name: 'Analytics Dashboards', desc: 'Builds real-time BI dashboards with live charts, KPI tracking, and drill-down capabilities for data-driven teams.' },
      { name: 'Data Pipeline Engineering', desc: 'Designs data ingestion and transformation pipelines ensuring clean, reliable data flows for accurate reporting.' },
    ],
    languages: 'English, Mandarin',
    location: '🇨🇦 Canada',
    budget: '$5,000 – $40,000',
    rate: '$130 / hr',
    serviceTag: 'analytics',
    budgetTag: 'large',
  },
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

  const filtered = EXPERTS.filter((e) => {
    const sMatch = !serviceFilter || e.serviceTag === serviceFilter
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
            <a href="#become" className="text-primary font-semibold no-underline hover:underline">
              Apply here →
            </a>
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
              <option value="saas">SaaS Development</option>
              <option value="design">UI / UX Design</option>
              <option value="integration">Integration</option>
              <option value="ecommerce">E-commerce</option>
              <option value="automation">Automation</option>
              <option value="analytics">Analytics</option>
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
                        <div className="flex gap-2.5">
                          <span className="text-[0.74rem] text-text-muted/60">🌐 {expert.website}</span>
                          <span className="text-[0.74rem] text-text-muted/60">in LinkedIn</span>
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
                        href="mailto:hello@u-gen.io"
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
      <section id="become" className="bg-bg-card border-t border-border-subtle px-6 py-20">
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
      </section>

      <LandingCtaSection />
      <Footer />
    </div>
  )
}
