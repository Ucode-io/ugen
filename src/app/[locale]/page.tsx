import { Metadata } from 'next'
import { LandingPage, LandingPageClientWrapper } from '@/widgets/landing-page'

export const metadata: Metadata = {
  title: 'Ucode | AI-Based Backend as a Service',
  description: 'Backend as a Service for your Digital Business. Every Ucode project is powered by an AI-based low-code platform that generates frontend and backend easily and quickly.',
  openGraph: {
    title: 'Ucode | AI-Based Backend as a Service',
    description: 'Build fast. Scale easy. Every Ucode project is powered by an AI-based low-code platform.',
    type: 'website',
  }
}

export default function RootHomePage() {
  return (
    <LandingPageClientWrapper>
      <LandingPage />
    </LandingPageClientWrapper>
  )
}
