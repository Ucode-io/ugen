'use client'
import { PanelLeftClose, PanelRightClose, CodeXml, Globe, LayoutDashboard, House, Monitor, Tablet, Smartphone, ChevronDown, Minimize, Maximize } from "lucide-react"
import { useRouter } from "@/shared/lib/i18n/navigation"
import { useTranslations } from "next-intl"
import { ReusableTabs } from "@/shared/ui"
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover"
import { useState } from "react"

export type DeviceType = 'desktop' | 'tablet' | 'mobile'

const DEVICES: { id: DeviceType; label: string; icon: React.ReactNode }[] = [
  { id: 'desktop', label: 'Desktop', icon: <Monitor size={14} /> },
  { id: 'tablet',  label: 'Tablet',  icon: <Tablet size={14} /> },
  { id: 'mobile',  label: 'Mobile',  icon: <Smartphone size={14} /> },
]

interface ProjectHeaderProps {
  projectTitle: string
  activeTab: 'dashboard' | 'code' | 'preview'
  setActiveTab: (tab: 'dashboard' | 'code' | 'preview') => void
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  isLoading: boolean
  hasNoFiles: boolean
  onSave?: () => void
  isChatCollapsed: boolean
  onToggleChat: () => void
  device: DeviceType
  onDeviceChange: (device: DeviceType) => void
  isPreviewMaximized: boolean
  onTogglePreviewMaximize: () => void
}

export const ProjectHeader = ({
  projectTitle,
  activeTab,
  setActiveTab,
  isSidebarCollapsed,
  onToggleSidebar,
  isLoading,
  hasNoFiles,
  onSave,
  isChatCollapsed,
  onToggleChat,
  device,
  onDeviceChange,
  isPreviewMaximized,
  onTogglePreviewMaximize,
}: ProjectHeaderProps) => {
  const router = useRouter()
  const t = useTranslations('features.project')
  const [deviceOpen, setDeviceOpen] = useState(false)

  const handleChangeTab = (tab: 'dashboard' | 'code' | 'preview') => {
    if (tab === 'code' && activeTab !== 'code') {
      onSave?.()
    }
    setActiveTab(tab)
  }

  const tabOptions = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    {
      id: 'preview',
      label: 'Preview',
      icon: <Globe size={16} />,
      disabled: isLoading
    },
    {
      id: 'code',
      label: 'Code',
      icon: <CodeXml size={16} />,
      // disabled: hasNoFiles || isLoading
    }
  ]

  const selectedDevice = DEVICES.find((d) => d.id === device) ?? DEVICES[0]

  return (
    <header className="h-[48px] border-b border-border-subtle bg-bg-card flex items-center justify-between px-4 shrink-0 z-10 transition-all duration-300">
      <div className="flex items-center gap-2">
        {/* <div className="bg-border-subtle w-[1px] h-4 mx-1" /> */}
        <button
          onClick={() => router.push('/projects')}
          className="text-text-muted hover:text-text-main hover:bg-hover-bg p-1 rounded-lg transition-colors flex items-center justify-center shrink-0"
          title="Back to Projects"
        >
          <House size={16} />
        </button>
        <h1 className="text-[15px] font-medium text-text-main truncate max-w-[300px] ml-1">
          {projectTitle}
        </h1>

        <button
          onClick={onToggleChat}
          className="text-text-muted hover:text-text-main hover:bg-hover-bg p-1 rounded-lg transition-colors flex items-center justify-center shrink-0 ml-[40px]"
          title={isChatCollapsed ? `Open AI Chat` : `Collapse AI Chat`}
        >
          {isChatCollapsed ? <PanelRightClose size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <ReusableTabs
        options={tabOptions}
        activeId={activeTab}
        onTabChange={(id) => handleChangeTab(id as 'dashboard' | 'code' | 'preview')}
      />

      <div className="flex items-center gap-1.5">
        {activeTab === 'preview' && (
          <>
            <Popover open={deviceOpen} onOpenChange={setDeviceOpen}>
              <PopoverTrigger asChild>
                <button
                  className="text-text-muted hover:text-text-main hover:bg-hover-bg flex h-7 items-center gap-1 px-2 rounded-lg transition-colors"
                  title={selectedDevice.label}
                >
                  {selectedDevice.icon}
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${deviceOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={6} className="w-36 p-1">
                {DEVICES.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => { onDeviceChange(d.id); setDeviceOpen(false) }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors
                      ${d.id === device
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-text-muted hover:bg-hover-bg hover:text-text-main'
                      }`}
                  >
                    {d.icon}
                    <span>{d.label}</span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            <button
              onClick={onTogglePreviewMaximize}
              className="text-text-muted hover:text-text-main hover:bg-hover-bg flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
              title={isPreviewMaximized ? 'Exit fullscreen' : 'Fullscreen preview'}
            >
              {isPreviewMaximized ? <Minimize size={14} /> : <Maximize size={14} />}
            </button>
          </>
        )}

        <div className="bg-border-subtle w-[1px] h-4 mx-2" />

        <button className="bg-primary text-white hover:bg-primary-hover px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors">
          {t('publish', { fallback: 'Publish' })}
        </button>
      </div>
    </header>
  )
}
