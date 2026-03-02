// src/widgets/dashboard-home/ui/dashboard-home.tsx
import { BackgroundGlow } from './background-glow'
import { PromptInput } from './prompt-input'
import { DashboardTabs } from './dashboard-tabs'

export const DashboardHome = () => {
  return (
    <div className="relative flex h-full min-h-max w-full flex-col items-center pt-[15vh] pb-12 overflow-y-auto bg-bg-main">
      <BackgroundGlow />
      <div className='flex justify-center w-full mx-auto my-[220px]'>
        <PromptInput />
      </div>
      <DashboardTabs />
    </div>
  )
}
