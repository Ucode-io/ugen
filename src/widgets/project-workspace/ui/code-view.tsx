'use client'

import { useState } from 'react'
import { Zap, Layers2 } from 'lucide-react'
import { ReusableTabs } from '@/shared/ui'
import { FunctionsPage } from './functions-page'
import { MicrofrontendPage } from './microfrontend-page'

interface CodeViewProps {
  projectId: string
  activeTab?: string
}

export const CodeView = ({ projectId, activeTab: externalActiveTab }: CodeViewProps) => {
  const [internalActiveTab, setInternalActiveTab] = useState('functions')
  const activeTab = externalActiveTab || internalActiveTab
  const setActiveTab = externalActiveTab ? () => {} : setInternalActiveTab

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {!externalActiveTab && (
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
      )}

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
