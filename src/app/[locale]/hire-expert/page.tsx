import { Metadata } from 'next'
import { HireExpertPage } from '@/widgets/hire-expert-page'
import { LandingPageClientWrapper } from '@/widgets/landing-page/ui/landing-page-client-wrapper'

export const metadata: Metadata = {
  title: 'Hire an Expert | Ugen',
  description: 'u-gen Experts provide the expertise to help you build and launch your products faster.',
}

export default function HireExpertRoute() {
  return (
    <LandingPageClientWrapper>
      <HireExpertPage />
    </LandingPageClientWrapper>
  )
}
