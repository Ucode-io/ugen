import React from 'react'
import { Check, Zap, Star, Shield, HelpCircle, Server } from 'lucide-react'
import { Button } from '@/shared/ui/ui/button'
import { StartProjectButton } from '@/widgets/landing-page/ui/start-project-button'
import { Footer } from '@/widgets/footer'

const featuresData = [
  {
    category: 'General',
    icon: <Zap size={18} className="text-primary" />,
    items: [
      { name: 'Total Users & Roles', os: 'Custom', small: 'Unlimited', medium: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Configuration', os: 'Custom', small: 'Fixed', medium: 'Fixed', enterprise: 'Custom' },
      { name: 'API Requests / Month', os: 'Custom', small: '100 000', medium: '1 000 000', enterprise: 'Custom' },
      { name: 'API Requests / Second', os: 'Custom', small: '100', medium: '500', enterprise: 'Custom' },
      { name: 'Functions', os: 'Custom', small: '10', medium: '10', enterprise: 'Custom' },
      { name: 'Microfrontend', os: 'Custom', small: '5', medium: '5', enterprise: 'Custom' },
      { name: 'Database Size', os: 'Custom', small: '10GB', medium: '50GB', enterprise: 'Custom' },
      { name: 'Asset Size info', os: 'Custom', small: '10GB', medium: '50GB', enterprise: 'Custom' },
    ]
  },
  {
    category: 'Servers',
    icon: <Server size={18} className="text-[#336791]" />,
    items: [
      { name: 'Database Server', os: 'Custom', small: 'Shared', medium: 'Shared', enterprise: 'Dedicated' },
      { name: 'File Server', os: 'Custom', small: 'Shared', medium: 'Shared', enterprise: 'Dedicated' },
      { name: 'Function Server', os: 'Custom', small: 'Shared', medium: 'Shared', enterprise: 'Dedicated' },
      { name: 'Microfrontend Server', os: 'Custom', small: 'Shared', medium: 'Shared', enterprise: 'Dedicated' },
      { name: 'Custom Domain', os: 'Custom', small: 'Shared', medium: 'Shared', enterprise: 'Dedicated' },
      { name: 'Failover Instance(s)', os: 'Custom', small: 'Shared', medium: 'Shared', enterprise: 'Dedicated' },
    ]
  },
  {
    category: 'Support',
    icon: <HelpCircle size={18} className="text-[#47A248]" />,
    items: [
      { name: 'Community Support', os: true, small: true, medium: true, enterprise: true },
      { name: 'Designated Support', os: false, small: false, medium: true, enterprise: true },
      { name: 'Dedicated Developer', os: false, small: false, medium: false, enterprise: true },
    ]
  },
  {
    category: 'Compliance & Security',
    icon: <Shield size={18} className="text-yellow-500" />,
    items: [
      { name: 'Log retention', os: '-', small: '1 day', medium: '30 days', enterprise: '90 days' },
      { name: 'Role Based Acces Control', os: true, small: true, medium: true, enterprise: true },
      { name: 'Menu Permissions', os: true, small: true, medium: true, enterprise: true },
      { name: 'Table Permissions', os: true, small: true, medium: true, enterprise: true },
      { name: 'Field Permissions', os: true, small: true, medium: true, enterprise: true },
    ]
  },
  {
    category: 'Connectivity',
    icon: <Star size={18} className="text-purple-500" />,
    items: [
      { name: 'REST API', os: true, small: true, medium: true, enterprise: true },
      { name: 'Image & Asset API', os: true, small: true, medium: true, enterprise: true },
      { name: 'Web Hooks', os: true, small: true, medium: true, enterprise: true },
      { name: 'Direct Database Access', os: true, small: false, medium: false, enterprise: true },
    ]
  }
]

export const PricingPage = () => {
  const renderValue = (val: string | boolean) => {
    if (val === true) return <Check size={20} strokeWidth={3} className="text-primary mx-auto drop-shadow-sm" />
    if (val === false || val === '-') return <span className="text-text-muted/40 font-bold">-</span>
    return <span className="text-[13px] font-semibold text-text-main">{val}</span>
  }

  return (
    <div className="min-h-screen bg-bg-main relative selection:bg-primary/20 selection:text-primary flex flex-col pt-16">
      {/* Premium Background Effects */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-primary/10 via-bg-main to-transparent -z-10 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-[200px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent -z-10 blur-3xl opacity-70" />

      <main className="flex-1">
        <section className="py-20 lg:py-28 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-6 border border-primary/20">
                <Star size={14} className="animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Pricing Plans</span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-text-main mb-6 leading-tight">
                Compare our plans <br className="hidden md:block" />
                <span className="text-gradient">and find yours</span>
              </h1>
              <p className="text-lg lg:text-xl text-text-muted">
                Simple, transparent pricing that grows with you. <br className="hidden sm:block"/>
                Try any plan free for 30 days. No credit card required.
              </p>
            </div>

            {/* Premium Pricing Cards (Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-24 max-w-7xl mx-auto items-stretch">
              {/* Card 1: Open source */}
              <div className="flex flex-col bg-bg-card border border-border-subtle rounded-[2rem] p-8 hover:border-primary/40 transition-colors shadow-sm relative isolate group h-full">
                 <h3 className="font-bold text-2xl text-text-main mb-2 tracking-tight group-hover:text-primary transition-colors">Open source</h3>
                 <div className="flex items-end gap-1.5 mb-5 text-left">
                   <span className="text-4xl font-extrabold text-text-main">Free</span>
                   <span className="text-sm font-semibold text-text-muted mb-1">/ mth</span>
                 </div>
                 <p className="text-[14px] text-text-muted mb-8 text-balance leading-relaxed">Basic features for up to 10 employees with everything you need.</p>
                 <div className="mt-auto flex flex-col gap-3">
                   <StartProjectButton className="w-full text-sm h-12 rounded-xl bg-text-main hover:bg-black text-white font-semibold transition-all shadow-md">Get started</StartProjectButton>
                   <Button variant="outline" className="w-full text-sm h-12 rounded-xl font-bold border-border-subtle hover:bg-hover-bg">Chat to sales</Button>
                 </div>
              </div>

              {/* Card 2: Small (Popular) */}
              <div className="flex flex-col bg-bg-main border border-primary/30 rounded-[2rem] p-8 transition-all shadow-2xl relative isolate md:-mt-4 md:mb-4 lg:scale-105 z-10 h-full">
                 <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary to-accent rounded-t-[2rem]"></div>
                 <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent text-white text-[11px] uppercase font-bold px-5 py-1.5 rounded-full tracking-widest shadow-lg border border-white/20 flex items-center gap-1.5 whitespace-nowrap">
                    <Star size={12} className="fill-white" /> Popular
                 </div>
                 <h3 className="font-extrabold text-2xl text-primary mb-2 tracking-tight drop-shadow-sm pt-2">Small</h3>
                 <div className="flex items-end gap-1.5 mb-5 text-left">
                   <span className="text-5xl font-black text-text-main">$300</span>
                   <span className="text-sm font-bold text-text-muted mb-1.5">/ mth</span>
                 </div>
                 <p className="text-[14px] text-text-muted mb-8 text-balance leading-relaxed">Advanced features for growing teams and startups.</p>
                 <div className="mt-auto flex flex-col gap-3">
                   <StartProjectButton className="w-full text-sm h-12 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-all shadow-lg shadow-primary/25">Get started</StartProjectButton>
                   <Button variant="outline" className="w-full text-sm h-12 rounded-xl font-bold bg-bg-card border-border-subtle/80 hover:border-primary/40 hover:text-primary transition-colors">Chat to sales</Button>
                 </div>
              </div>

              {/* Card 3: Medium */}
              <div className="flex flex-col bg-bg-card border border-border-subtle rounded-[2rem] p-8 hover:border-primary/40 transition-colors shadow-sm relative isolate group h-full">
                 <h3 className="font-bold text-2xl text-text-main mb-2 tracking-tight group-hover:text-primary transition-colors">Medium</h3>
                 <div className="flex items-end gap-1.5 mb-5 text-left">
                   <span className="text-4xl font-extrabold text-text-main">$600</span>
                   <span className="text-sm font-semibold text-text-muted mb-1">/ mth</span>
                 </div>
                 <p className="text-[14px] text-text-muted mb-8 text-balance leading-relaxed">Advanced features and reporting, better workflows and automation.</p>
                 <div className="mt-auto flex flex-col gap-3">
                   <StartProjectButton className="w-full text-sm h-12 rounded-xl bg-text-main hover:bg-black text-white font-semibold transition-all shadow-md">Get started</StartProjectButton>
                   <Button variant="outline" className="w-full text-sm h-12 rounded-xl font-bold border-border-subtle hover:bg-hover-bg">Chat to sales</Button>
                 </div>
              </div>

              {/* Card 4: Enterprise */}
              <div className="flex flex-col bg-bg-card border border-border-subtle rounded-[2rem] p-8 hover:border-primary/40 transition-colors shadow-sm relative isolate group h-full">
                 <h3 className="font-bold text-2xl text-text-main mb-2 tracking-tight group-hover:text-primary transition-colors">Enterprise</h3>
                 <div className="flex items-end gap-1.5 mb-5 text-left">
                   <span className="text-4xl font-extrabold text-text-main">Custom</span>
                 </div>
                 <p className="text-[14px] text-text-muted mb-8 text-balance leading-relaxed">Personalised service and enterprise security for large teams.</p>
                 <div className="mt-auto flex flex-col gap-3">
                   <StartProjectButton className="w-full text-sm h-12 rounded-xl bg-text-main hover:bg-black text-white font-semibold transition-all shadow-md">Get started</StartProjectButton>
                   <Button variant="outline" className="w-full text-sm h-12 rounded-xl font-bold border-border-subtle hover:bg-hover-bg">Chat to sales</Button>
                 </div>
              </div>
            </div>

            {/* Features Comparison Title */}
            <div className="text-center mb-10 max-w-3xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-text-main mb-4">
                Compare features in detail
              </h2>
              <p className="text-text-muted text-lg">
                Find the perfect combination of services and limits for your project.
              </p>
            </div>

            <div className="overflow-x-auto overflow-y-visible custom-scrollbar rounded-[2rem] p-1 pb-8">
              <div className="min-w-[1000px] bg-bg-card rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-border-subtle/60 relative isolation-isolate">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-subtle/40">
                      <th className="p-6 w-[28%] bg-bg-card rounded-tl-[2rem] relative z-20">
                         <div className="absolute inset-0 bg-gradient-to-br from-bg-sidebar/50 to-transparent rounded-tl-[2rem] -z-10"></div>
                      </th>
                      
                      {/* Simple Headers */}
                      <th className="py-6 px-4 w-[18%] text-center align-middle border-l border-border-subtle/40 bg-bg-card font-bold text-lg text-text-main relative">
                        Open source
                        <div className="absolute bottom-0 inset-x-0 h-px bg-transparent"></div>
                      </th>
                      
                      <th className="py-6 px-4 w-[18%] text-center align-middle border-l border-border-subtle/40 bg-primary/[0.03] font-bold text-xl text-primary relative">
                        Small
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-accent"></div>
                      </th>
                      
                      <th className="py-6 px-4 w-[18%] text-center align-middle border-l border-border-subtle/40 bg-bg-card font-bold text-lg text-text-main relative">
                        Medium
                      </th>
                      
                      <th className="py-6 px-4 w-[18%] text-center align-middle border-l border-border-subtle/40 bg-bg-card font-bold text-lg text-text-main rounded-tr-[2rem] relative">
                        Enterprise
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {featuresData.map((section, idx) => (
                      <React.Fragment key={idx}>
                        {/* Section Header */}
                        <tr className="bg-bg-sidebar/60 shadow-inner">
                          <td colSpan={5} className="py-5 px-8 font-bold text-sm text-text-main tracking-widest pl-8 border-y border-border-subtle/40">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-bg-card border border-border-subtle flex items-center justify-center shadow-sm">
                                  {section.icon}
                               </div>
                               {section.category}
                             </div>
                          </td>
                        </tr>
                        {/* Section Items */}
                        {section.items.map((item, itemIdx) => {
                          const isLast = idx === featuresData.length - 1 && itemIdx === section.items.length - 1;
                          return (
                            <tr key={itemIdx} className={`group hover:bg-hover-bg/40 transition-colors ${!isLast ? 'border-b border-border-subtle/40' : ''}`}>
                              <td className={`py-5 px-8 text-[14px] font-medium text-text-muted group-hover:text-text-main transition-colors ${isLast ? 'rounded-bl-[2rem]' : ''}`}>
                                {item.name}
                              </td>
                              <td className="py-5 px-4 text-center border-l border-border-subtle/40 text-text-main">
                                {renderValue(item.os)}
                              </td>
                              {/* Highlight Column for Small (Popular) */}
                              <td className="py-5 px-4 text-center border-l border-border-subtle/40 text-text-main bg-primary/[0.02] shadow-[inset_0_0_15px_rgba(59,130,246,0.02)]">
                                {renderValue(item.small)}
                              </td>
                              <td className="py-5 px-4 text-center border-l border-border-subtle/40 text-text-main">
                                {renderValue(item.medium)}
                              </td>
                              <td className={`py-5 px-4 text-center border-l border-border-subtle/40 text-text-main ${isLast ? 'rounded-br-[2rem]' : ''}`}>
                                {renderValue(item.enterprise)}
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
