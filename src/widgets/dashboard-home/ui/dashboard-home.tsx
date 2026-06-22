// src/widgets/dashboard-home/ui/dashboard-home.tsx
// Альтернативные фоны (оставлены для быстрого переключения):
// import { BackgroundGlow } from './background-glow'
// import { AuroraBackground } from './aurora-background'
// import { SpaceFlight } from './space-flight'
// import { EtherealShadow } from '@/shared/ui/etheral-shadow'
import { PrismGlow } from './prism-glow'
import { PromptInput } from './prompt-input'

export const DashboardHome = () => {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-y-auto bg-bg-main py-12">
      {/* Призма-градиент в духе hero Dia Browser */}
      <PrismGlow />
      <PromptInput />
    </div>
  )
}
