import { Metadata } from 'next'
import { ConnectorsPage } from '@/widgets/connectors-page'
import { LandingPageClientWrapper } from '@/widgets/landing-page/ui/landing-page-client-wrapper'

export const metadata: Metadata = {
  title: 'Connectors | Ugen',
  description: '300+ pre-built connectors for the world\'s most popular services. One click to integrate.',
}

export default function ConnectorsRoute() {
  return (
    <LandingPageClientWrapper>
      <ConnectorsPage />
    </LandingPageClientWrapper>
  )
}
