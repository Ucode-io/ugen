'use client'
import { Link } from '@/shared/lib/i18n/navigation'
import Image from 'next/image'

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
      { label: 'Privacy', href: '/privacy-policy' },
      { label: 'Terms', href: '#' },
    ],
  },
]

export const Footer = () => {
  const year = new Date().getFullYear()

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
                src="/ugen-logo.svg"
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
                <svg xmlns="http://www.w3.org/2000/svg" width="0.8rem" height="0.8rem" fill="currentColor" role="img" viewBox="0 0 24 24"><title>Telegram</title><path fill="currentColor" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
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
            <Link href="/privacy-policy" className="hover:text-text-muted transition-colors no-underline">Privacy</Link>
            <a href="#" className="hover:text-text-muted transition-colors no-underline">Terms</a>
            <a href="#" className="hover:text-text-muted transition-colors no-underline">Security</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
