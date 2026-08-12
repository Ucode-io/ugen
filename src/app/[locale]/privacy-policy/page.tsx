import { Metadata } from 'next'
import { PrivacyPolicyPage } from '@/widgets/privacy-policy-page'
import { LandingPageClientWrapper } from '@/widgets/landing-page/ui/landing-page-client-wrapper'

export const metadata: Metadata = {
  title: 'Privacy Policy | Ucode',
  description:
    'How UCODE MCHJ collects, uses, stores, and protects personal information, including Google Calendar and Instagram Direct integrations.',
}

export default function PrivacyPolicyRoute() {
  return (
    <LandingPageClientWrapper>
      <PrivacyPolicyPage />
    </LandingPageClientWrapper>
  )
}
