'use client'
import { useState } from 'react'
import { Link } from '@/shared/lib/i18n/navigation'
import { Footer } from '@/widgets/footer'
import { LandingCtaSection } from '@/widgets/landing-page/ui/landing-cta-section'

const FILTERS = ['All', 'SaaS', 'Internal tools', 'Marketing', 'E-commerce', 'HR', 'Finance']

const TEMPLATES = [
  { id: 'crm',       emoji: '📊', title: 'CRM Dashboard',       desc: 'Full pipeline management with deal tracking',         tags: ['SaaS'] },
  { id: 'store',     emoji: '🛒', title: 'Online Store',         desc: 'E-commerce with Stripe checkout & inventory',        tags: ['E-commerce'] },
  { id: 'tracker',   emoji: '📋', title: 'Project Tracker',      desc: 'Kanban boards, sprints & team collaboration',        tags: ['Internal tools'] },
  { id: 'onboard',   emoji: '🎉', title: 'Onboarding Hub',       desc: 'New hire portal with tasks & welcome flows',         tags: ['HR'] },
  { id: 'landing',   emoji: '📣', title: 'Landing Page',         desc: 'High-converting page with A/B form testing',         tags: ['Marketing'] },
  { id: 'booking',   emoji: '📅', title: 'Booking System',       desc: 'Calendar booking with payments & reminders',         tags: ['SaaS'] },
  { id: 'invoice',   emoji: '💰', title: 'Invoice Generator',    desc: 'Auto-generate and send branded invoices',            tags: ['Finance'] },
  { id: 'support',   emoji: '🔔', title: 'Support Portal',       desc: 'Ticket management with SLA tracking',                tags: ['Internal tools'] },
  { id: 'analytics', emoji: '📈', title: 'Analytics Dashboard',  desc: 'Real-time KPI reporting across all your tools',      tags: ['SaaS'] },
  { id: 'survey',    emoji: '🗳️', title: 'Survey Builder',       desc: 'Employee or customer surveys with live results',     tags: ['HR'] },
  { id: 'client',    emoji: '🤝', title: 'Client Portal',        desc: 'Branded portal for project updates & approvals',     tags: ['SaaS'] },
  { id: 'inventory', emoji: '📦', title: 'Inventory Manager',    desc: 'Stock tracking with low-inventory alerts',           tags: ['Internal tools'] },
]

export const TemplatesPublicPage = () => {
  const [activeFilter, setActiveFilter] = useState('All')

  const filtered = activeFilter === 'All'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.tags.includes(activeFilter))

  return (
    <div className="min-h-screen bg-bg-main flex flex-col">

      {/* Inner Hero */}
      <div className="bg-bg-card border-b border-border-subtle px-6 text-center py-20">
        <span className="inline-block bg-bg-main border border-border-subtle rounded-full text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-text-muted px-3 py-1 mb-[18px]">
          Templates
        </span>
        <h1 className="font-extrabold tracking-[-0.04em] leading-[1.1] text-text-main mb-4 max-w-[700px] mx-auto"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}>
          Launch faster with{' '}
          <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">ready-made templates</em>
        </h1>
        <p className="text-[1rem] text-text-muted max-w-[500px] mx-auto leading-[1.7] mb-8">
          100+ production-ready app templates across every category. Clone, customise, and ship in minutes.
        </p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'register' }))}
          className="inline-block bg-primary text-white text-[0.95rem] font-semibold px-7 py-3 rounded-lg hover:opacity-85 transition-all cursor-pointer border-none"
        >
          Use a template free →
        </button>
      </div>

      {/* Content */}
      <section className="px-6 py-16 flex-1">
        <div className="max-w-[1100px] mx-auto">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap mb-9">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`rounded-full px-3.5 py-1.5 text-[0.8rem] font-medium cursor-pointer border transition-all ${
                  activeFilter === f
                    ? 'bg-primary border-primary text-white'
                    : 'bg-bg-main border-border-subtle text-text-muted hover:bg-primary hover:border-primary hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filtered.map((tmpl) => (
              <Link
                key={tmpl.id}
                href={`/templates/${tmpl.id}` as any}
                className="bg-bg-main border border-border-subtle rounded-[10px] overflow-hidden no-underline text-current block transition-all hover:border-border-subtle/60 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="aspect-video flex items-center justify-center text-[2.2rem] bg-hover-bg border-b border-border-subtle">
                  {tmpl.emoji}
                </div>
                <div className="p-3.5">
                  <h4 className="text-[0.85rem] font-bold text-text-main mb-1">{tmpl.title}</h4>
                  <p className="text-[0.76rem] text-text-muted leading-[1.5]">{tmpl.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <div className="bg-bg-card border-t border-border-subtle py-20 px-6 text-center">
        <h2 className="font-extrabold tracking-[-0.04em] text-text-main mb-3"
          style={{ fontSize: 'clamp(1.6rem, 3vw, 2.6rem)' }}>
          Find your template and ship today
        </h2>
        <p className="text-[0.95rem] text-text-muted mb-7">All templates are free to clone on any plan.</p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'register' }))}
          className="inline-block bg-primary text-white text-[0.95rem] font-semibold px-7 py-3 rounded-lg hover:opacity-85 transition-all cursor-pointer border-none"
        >
          Get started →
        </button>
      </div>

      <LandingCtaSection />
      <Footer />
    </div>
  )
}
