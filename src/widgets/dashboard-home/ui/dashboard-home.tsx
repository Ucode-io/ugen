// src/widgets/dashboard-home/ui/dashboard-home.tsx
import { BackgroundGlow } from './background-glow'
import { PromptInput } from './prompt-input'

export const DashboardHome = () => {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-y-auto bg-bg-main py-12">
      <BackgroundGlow />
      <PromptInput />
    </div>
  )
}
