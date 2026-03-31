import React from 'react'
import { Link } from '@/shared/lib/i18n/navigation'
import { Check, CheckCircle2, Database, Rocket, Server, Smartphone, Globe, Code, Key, Box, ShieldCheck, Cpu, HardDrive, Filter, Workflow, Layers } from 'lucide-react'
import { Button } from '@/shared/ui'
import { StartProjectButton } from './start-project-button'
import { Footer } from '@/widgets/footer'
import { getTranslations } from 'next-intl/server'

const HeroSection = async () => {
  const t = await getTranslations('widgets.landingPage')
  
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex flex-col items-center justify-center text-center px-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-bg-main to-bg-main"></div>
      
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-8 border border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Cpu size={14} className="animate-pulse" />
        <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{t('aiBasedPlatform')}</span>
      </div>

      <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-text-main mb-6 max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 whitespace-pre-line">
        {t('heroTitle')}
      </h1>
      
      <p className="text-lg lg:text-xl text-text-muted max-w-2xl mb-10 text-balance animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
        {t('heroSubtitle')}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
        <StartProjectButton />
      </div>
    </section>
  )
}

const DatabasesSection = async () => {
  const t = await getTranslations('widgets.landingPage.databases')
  
  return (
    <section id="databases" className="py-24 bg-bg-card scroll-mt-16">
      <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Database className="text-primary" size={24} />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-text-main mb-4">
              {t('title')}
            </h2>
            <p className="text-lg text-text-muted mb-6">
              {t('description')}
            </p>
            <ul className="space-y-4">
              {[
                t('list.manageData'),
                t('list.scalable'),
                t('list.lowcode')
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="text-primary flex-shrink-0" size={20} />
                  <span className="text-text-main font-medium">{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 to-accent/10 rounded-3xl blur-2xl -z-10"></div>
            <div className="ai-card p-8 flex flex-col gap-4 border border-border-subtle/40 shadow-xl shadow-primary/[0.02]">
              <div className="bg-bg-main border border-border-subtle/60 rounded-xl p-5 flex items-center justify-between shadow-sm transition-all hover:border-primary/30 hover:shadow-primary/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#336791]/10 flex items-center justify-center border border-[#336791]/20">
                    <Database className="text-[#336791]" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-text-main text-base">{t('postgresql')}</h3>
                    <p className="text-xs text-text-muted mt-0.5">{t('relational')}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md uppercase tracking-wider">{t('ready')}</span>
              </div>
              <div className="bg-bg-main border border-border-subtle/60 rounded-xl p-5 flex items-center justify-between shadow-sm transition-all hover:border-green-500/30 hover:shadow-green-500/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#47A248]/10 flex items-center justify-center border border-[#47A248]/20">
                    <Database className="text-[#47A248]" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-text-main text-base">{t('mongodb')}</h3>
                    <p className="text-xs text-text-muted mt-0.5">{t('document')}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md uppercase tracking-wider">{t('ready')}</span>
              </div>
              <div className="bg-bg-main border border-border-subtle/60 rounded-xl p-5 flex items-center justify-between shadow-sm transition-all hover:border-yellow-500/30 hover:shadow-yellow-500/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                    <Database className="text-yellow-500" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-text-main text-base">{t('clickhouse')}</h3>
                    <p className="text-xs text-text-muted mt-0.5">{t('analytics')}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md uppercase tracking-wider">{t('ready')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const EdgeFunctionsSection = async () => {
  const t = await getTranslations('widgets.landingPage.edgeFunctions')
  
  return (
    <section id="edge-functions" className="py-24 bg-bg-sidebar/30 border-y border-border-subtle/40 scroll-mt-16">
      <div className="container mx-auto px-6 lg:px-8 max-w-7xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 mx-auto">
          <Code className="text-accent" size={24} />
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-text-main mb-4">
          {t('title')}
        </h2>
        <p className="text-lg text-text-muted mb-6 max-w-2xl mx-auto">
          {t('description')}
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 text-left">
          {[
            { title: t('platforms.mobile'), desc: 'Flutter, Android, SWIFT, Dart', icon: Smartphone },
            { title: t('platforms.web'), desc: 'React JS, Vue JS, Angular, JS', icon: Globe },
            { title: t('platforms.backend'), desc: 'Go, Java, C++, C, Php, Python', icon: Server },
            { title: t('platforms.microfrontend'), desc: 'Angular, React.JS, Vue.JS', icon: Layers }
          ].map((platform, i) => (
            <div key={i} className="ai-card p-6 border-border-subtle hover:border-primary/30 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-bg-main flex items-center justify-center border border-border-subtle mb-4 shadow-sm">
                <platform.icon size={20} className="text-text-main" />
              </div>
              <h3 className="font-bold text-text-main text-lg mb-2">{platform.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed select-all">{platform.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const FeaturesGrid = async () => {
  const t = await getTranslations('widgets.landingPage.features')
  
  const features = [
    { title: t('list.storage.title'), desc: t('list.storage.description'), icon: HardDrive },
    { title: t('list.dataApi.title'), desc: t('list.dataApi.description'), icon: Workflow },
    { title: t('list.auth.title'), desc: t('list.auth.description'), icon: Key },
    { title: t('list.role.title'), desc: t('list.role.description'), icon: ShieldCheck },
  ]

  return (
    <section id="features" className="py-24 bg-bg-card scroll-mt-16">
      <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-text-main mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-text-muted">{t('subtitle')}</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="ai-card p-8 flex gap-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-bg-sidebar flex items-center justify-center border border-border-subtle shrink-0">
                <feature.icon size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-text-main text-xl mb-2">{feature.title}</h3>
                <p className="text-text-muted leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const IntegrationsSection = async () => {
  const t = await getTranslations('widgets.landingPage.integrations')
  
  const integrationCategories = [
    { name: t('categories.databases'), items: 'MongoDB, PostgreSQL, ClickHouse' },
    { name: t('categories.storage'), items: 'Minio, Amazon S3, R3' },
    { name: t('categories.apis'), items: 'SMS, Rest API, Mail' },
    { name: t('categories.versionControl'), items: 'Github, Gitlab, Bitbucket' },
    { name: t('categories.maps'), items: 'Yandex maps, Google maps, Mapbox' },
    { name: t('categories.customFunctions'), items: 'Go, Node Js, Java, JS, C++, C, Php, Python' }
  ]

  return (
    <section id="integrations" className="py-24 bg-bg-card border-y border-border-subtle/40 scroll-mt-16">
      <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Box className="text-primary" size={24} />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-text-main mb-4">
              {t('title')}
            </h2>
            <p className="text-lg text-text-muted">{t('description')}</p>
          </div>
          <Button variant="outline" className="rounded-xl px-6 h-12 font-semibold">
            {t('viewAll')}
          </Button>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrationCategories.map((cat, i) => (
            <div key={i} className="bg-bg-card border border-border-subtle p-6 rounded-2xl shadow-sm hover:border-primary/20 transition-colors">
              <h3 className="text-text-main font-bold mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary/60"></div>
                {cat.name}
              </h3>
              <p className="text-text-muted text-sm leading-relaxed">{cat.items}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export const LandingPage = () => {
  return (
    <main className="flex flex-col min-h-screen bg-bg-main antialiased selection:bg-primary/20 selection:text-primary">
      <HeroSection />
      <DatabasesSection />
      <EdgeFunctionsSection />
      <FeaturesGrid />
      <IntegrationsSection />
      <Footer />
    </main>
  )
}
