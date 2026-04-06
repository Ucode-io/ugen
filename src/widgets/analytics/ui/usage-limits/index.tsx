import React from 'react'
import { ArrowUp, Check, X } from 'lucide-react'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/lib/utils/cn'
import {
  WorkspaceTableWrapper,
  WorkspaceTable,
  WorkspaceTableHeader,
  WorkspaceTableBody,
  WorkspaceTableRow,
  WorkspaceTableHead,
  WorkspaceTableCell,
} from '@/widgets/project-workspace/ui/workspace-table'

export const UsageLimitsTab = () => {
  return (
    <div className="space-y-6 pt-4 animate-in fade-in duration-300">
      {/* Current plan banner */}
      <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-xl px-5 py-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-primary font-bold mb-0.5">Current Plan</div>
          <div className="text-lg font-bold text-text-main">
            Small <span className="text-[13px] text-text-muted font-normal ml-1">— $300 / month</span>
          </div>
        </div>
        <Button className="gap-2 shrink-0">
          <ArrowUp size={16} /> Upgrade Plan
        </Button>
      </div>

      {/* Usage meters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
          <div className="text-xs text-text-muted font-semibold mb-2">API Calls</div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-[22px] font-bold text-primary">100</span>
            <span className="text-[12px] text-text-muted">/ 500</span>
          </div>
          <div className="h-1.5 bg-bg-sidebar rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: '20%' }} />
          </div>
          <div className="text-[11px] text-text-muted">400 remaining</div>
        </div>
        
        <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
          <div className="text-xs text-text-muted font-semibold mb-2">Storage</div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-[22px] font-bold text-blue-500">2.4 GB</span>
            <span className="text-[12px] text-text-muted">/ 50 GB</span>
          </div>
          <div className="h-1.5 bg-bg-sidebar rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: '5%' }} />
          </div>
          <div className="text-[11px] text-text-muted">47.6 GB remaining</div>
        </div>

        <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
          <div className="text-xs text-text-muted font-semibold mb-2">DB Records</div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-[22px] font-bold text-green-500">62,432</span>
            <span className="text-[12px] text-text-muted">/ 1,000,000</span>
          </div>
          <div className="h-1.5 bg-bg-sidebar rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: '6%' }} />
          </div>
          <div className="text-[11px] text-text-muted">937,568 remaining</div>
        </div>

        <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
          <div className="text-xs text-text-muted font-semibold mb-2">Log Retention</div>
          <div className="flex items-baseline gap-1.5 mb-3.5">
            <span className="text-[22px] font-bold text-purple-500">30</span>
            <span className="text-[13px] text-text-muted font-normal">days</span>
          </div>
          <div className="text-[11px] text-text-muted">Upgrade for 90 days</div>
        </div>
      </div>

      {/* Plan comparison table */}
      <div>
        <div className="text-sm font-semibold text-text-main mb-3 ml-1">Plan Comparison</div>
        <WorkspaceTableWrapper>
          <WorkspaceTable>
            <WorkspaceTableHeader>
              <WorkspaceTableRow>
                <WorkspaceTableHead className="w-1/3">Feature</WorkspaceTableHead>
                <WorkspaceTableHead className="text-center w-1/6">
                  <div className="font-bold text-text-main">Free</div>
                  <div className="font-normal text-text-muted normal-case text-[11px] mt-0.5">$0/mo</div>
                </WorkspaceTableHead>
                <WorkspaceTableHead className="text-center w-1/6 bg-primary/5 text-primary border-t-2 border-t-primary border-x border-x-primary/20">
                  <div className="font-bold">Small ✓</div>
                  <div className="font-normal text-text-muted normal-case text-[11px] mt-0.5">$300/mo</div>
                </WorkspaceTableHead>
                <WorkspaceTableHead className="text-center w-1/6">
                  <div className="font-bold text-text-main">Medium</div>
                  <div className="font-normal text-text-muted normal-case text-[11px] mt-0.5">$600/mo</div>
                </WorkspaceTableHead>
                <WorkspaceTableHead className="text-center w-1/6">
                  <div className="font-bold text-text-main">Enterprise</div>
                  <div className="font-normal text-text-muted normal-case text-[11px] mt-0.5">Custom</div>
                </WorkspaceTableHead>
              </WorkspaceTableRow>
            </WorkspaceTableHeader>
            <WorkspaceTableBody>
              <WorkspaceTableRow>
                <WorkspaceTableCell>API Calls</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center">100</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center bg-primary/5 text-primary font-semibold border-x border-x-primary/20">500</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center">Unlimited</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center">Unlimited</WorkspaceTableCell>
              </WorkspaceTableRow>
              <WorkspaceTableRow>
                <WorkspaceTableCell>Storage</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center">10 GB</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center bg-primary/5 text-primary font-semibold border-x border-x-primary/20">50 GB</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center">Unlimited</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center">Custom</WorkspaceTableCell>
              </WorkspaceTableRow>
              <WorkspaceTableRow>
                <WorkspaceTableCell>Database Records</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center">100,000</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center bg-primary/5 text-primary font-semibold border-x border-x-primary/20">1,000,000</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center">Unlimited</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center">Unlimited</WorkspaceTableCell>
              </WorkspaceTableRow>
              <WorkspaceTableRow>
                <WorkspaceTableCell>Log Retention</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center">1 day</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center bg-primary/5 text-primary font-semibold border-x border-x-primary/20">30 days</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center">30 days</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center">90 days</WorkspaceTableCell>
              </WorkspaceTableRow>
              <WorkspaceTableRow>
                <WorkspaceTableCell>Infrastructure</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center">Shared</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center bg-primary/5 text-primary font-semibold border-x border-x-primary/20">Shared</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center">Shared</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center">Dedicated</WorkspaceTableCell>
              </WorkspaceTableRow>
              <WorkspaceTableRow>
                <WorkspaceTableCell>Role Based Access</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center"><Check size={16} className="text-green-500 mx-auto" /></WorkspaceTableCell>
                <WorkspaceTableCell className="text-center bg-primary/5 border-x border-x-primary/20"><Check size={16} className="text-green-500 mx-auto" /></WorkspaceTableCell>
                <WorkspaceTableCell className="text-center"><Check size={16} className="text-green-500 mx-auto" /></WorkspaceTableCell>
                <WorkspaceTableCell className="text-center"><Check size={16} className="text-green-500 mx-auto" /></WorkspaceTableCell>
              </WorkspaceTableRow>
              <WorkspaceTableRow>
                <WorkspaceTableCell>REST API & Webhooks</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center"><Check size={16} className="text-green-500 mx-auto" /></WorkspaceTableCell>
                <WorkspaceTableCell className="text-center bg-primary/5 border-x border-x-primary/20"><Check size={16} className="text-green-500 mx-auto" /></WorkspaceTableCell>
                <WorkspaceTableCell className="text-center"><Check size={16} className="text-green-500 mx-auto" /></WorkspaceTableCell>
                <WorkspaceTableCell className="text-center"><Check size={16} className="text-green-500 mx-auto" /></WorkspaceTableCell>
              </WorkspaceTableRow>
              <WorkspaceTableRow>
                <WorkspaceTableCell>Advanced Reporting</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center"><X size={16} className="text-text-muted/50 mx-auto" /></WorkspaceTableCell>
                <WorkspaceTableCell className="text-center bg-primary/5 border-x border-x-primary/20"><X size={16} className="text-text-muted/50 mx-auto" /></WorkspaceTableCell>
                <WorkspaceTableCell className="text-center"><Check size={16} className="text-green-500 mx-auto" /></WorkspaceTableCell>
                <WorkspaceTableCell className="text-center"><Check size={16} className="text-green-500 mx-auto" /></WorkspaceTableCell>
              </WorkspaceTableRow>
              <WorkspaceTableRow>
                <WorkspaceTableCell>Dedicated Infrastructure</WorkspaceTableCell>
                <WorkspaceTableCell className="text-center"><X size={16} className="text-text-muted/50 mx-auto" /></WorkspaceTableCell>
                <WorkspaceTableCell className="text-center bg-primary/5 border-x border-x-primary/20 border-b-2 border-b-primary rounded-b-xl"><X size={16} className="text-text-muted/50 mx-auto" /></WorkspaceTableCell>
                <WorkspaceTableCell className="text-center"><X size={16} className="text-text-muted/50 mx-auto" /></WorkspaceTableCell>
                <WorkspaceTableCell className="text-center"><Check size={16} className="text-green-500 mx-auto" /></WorkspaceTableCell>
              </WorkspaceTableRow>
            </WorkspaceTableBody>
          </WorkspaceTable>
        </WorkspaceTableWrapper>
      </div>
    </div>
  )
}
