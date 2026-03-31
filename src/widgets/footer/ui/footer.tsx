'use client'
import { Link } from '@/shared/lib/i18n/navigation'
import { useTranslations } from 'next-intl'

export const Footer = () => {
  const tHeader = useTranslations('widgets.header')
  const tFooter = useTranslations('widgets.footer')

  return (
    <footer className="py-12 bg-bg-card border-t border-border-subtle text-center w-full mt-auto">
      <div className="container mx-auto px-6">
        <nav className="flex flex-wrap items-center justify-center gap-6 mb-8">
          <Link href="/#databases" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
            {tHeader('databases')}
          </Link>
          <Link href="/#edge-functions" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
            {tHeader('edgeFunctions')}
          </Link>
          <Link href="/#features" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
            {tHeader('features')}
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
            {tHeader('pricing')}
          </Link>
          <Link href="/#integrations" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
            {tHeader('integrations')}
          </Link>
        </nav>
        <p className="text-sm text-text-muted font-medium">
          {tFooter('copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  )
}
