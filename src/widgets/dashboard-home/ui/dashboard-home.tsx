// src/widgets/dashboard-home/ui/dashboard-home.tsx
// import { BackgroundGlow } from './background-glow'
// import { AuroraBackground } from './aurora-background'
// import { SpaceFlight } from './space-flight'
import { EtherealShadow } from '@/shared/ui/etheral-shadow'
import { PromptInput } from './prompt-input'

export const DashboardHome = () => {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-y-auto bg-bg-main py-12">
      {/* <BackgroundGlow /> */}
      {/* <AuroraBackground /> */}
      {/* <SpaceFlight /> */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-60">
        <EtherealShadow
          color="linear-gradient(135deg, var(--color-glow-primary), var(--color-glow-secondary) 50%, var(--color-glow-tertiary))"
          animation={{ scale: 100, speed: 90 }}
          noise={{ opacity: 0.4, scale: 1.2 }}
          sizing="fill"
        />
      </div>
      <PromptInput />
    </div>
  )
}
