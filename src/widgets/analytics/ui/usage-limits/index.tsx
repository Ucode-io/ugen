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

export const UsageLimitsTab = ({ pricingData }: any) => {
  const d = pricingData?.data || {};

  const formatUnit = (value: number, unit: string) => {
    if (unit !== 'bytes') return value.toLocaleString();
    if (value === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(value) / Math.log(k));
    return parseFloat((value / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPercentage = (current: number, limit: number) => {
    if (!limit) return 0;
    return Math.min((current / limit) * 100, 100);
  };

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { key: 'functions', label: 'Server Functions', color: 'bg-primary', textColor: 'text-primary' },
          { key: 'microfrontend', label: 'Microfrontends', color: 'bg-blue-500', textColor: 'text-blue-500' },
          { key: 'database_size', label: 'Database Size', color: 'bg-green-500', textColor: 'text-green-500' },
          { key: 'asset_size', label: 'Asset Size', color: 'bg-purple-500', textColor: 'text-purple-500' },
          { key: 'users', label: 'Users', color: 'bg-orange-500', textColor: 'text-orange-500' },
        ].map((metric) => {
          const item = d[metric.key];
          const current = item?.current || 0;
          const limit = item?.limit || 0;
          const unit = item?.unit || 'count';
          const percentage = getPercentage(current, limit);
          
          return (
            <div key={metric.key} className="bg-bg-card border border-border-subtle rounded-xl p-4">
              <div className="text-xs text-text-muted font-semibold mb-2">{metric.label}</div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className={cn("text-[22px] font-bold", metric.textColor)}>{formatUnit(current, unit)}</span>
                <span className="text-[12px] text-text-muted">/ {formatUnit(limit, unit)}</span>
              </div>
              <div className="h-1.5 bg-bg-sidebar rounded-full overflow-hidden mb-1.5">
                <div 
                  className={cn("h-full rounded-full transition-all duration-500", metric.color)} 
                  style={{ width: `${percentage}%` }} 
                />
              </div>
              <div className="text-[11px] text-text-muted">
                {formatUnit(Math.max(limit - current, 0), unit)} remaining
              </div>
            </div>
          );
        })}
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
