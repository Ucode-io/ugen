import { Layers } from 'lucide-react'
import type { ReactNode } from 'react'

export type Template = {
  id: string
  bg: string
  link: string
  request: string
  content: ReactNode
}

export const TEMPLATES: Template[] = [
  {
    id: 'lovable_slides',
    bg: 'bg-gradient-to-br from-[#E066FF] via-[#FF66B2] to-[#FF9966] text-white',
    link: 'https://stark-architect-showcase.lovable.app/',
    request: 'Create a demo-ready interactive presentation builder called LovableSlides. Include a slide editor, theme picker, code-powered animations, speaker notes, and a polished shareable presentation preview.',
    content: (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-10 h-10 rounded-xl bg-white/20 mb-4 flex items-center justify-center backdrop-blur-sm">
          <Layers className="text-white" size={20} />
        </div>
        <h3 className="text-2xl font-bold mb-2 tracking-tight">LovableSlides</h3>
        <p className="text-xs opacity-90 max-w-[200px] leading-tight">Build stunning, interactive presentations with the power of code</p>
      </div>
    )
  },
  {
    id: 'architect_portfolio',
    bg: 'bg-zinc-200 dark:bg-zinc-800 relative',
    link: 'https://stark-architect-showcase.lovable.app/',
    request: 'Create a demo-ready minimal architecture portfolio website. Include a dramatic project gallery, studio profile, services, featured case studies, awards, contact form, and an elegant responsive visual style.',
    content: (
      <div className="flex flex-col h-full relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center brightness-50 dark:brightness-40"></div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 text-center text-white">
          <h3 className="text-2xl font-light tracking-widest uppercase mb-2">Minimal</h3>
          <h3 className="text-3xl font-medium tracking-wider uppercase">Architecture</h3>
        </div>
      </div>
    )
  },
  {
    id: 'ecommerce_store',
    bg: 'bg-[#FDFBF7] dark:bg-zinc-900 border border-border-subtle overflow-hidden',
    link: 'https://stark-architect-showcase.lovable.app/',
    request: 'Create a demo-ready premium ecommerce storefront called Linea. Include product listing, product detail, cart, checkout summary, filters, featured collection, customer reviews, and responsive shopping flows.',
    content: (
      <div className="flex flex-col h-full relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center"></div>
        <div className="absolute top-4 left-0 right-0 flex justify-center z-10">
          <span className="bg-white/90 dark:bg-black/90 px-4 py-1 text-xs font-bold tracking-widest uppercase">Linea</span>
        </div>
      </div>
    )
  },
  {
    id: 'event_platform',
    bg: 'bg-white dark:bg-black border border-border-subtle',
    link: 'https://stark-architect-showcase.lovable.app/',
    request: 'Create a demo-ready event discovery platform. Include event search, category filters, event cards, detailed event pages, registration flow, host dashboard preview, attendee list, and a bold modern visual style.',
    content: (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center relative overflow-hidden">
        <div className="absolute top-4 right-4 w-12 h-12 rounded-full border border-pink-500 flex items-center justify-center rotate-12">
          <span className="text-[8px] font-bold text-pink-500 uppercase tracking-tighter text-center leading-none">Special<br />Event</span>
        </div>
        <div className="inline-flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-black text-black dark:text-white tracking-tight border-2 border-black dark:border-white px-3 py-1 bg-white dark:bg-black">Discover</span>
            <span className="text-2xl font-black text-black dark:text-white tracking-tight px-3 py-1 bg-[#f472b6] rounded-full">events</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-black dark:text-white tracking-tight">near</span>
            <span className="text-2xl font-black text-black dark:text-white tracking-tight border-b-4 border-black dark:border-white px-1">you</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'lifestyle_blog',
    bg: 'bg-[#EFECE8] dark:bg-zinc-800 border border-border-subtle',
    link: 'https://stark-architect-showcase.lovable.app/',
    request: 'Create a demo-ready sophisticated lifestyle blog called Nexus. Include featured articles, category navigation, author profiles, newsletter signup, article detail pages, reading lists, and editorial imagery.',
    content: (
      <div className="flex flex-col h-full p-6 relative">
        <div className="flex justify-between items-center mb-6">
          <span className="font-bold text-xs uppercase tracking-wider text-black dark:text-white">Nexus</span>
          <div className="flex gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-black/50 dark:bg-white/50"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-black/50 dark:bg-white/50"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-black/50 dark:bg-white/50"></div>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="w-24 h-24 rounded bg-[url('https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center shrink-0"></div>
          <div>
            <h4 className="font-bold text-lg leading-tight mb-2 text-black dark:text-white">Featured Article Title — Hero Content</h4>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Read More →</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'visual_landing',
    bg: 'bg-zinc-900 border border-border-subtle relative overflow-hidden',
    link: 'https://stark-architect-showcase.lovable.app/',
    request: 'Create a demo-ready visual landing page for an AI film production company. Include a cinematic hero, project showcase, service sections, process timeline, testimonials, pricing teaser, and contact CTA.',
    content: (
      <div className="flex flex-col h-full">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center brightness-75"></div>
        <div className="relative z-10 flex flex-col justify-end h-full p-6 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
          <h3 className="text-2xl font-bold text-white leading-tight mb-1">AI FILM<br />PRODUCTION<br />WITHOUT LIMITS</h3>
        </div>
      </div>
    )
  }
]

export const getTemplateById = (id: string | null | undefined) => {
  if (!id) return null
  return TEMPLATES.find((template) => template.id === id) ?? null
}
