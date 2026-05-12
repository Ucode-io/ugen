import { Metadata } from 'next'
import { DocsPage } from '@/widgets/docs-page'
import { LandingPageClientWrapper } from '@/widgets/landing-page/ui/landing-page-client-wrapper'

export const metadata: Metadata = {
  title: 'Docs | Ugen',
  description: 'Everything you need to get started, connect your tools, and ship your first app in minutes.',
}

export default function DocsRoute() {
  return (
    <LandingPageClientWrapper>
      <DocsPage />
    </LandingPageClientWrapper>
  )
}
