'use client'
import { Footer } from '@/widgets/footer'
import { useTranslations } from 'next-intl'
// import { LandingCtaSection } from '@/widgets/landing-page/ui/landing-cta-section'

const STEPS = [
  { num: '01', key: 'workspace' },
  { num: '02', key: 'data' },
  { num: '03', key: 'publish' },
]

const GUIDES = [
  { icon: '🗄️', key: 'data' },
  { icon: '🎨', key: 'ui' },
  { icon: '🔌', key: 'connectors' },
  { icon: '🔐', key: 'auth' },
  { icon: '🚀', key: 'publishing' },
  { icon: '📦', key: 'templates' },
]

export const DocsPage = () => {
  const t = useTranslations('widgets.docs')
  return (
    <div className="min-h-screen bg-bg-main flex flex-col">
      {/* Hero */}
      <div className="bg-bg-card border-b border-border-subtle px-6 text-center py-20">
        <span className="inline-block bg-bg-main border border-border-subtle rounded-full text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-text-muted px-3 py-1 mb-[18px]">
          {t('badge')}
        </span>
        <h1
          className="font-extrabold tracking-[-0.04em] leading-[1.1] text-text-main mb-4 max-w-[700px] mx-auto"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
        >
          {t('titleLead')}{' '}
          <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('titleAccent')}
          </em>
        </h1>
        <p className="text-[1rem] text-text-muted max-w-[500px] mx-auto leading-[1.7] mb-8">
          {t('subtitle')}
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a
            href="#quickstart"
            className="inline-block bg-primary text-white text-[0.95rem] font-semibold px-7 py-3 rounded-lg hover:opacity-85 transition-all no-underline"
          >
            {t('quickStart')}
          </a>
          <a
            href="#reference"
            className="inline-block text-[0.95rem] font-semibold px-7 py-3 rounded-lg border border-border-subtle text-text-muted hover:border-border-subtle/60 hover:text-text-main transition-all no-underline"
          >
            {t('apiReference')}
          </a>
        </div>
      </div>

      {/* Getting Started */}
      <section id="quickstart" className="px-6 py-20">
        <div className="max-w-[1100px] mx-auto">
          <span className="inline-block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-text-muted/60 mb-3">
            {t('gettingStarted')}
          </span>
          <h2
            className="font-extrabold tracking-[-0.04em] leading-[1.1] text-text-main mb-12"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}
          >
            {t('stepsLead')}{' '}
            <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('stepsAccent')}
            </em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="bg-bg-card border border-border-subtle rounded-[12px] p-7 relative overflow-hidden"
              >
                <div
                  className="absolute top-3 right-4 font-extrabold tracking-tight text-text-main/5 select-none pointer-events-none"
                  style={{ fontSize: '5rem', lineHeight: 1 }}
                >
                  {step.num}
                </div>
                <div className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-primary mb-4">
                  {t('step')} {step.num}
                </div>
                <h3 className="text-[1rem] font-bold text-text-main mb-2.5">{t(`steps.${step.key}.title`)}</h3>
                <p className="text-[0.85rem] text-text-muted leading-[1.65]">{t(`steps.${step.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guides */}
      <section id="reference" className="bg-bg-card border-t border-border-subtle px-6 py-20">
        <div className="max-w-[1100px] mx-auto">
          <span className="inline-block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-text-muted/60 mb-3">
            {t('guidesEyebrow')}
          </span>
          <h2
            className="font-extrabold tracking-[-0.04em] leading-[1.1] text-text-main mb-12"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}
          >
            {t('guidesLead')}{' '}
            <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('guidesAccent')}
            </em>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {GUIDES.map((guide) => (
              <div
                key={guide.key}
                className="bg-bg-main border border-border-subtle rounded-[10px] p-6 hover:border-border-subtle/60 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-hover-bg border border-border-subtle flex items-center justify-center text-[1.3rem] mb-4">
                  {guide.icon}
                </div>
                <h3 className="text-[0.92rem] font-bold text-text-main mb-2">{t(`guides.${guide.key}.title`)}</h3>
                <p className="text-[0.8rem] text-text-muted leading-[1.6]">{t(`guides.${guide.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* <LandingCtaSection /> */}
      <Footer />
    </div>
  )
}
