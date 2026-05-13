import { Metadata } from 'next'
import { TemplatesPublicPage } from '@/widgets/templates-public'
import { LandingPageClientWrapper } from '@/widgets/landing-page/ui/landing-page-client-wrapper'

export const metadata: Metadata = {
  title: 'Templates | Ugen',
  description: '100+ production-ready app templates across every category. Clone, customize, and ship in minutes.',
}

export default function TemplatesRoute() {
  return (
    <LandingPageClientWrapper>
      <TemplatesPublicPage />
    </LandingPageClientWrapper>
  )
}
