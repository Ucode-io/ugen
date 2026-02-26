// src/widgets/dashboard-home/ui/dashboard-home.tsx
import { BackgroundGlow } from './background-glow'
import { PromptInput } from './prompt-input'

export const DashboardHome = () => {
  return (
    <div className="relative flex h-full min-h-[calc(100vh-64px)] w-full flex-col items-center justify-center overflow-hidden bg-bg-main">
      <BackgroundGlow />
      <PromptInput />
    </div>
  )
}
