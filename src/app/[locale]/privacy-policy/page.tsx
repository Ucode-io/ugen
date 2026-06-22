import { Metadata } from 'next'
import { PrivacyPolicyPage } from '@/widgets/privacy-policy-page'
import { LandingPageClientWrapper } from '@/widgets/landing-page/ui/landing-page-client-wrapper'

export const metadata: Metadata = {
  title: 'Privacy Policy | Ugen',
  description:
    'How UCODE MCHJ collects, uses, stores, and protects personal information, including the Google Calendar integration.',
}

export default function PrivacyPolicyRoute() {
  return (
    <LandingPageClientWrapper>
      <PrivacyPolicyPage />
    </LandingPageClientWrapper>
  )
}
