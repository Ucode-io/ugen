'use client'
import { Footer } from '@/widgets/footer'
import { LandingCtaSection } from '@/widgets/landing-page/ui/landing-cta-section'

const CONNECTOR_GROUPS = [
  {
    label: '💳 Payments',
    items: [
      { icon: '💳', name: 'Stripe' },
      { icon: '🅿️', name: 'PayPal' },
      { icon: '🟦', name: 'Square' },
      { icon: '🏦', name: 'Braintree' },
      { icon: '💵', name: 'Paddle' },
      { icon: '🔶', name: 'Adyen' },
    ],
  },
  {
    label: '📣 Marketing & CRM',
    items: [
      { icon: '🟠', name: 'HubSpot' },
      { icon: '☁️', name: 'Salesforce' },
      { icon: '📧', name: 'Mailchimp' },
      { icon: '📮', name: 'Brevo' },
      { icon: '🎯', name: 'Intercom' },
      { icon: '📩', name: 'Customer.io' },
      { icon: '📬', name: 'Klaviyo' },
      { icon: '📊', name: 'Segment' },
    ],
  },
  {
    label: '🛠️ Productivity',
    items: [
      { icon: '💬', name: 'Slack' },
      { icon: '📋', name: 'Notion' },
      { icon: '📊', name: 'Airtable' },
      { icon: '✅', name: 'Asana' },
      { icon: '🔵', name: 'Jira' },
      { icon: '📁', name: 'Google Drive' },
      { icon: '📝', name: 'Google Sheets' },
      { icon: '📅', name: 'Google Calendar' },
      { icon: '🔷', name: 'Microsoft 365' },
      { icon: '💙', name: 'Teams' },
    ],
  },
  {
    label: '🗄️ Databases & Storage',
    items: [
      { icon: '🐘', name: 'PostgreSQL' },
      { icon: '🍃', name: 'MongoDB' },
      { icon: '🔥', name: 'Firebase' },
      { icon: '⚡', name: 'Supabase' },
      { icon: '🪣', name: 'AWS S3' },
      { icon: '☁️', name: 'Cloudinary' },
      { icon: '🟡', name: 'MySQL' },
      { icon: '❄️', name: 'Snowflake' },
    ],
  },
  {
    label: '👥 HR & People',
    items: [
      { icon: '🏢', name: 'Workday' },
      { icon: '🎋', name: 'BambooHR' },
      { icon: '🌊', name: 'Rippling' },
      { icon: '🟢', name: 'Gusto' },
      { icon: '✍️', name: 'DocuSign' },
      { icon: '📝', name: 'HelloSign' },
    ],
  },
  {
    label: '🔧 Developer Tools',
    items: [
      { icon: '🐙', name: 'GitHub' },
      { icon: '🦊', name: 'GitLab' },
      { icon: '🔵', name: 'Bitbucket' },
      { icon: '🟣', name: 'Twilio' },
      { icon: '📨', name: 'SendGrid' },
      { icon: '🔍', name: 'Algolia' },
    ],
  },
]

export const ConnectorsPage = () => {
  return (
    <div className="min-h-screen bg-bg-main flex flex-col">
      {/* Hero */}
      <div className="bg-bg-card border-b border-border-subtle px-6 text-center py-20">
        <span className="inline-block bg-bg-main border border-border-subtle rounded-full text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-text-muted px-3 py-1 mb-[18px]">
          Connectors
        </span>
        <h1
          className="font-extrabold tracking-[-0.04em] leading-[1.1] text-text-main mb-4 max-w-[700px] mx-auto"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
        >
          Connect everything{' '}
          <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            you already use
          </em>
        </h1>
        <p className="text-[1rem] text-text-muted max-w-[500px] mx-auto leading-[1.7] mb-8">
          300+ pre-built connectors for the world's most popular services. One click to integrate, zero configuration headaches.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'register' }))}
            className="inline-block bg-primary text-white text-[0.95rem] font-semibold px-7 py-3 rounded-lg hover:opacity-85 transition-all cursor-pointer border-none"
          >
            Get started free →
          </button>
          <a
            href="#request"
            className="inline-block text-[0.95rem] font-semibold px-7 py-3 rounded-lg border border-border-subtle text-text-muted hover:border-border-subtle/60 hover:text-text-main transition-all no-underline"
          >
            Request a connector
          </a>
        </div>
      </div>

      {/* Connector groups */}
      <section className="px-6 py-16 flex-1">
        <div className="max-w-[1100px] mx-auto space-y-12">
          {CONNECTOR_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[0.82rem] font-bold text-text-muted mb-4">{group.label}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                {group.items.map((item) => (
                  <div
                    key={item.name}
                    className="flex flex-col items-center gap-2 p-3.5 bg-bg-card border border-border-subtle rounded-[10px] hover:border-border-subtle/60 hover:shadow-md transition-all cursor-default"
                  >
                    <div className="w-9 h-9 rounded-lg bg-hover-bg flex items-center justify-center text-[1.1rem]">
                      {item.icon}
                    </div>
                    <span className="text-[0.72rem] font-medium text-text-muted text-center leading-tight">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Request box */}
          <div
            id="request"
            className="mt-14 bg-bg-card border border-border-subtle rounded-[12px] p-10 text-center"
          >
            <h3 className="text-[1.4rem] font-extrabold text-text-main mb-2.5">Don't see your tool?</h3>
            <p className="text-text-muted mb-6">We add new connectors every week. Request yours and we'll prioritise it.</p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'register' }))}
              className="inline-block bg-primary text-white text-[0.95rem] font-semibold px-7 py-3 rounded-lg hover:opacity-85 transition-all cursor-pointer border-none"
            >
              Request a connector →
            </button>
          </div>
        </div>
      </section>

      <LandingCtaSection />
      <Footer />
    </div>
  )
}
