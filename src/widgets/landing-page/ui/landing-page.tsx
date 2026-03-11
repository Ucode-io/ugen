import React from 'react'
import { Link } from '@/shared/lib/i18n/navigation'
import { Check, CheckCircle2, Database, Rocket, Server, Smartphone, Globe, Code, Key, Box, ShieldCheck, Cpu, HardDrive, Filter, Workflow, Layers } from 'lucide-react'
import { Button } from '@/shared/ui/ui/button'
import { StartProjectButton } from './start-project-button'
import { Footer } from '@/widgets/footer'

const HeroSection = () => (
  <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex flex-col items-center justify-center text-center px-4">
    <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-bg-main to-bg-main"></div>
    
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-8 border border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Cpu size={14} className="animate-pulse" />
      <span className="text-[11px] font-bold uppercase tracking-[0.2em]">AI-Based Platform</span>
    </div>

    <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-text-main mb-6 max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
      Build fast.<br className="hidden md:block" />
      <span className="text-gradient drop-shadow-sm">Scale Easy.</span>
    </h1>
    
    <p className="text-lg lg:text-xl text-text-muted max-w-2xl mb-10 text-balance animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
      Backend as a Service for your Digital Business. Every Ucode project is powered by an AI-based low-code platform that generates frontend and backend easily and quickly.
    </p>

    <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
      <StartProjectButton />
    </div>
  </section>
)

const DatabasesSection = () => (
  <section id="databases" className="py-24 bg-bg-card scroll-mt-16">
    <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <Database className="text-primary" size={24} />
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-text-main mb-4">
            Database and Analytics
          </h2>
          <p className="text-lg text-text-muted mb-6">
            Every Ucode project is a dedicated PostgreSQL or MongoDB database, trusted by millions of developers.
          </p>
          <ul className="space-y-4">
            {[
              "Easy manage your Data",
              "PostgreSQL and MongoDB are the world's most scalable databases",
              "Connect and manage your data with our Lowcode solution"
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
                  <h3 className="font-bold text-text-main text-base">PostgreSQL</h3>
                  <p className="text-xs text-text-muted mt-0.5">Relational Engine</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md uppercase tracking-wider">Ready</span>
            </div>
            <div className="bg-bg-main border border-border-subtle/60 rounded-xl p-5 flex items-center justify-between shadow-sm transition-all hover:border-green-500/30 hover:shadow-green-500/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#47A248]/10 flex items-center justify-center border border-[#47A248]/20">
                  <Database className="text-[#47A248]" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-text-main text-base">MongoDB</h3>
                  <p className="text-xs text-text-muted mt-0.5">Document Store</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md uppercase tracking-wider">Ready</span>
            </div>
            <div className="bg-bg-main border border-border-subtle/60 rounded-xl p-5 flex items-center justify-between shadow-sm transition-all hover:border-yellow-500/30 hover:shadow-yellow-500/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                  <Database className="text-yellow-500" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-text-main text-base">ClickHouse</h3>
                  <p className="text-xs text-text-muted mt-0.5">Analytics Engine</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md uppercase tracking-wider">Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
)

const EdgeFunctionsSection = () => (
  <section id="edge-functions" className="py-24 bg-bg-sidebar/30 border-y border-border-subtle/40 scroll-mt-16">
    <div className="container mx-auto px-6 lg:px-8 max-w-7xl text-center">
      <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 mx-auto">
        <Code className="text-accent" size={24} />
      </div>
      <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-text-main mb-4">
        Edge Functions
      </h2>
      <p className="text-lg text-text-muted mb-6 max-w-2xl mx-auto">
        Customize functions and easily author, deploy, and monitor serverless functions without managing servers or hosting. Easily write custom code.
      </p>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 text-left">
        {[
          { title: 'Mobile', desc: 'Flutter, Android, SWIFT, Dart', icon: Smartphone },
          { title: 'Web', desc: 'React JS, Vue JS, Angular, JS', icon: Globe },
          { title: 'Backend', desc: 'Go, Java, C++, C, Php, Python', icon: Server },
          { title: 'Microfrontend', desc: 'Angular, React.JS, Vue.JS', icon: Layers }
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

const FeaturesGrid = () => {
  const features = [
    { title: 'Storage', desc: 'Store, organize, and serve large files, from videos to images. (Minio, Amazon S3, R3)', icon: HardDrive },
    { title: 'Data APIs', desc: 'Instant ready-to-use Restful APIs. Connect existing services instantly.', icon: Workflow },
    { title: 'Authentication', desc: 'Invite and easily manage your users with Built-in powerful permission and access management.', icon: Key },
    { title: 'Role & Access', desc: 'Comprehensive Role Management, Access Management, and User Management built-in.', icon: ShieldCheck },
  ]

  return (
    <section id="features" className="py-24 bg-bg-card scroll-mt-16">
      <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-text-main mb-4">
            Everything you need
          </h2>
          <p className="text-lg text-text-muted">A complete suite of tools to ship your project in days, not months.</p>
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



const IntegrationsSection = () => {
  const integrationCategories = [
    { name: 'Databases', items: 'MongoDB, PostgreSQL, ClickHouse' },
    { name: 'File Storage', items: 'Minio, Amazon S3, R3' },
    { name: 'API’s', items: 'SMS, Rest API, Mail' },
    { name: 'Version control', items: 'Github, Gitlab, Bitbucket' },
    { name: 'Maps', items: 'Yandex maps, Google maps, Mapbox' },
    { name: 'Custom functions', items: 'Go, Node Js, Java, JS, C++, C, Php, Python' }
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
              Integrations
            </h2>
            <p className="text-lg text-text-muted">Find an Integration. Connect with your favorite tools seamlessly.</p>
          </div>
          <Button variant="outline" className="rounded-xl px-6 h-12 font-semibold">
            View All Integrations
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
