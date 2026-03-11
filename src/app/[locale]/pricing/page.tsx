import { Metadata } from 'next'
import { PricingPage } from '@/widgets/pricing'
import { LandingPageClientWrapper } from '@/widgets/landing-page/ui/landing-page-client-wrapper'

export const metadata: Metadata = {
  title: 'Pricing | Ucode',
  description: 'Compare our plans and find yours. Simple, transparent pricing that grows with you.',
  openGraph: {
    title: 'Pricing | Ucode - AI-Based Backend as a Service',
    description: 'Compare our plans and find yours. Simple, transparent pricing that grows with you.',
    type: 'website',
  }
}

export default function RootPricingPage() {
  return (
    <LandingPageClientWrapper>
      <PricingPage />
    </LandingPageClientWrapper>
  )
}
