'use client'
import { Link } from '@/shared/lib/i18n/navigation'
import Image from 'next/image'
import { useUIStore } from '@/shared/model/theme/use-ui-store'

const FOOTER_COLS = [
  {
    heading: 'Product',
    links: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'Templates', href: '/templates' },
      { label: 'Connectors', href: '/connectors' },
      { label: 'Community', href: 'https://t.me/ucode_community', external: true },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Docs', href: '/docs' },
      { label: 'Hire an Expert', href: '/hire-expert' },
      { label: 'Community ↗', href: 'https://t.me/ucode_community', external: true },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
    ],
  },
]

export const Footer = () => {
  const year = new Date().getFullYear()
  const { theme } = useUIStore()

  return (
    <footer className="border-t border-border-subtle py-14 px-6 bg-bg-card">
      <div className="max-w-[1100px] mx-auto">
        {/* Top grid */}
        <div className="grid gap-9 mb-10"
          style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>

          {/* Brand column */}
          <div>
            <Link href="/" className="inline-block no-underline mb-2.5">
              <Image
                src={theme === 'dark' ? '/ugen-logo.svg' : '/ugen-logo-dark.svg'}
                alt="Ugen Logo"
                width={120}
                height={32}
                className="h-7 w-auto"
              />
            </Link>
            <p className="text-[0.83rem] text-text-muted leading-[1.65] max-w-[220px]">
              The AI-powered platform that turns ideas into ready products in 15 minutes.
            </p>
            <div className="flex gap-2 mt-4">
              <a
                href="https://t.me/ucode_community"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-hover-bg border border-border-subtle flex items-center justify-center text-[0.82rem] no-underline text-text-muted hover:border-border-subtle/60 hover:text-text-main transition-all"
                title="Telegram"
              >
                ✈
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-lg bg-hover-bg border border-border-subtle flex items-center justify-center text-[0.82rem] no-underline text-text-muted hover:border-border-subtle/60 hover:text-text-main transition-all"
                title="X / Twitter"
              >
                𝕏
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-lg bg-hover-bg border border-border-subtle flex items-center justify-center text-[0.82rem] no-underline text-text-muted hover:border-border-subtle/60 hover:text-text-main transition-all"
                title="LinkedIn"
              >
                in
              </a>
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-[0.67rem] font-bold uppercase tracking-[0.1em] text-text-muted/60 mb-3.5">
                {col.heading}
              </h4>
              {col.links.map((link) =>
                link.external ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[0.83rem] text-text-muted no-underline mb-2.5 hover:text-text-main transition-colors"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href as any}
                    className="block text-[0.83rem] text-text-muted no-underline mb-2.5 hover:text-text-main transition-colors"
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border-subtle pt-6 flex justify-between items-center flex-wrap gap-2.5">
          <p className="text-[0.76rem] text-text-muted/60">
            © {year} u&#8209;gen — All rights reserved.
          </p>
          <div className="flex gap-4 text-[0.76rem] text-text-muted/60">
            <a href="#" className="hover:text-text-muted transition-colors no-underline">Privacy</a>
            <a href="#" className="hover:text-text-muted transition-colors no-underline">Terms</a>
            <a href="#" className="hover:text-text-muted transition-colors no-underline">Security</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
