'use client'

import { useState } from 'react'
import { Zap, Layers2, ArrowUp } from 'lucide-react'
import { Button, SubTabs, UsageIndicator } from '@/shared/ui'
import { FunctionsPage } from './functions-page'
import { MicrofrontendPage } from './microfrontend-page'

interface CodeViewProps {
  projectId: string
  activeTab?: string
}

export const CodeView = ({ projectId, activeTab: externalActiveTab }: CodeViewProps) => {
  const [internalActiveTab, setInternalActiveTab] = useState('microfrontend')
  const activeTab = externalActiveTab || internalActiveTab
  const setActiveTab = externalActiveTab ? () => { } : setInternalActiveTab

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {!externalActiveTab && (
        <>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-[22px] font-bold text-text-main mb-1">Code</h1>
              <p className="text-text-muted text-[13px]">Manage frontend pages and server functions</p>
            </div>
            
            <div className="flex items-center gap-3">
              <UsageIndicator 
                label="Pages" 
                value={10} 
                total={50} 
                percentage={20} 
              />
              
              <Button variant="primary" size="sm" className="gap-2">
                <ArrowUp size={14} />
                Upgrade Plan
              </Button>
            </div>
          </div>

          <SubTabs
            activeId={activeTab}
            onTabChange={setActiveTab}
            options={[
              { id: 'microfrontend', label: 'Frontend', icon: Layers2 },
              { id: 'functions', label: 'Server Functions', icon: Zap },
            ]}
          />
        </>
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
