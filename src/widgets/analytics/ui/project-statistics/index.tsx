import React from 'react'
import { ArrowUp, ArrowDown, Rocket, Bot, Plug, Puzzle, Bell, Folder, Key, Database, LineChart, List } from 'lucide-react'
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

export const ProjectStatisticsTab = ({ pricingData }: any) => {
  const d = pricingData?.data || {};

  const formatUnit = (value: number, unit: string) => {
    if (unit !== 'bytes') return value.toLocaleString();
    if (value === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(value) / Math.log(k));
    return parseFloat((value / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 pt-4 animate-in fade-in duration-300">
      {/* Stat cards row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
          <div className="text-xs text-text-muted font-semibold mb-2">Microfrontends</div>
          <div className="text-[22px] font-bold text-primary mb-1">
            {formatUnit(d.microfrontend?.current || 0, d.microfrontend?.unit || 'count')}
          </div>
          <div className="text-[11px] text-text-muted">
            Limit: {formatUnit(d.microfrontend?.limit || 0, d.microfrontend?.unit || 'count')}
          </div>
        </div>
        <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
          <div className="text-xs text-text-muted font-semibold mb-2">Server Functions</div>
          <div className="text-[22px] font-bold text-purple-500 mb-1">
            {formatUnit(d.functions?.current || 0, d.functions?.unit || 'count')}
          </div>
          <div className="text-[11px] text-text-muted">
             Limit: {formatUnit(d.functions?.limit || 0, d.functions?.unit || 'count')}
          </div>
        </div>
        <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
          <div className="text-xs text-text-muted font-semibold mb-2">Database Size</div>
          <div className="text-[22px] font-bold text-green-500 mb-1">
             {formatUnit(d.database_size?.current || 0, d.database_size?.unit || 'bytes')}
          </div>
          <div className="text-[11px] text-text-muted">
             Limit: {formatUnit(d.database_size?.limit || 0, d.database_size?.unit || 'bytes')}
          </div>
        </div>
        <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
          <div className="text-xs text-text-muted font-semibold mb-2">Users</div>
          <div className="text-[22px] font-bold text-orange-500 mb-1">
             {formatUnit(d.users?.current || 0, d.users?.unit || 'count')}
          </div>
          <div className="text-[11px] text-text-muted">
             Limit: {formatUnit(d.users?.limit || 0, d.users?.unit || 'count')}
          </div>
        </div>
      </div>

      {/* Stat cards row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
          <div className="text-xs text-text-muted font-semibold mb-2">API Calls (24h)</div>
          <div className="text-[22px] font-bold text-text-main mb-1">12,847</div>
          <div className="flex items-center gap-1.5 text-[11px] text-green-500 font-medium">
            <ArrowUp size={12} /> +18% from yesterday
          </div>
        </div>
        <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
          <div className="text-xs text-text-muted font-semibold mb-2">Active Users</div>
          <div className="text-[22px] font-bold text-text-main mb-1">4</div>
          <div className="text-[11px] text-text-muted font-medium">2 online now</div>
        </div>
        <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
          <div className="text-xs text-text-muted font-semibold mb-2">Avg Response Time</div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-[22px] font-bold text-text-main">142</span>
            <span className="text-[13px] text-text-muted font-normal">ms</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-green-500 font-medium">
            <ArrowDown size={12} /> -23ms from last week
          </div>
        </div>
        <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
          <div className="text-xs text-text-muted font-semibold mb-2">Error Rate</div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-[22px] font-bold text-text-main">0.3</span>
            <span className="text-[13px] text-text-muted font-normal">%</span>
          </div>
          <div className="text-[11px] text-text-muted font-medium">4 errors in last 24h</div>
        </div>
      </div>

      {/* Bar chart placeholder */}
      <div>
        <h2 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
          <LineChart size={18} className="text-text-muted" />
          API Requests (Last 7 Days)
        </h2>
        <div className="bg-bg-card border border-border-subtle rounded-xl h-[200px] flex items-end gap-3 p-5 pb-6">
           <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
             <div className="w-full bg-primary rounded-t-md h-[60%]" />
             <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Mon</span>
           </div>
           <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
             <div className="w-full bg-primary rounded-t-md h-[75%]" />
             <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Tue</span>
           </div>
           <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
             <div className="w-full bg-primary rounded-t-md h-[45%]" />
             <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Wed</span>
           </div>
           <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
             <div className="w-full bg-primary rounded-t-md h-[90%]" />
             <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Thu</span>
           </div>
           <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
             <div className="w-full bg-primary rounded-t-md h-[82%]" />
             <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Fri</span>
           </div>
           <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
             <div className="w-full bg-primary/40 rounded-t-md h-[30%]" />
             <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Sat</span>
           </div>
           <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
             <div className="w-full bg-primary/40 rounded-t-md h-[25%]" />
             <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Sun</span>
           </div>
        </div>
      </div>

      {/* Low-code stats table */}
      <div>
        <h2 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
          <List size={18} className="text-text-muted" />
          Low-Code Statistics
        </h2>
        <WorkspaceTableWrapper>
          <WorkspaceTable>
            <WorkspaceTableHeader>
              <WorkspaceTableRow>
                <WorkspaceTableHead className="w-1/2">Metric</WorkspaceTableHead>
                <WorkspaceTableHead className="w-1/4">Value</WorkspaceTableHead>
                <WorkspaceTableHead className="w-1/4">Change</WorkspaceTableHead>
              </WorkspaceTableRow>
            </WorkspaceTableHeader>
            <WorkspaceTableBody>
              <WorkspaceTableRow>
                <WorkspaceTableCell>
                  <div className="flex items-center gap-3">
                    <Rocket size={15} className="text-primary w-4" />
                    <span>Total Deployments</span>
                  </div>
                </WorkspaceTableCell>
                <WorkspaceTableCell className="font-bold">47</WorkspaceTableCell>
                <WorkspaceTableCell className="text-green-500 font-medium text-[12px]">
                   <div className="flex items-center gap-1.5"><ArrowUp size={12} /> +12 this week</div>
                </WorkspaceTableCell>
              </WorkspaceTableRow>
              <WorkspaceTableRow>
                <WorkspaceTableCell>
                  <div className="flex items-center gap-3">
                    <Bot size={15} className="text-purple-500 w-4" />
                    <span>AI Code Generations</span>
                  </div>
                </WorkspaceTableCell>
                <WorkspaceTableCell className="font-bold">234</WorkspaceTableCell>
                <WorkspaceTableCell className="text-green-500 font-medium text-[12px]">
                   <div className="flex items-center gap-1.5"><ArrowUp size={12} /> +38 this week</div>
                </WorkspaceTableCell>
              </WorkspaceTableRow>
              <WorkspaceTableRow>
                <WorkspaceTableCell>
                  <div className="flex items-center gap-3">
                    <Plug size={15} className="text-blue-500 w-4" />
                    <span>Custom Endpoints</span>
                  </div>
                </WorkspaceTableCell>
                <WorkspaceTableCell className="font-bold">4</WorkspaceTableCell>
                <WorkspaceTableCell className="text-text-muted">—</WorkspaceTableCell>
              </WorkspaceTableRow>
              <WorkspaceTableRow>
                <WorkspaceTableCell>
                  <div className="flex items-center gap-3">
                    <Puzzle size={15} className="text-green-500 w-4" />
                    <span>Active Integrations</span>
                  </div>
                </WorkspaceTableCell>
                <WorkspaceTableCell className="font-bold">4</WorkspaceTableCell>
                <WorkspaceTableCell className="text-text-muted">—</WorkspaceTableCell>
              </WorkspaceTableRow>
              <WorkspaceTableRow>
                <WorkspaceTableCell>
                  <div className="flex items-center gap-3">
                    <Bell size={15} className="text-yellow-500 w-4" />
                    <span>Webhook Events</span>
                  </div>
                </WorkspaceTableCell>
                <WorkspaceTableCell className="font-bold">1,892</WorkspaceTableCell>
                <WorkspaceTableCell className="text-green-500 font-medium text-[12px]">
                   <div className="flex items-center gap-1.5"><ArrowUp size={12} /> +241 this week</div>
                </WorkspaceTableCell>
              </WorkspaceTableRow>
              <WorkspaceTableRow>
                <WorkspaceTableCell>
                  <div className="flex items-center gap-3">
                    <Folder size={15} className="text-primary w-4" />
                    <span>Files Stored</span>
                  </div>
                </WorkspaceTableCell>
                <WorkspaceTableCell className="font-bold">2,156</WorkspaceTableCell>
                <WorkspaceTableCell className="text-text-muted text-[12px]">2.4 GB used</WorkspaceTableCell>
              </WorkspaceTableRow>
              <WorkspaceTableRow>
                <WorkspaceTableCell>
                  <div className="flex items-center gap-3">
                    <Key size={15} className="text-text-muted w-4" />
                    <span>Secrets</span>
                  </div>
                </WorkspaceTableCell>
                <WorkspaceTableCell className="font-bold">5</WorkspaceTableCell>
                <WorkspaceTableCell className="text-text-muted">—</WorkspaceTableCell>
              </WorkspaceTableRow>
              <WorkspaceTableRow>
                <WorkspaceTableCell>
                  <div className="flex items-center gap-3">
                    <Database size={15} className="text-blue-500 w-4" />
                    <span>Total DB Rows</span>
                  </div>
                </WorkspaceTableCell>
                <WorkspaceTableCell className="font-bold">62,432</WorkspaceTableCell>
                <WorkspaceTableCell className="text-green-500 font-medium text-[12px]">
                   <div className="flex items-center gap-1.5"><ArrowUp size={12} /> +1,204 this week</div>
                </WorkspaceTableCell>
              </WorkspaceTableRow>
            </WorkspaceTableBody>
          </WorkspaceTable>
        </WorkspaceTableWrapper>
      </div>

    </div>
  )
}
