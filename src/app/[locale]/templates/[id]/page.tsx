import { Metadata } from 'next'
import { TemplateDetailPage } from '@/widgets/templates-public'
import { LandingPageClientWrapper } from '@/widgets/landing-page/ui/landing-page-client-wrapper'

export const metadata: Metadata = {
  title: 'Template | Ugen',
  description: 'Explore this ready-made app template. Clone, customize, and ship in minutes.',
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function TemplateDetailRoute({ params }: Props) {
  const { id } = await params
  return (
    <LandingPageClientWrapper>
      <TemplateDetailPage id={id} />
    </LandingPageClientWrapper>
  )
}
