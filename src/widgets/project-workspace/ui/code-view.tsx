'use client'

import { useState } from 'react'
import { Zap, Layers2 } from 'lucide-react'
import { ReusableTabs } from '@/shared/ui/tabs'
import { FunctionsPage } from './functions-page'
import { MicrofrontendPage } from './microfrontend-page'

interface CodeViewProps {
  projectId: string
}

export const CodeView = ({ projectId }: CodeViewProps) => {
  const [activeTab, setActiveTab] = useState('functions')

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <ReusableTabs
          activeId={activeTab}
          onTabChange={setActiveTab}
          options={[
            { id: 'functions', label: 'Functions', icon: <Zap size={14} /> },
            { id: 'microfrontend', label: 'Microfrontend', icon: <Layers2 size={14} /> },
          ]}
        />
      </div>

      <div className="pt-2">
        {activeTab === 'functions' ? (
          <FunctionsPage projectId={projectId} />
        ) : (
          <MicrofrontendPage projectId={projectId} />
        )}
      </div>
    </div>
  )
}
