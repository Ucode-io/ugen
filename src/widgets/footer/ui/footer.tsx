import { Link } from '@/shared/lib/i18n/navigation'

export const Footer = () => (
  <footer className="py-12 bg-bg-card border-t border-border-subtle text-center w-full mt-auto">
    <div className="container mx-auto px-6">
      <nav className="flex flex-wrap items-center justify-center gap-6 mb-8">
        <Link href="/#databases" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">Databases</Link>
        <Link href="/#edge-functions" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">Edge Functions</Link>
        <Link href="/#features" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">Features</Link>
        <Link href="/pricing" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">Pricing</Link>
        <Link href="/#integrations" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">Integrations</Link>
      </nav>
      <p className="text-sm text-text-muted font-medium">
        © {new Date().getFullYear()} Ucode UI. All rights reserved.
      </p>
    </div>
  </footer>
)
