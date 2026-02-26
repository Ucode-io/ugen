'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { Search, X, Folder, Image as ImageIcon } from 'lucide-react'
import { useState, useEffect } from 'react'

interface SearchModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

const mockProjects = [
  {
    id: 1,
    title: 'Simple Site Creator',
    user: 'Nurmuhammad Mahmudov',
    userInitial: 'N',
    time: '2 hours ago',
    type: 'folder'
  },
  {
    id: 2,
    title: 'Remix of Ai Video Studio Landing Page',
    user: 'Nurmuhammad Mahmudov',
    userInitial: 'N',
    time: '1 day ago',
    type: 'image'
  },
  {
    id: 3,
    title: 'Heartfelt Creations',
    user: 'Nurmuhammad Mahmudov',
    userInitial: 'N',
    time: '2 days ago',
    type: 'folder'
  }
]

export const SearchModal = ({ isOpen, onOpenChange }: SearchModalProps) => {
  const [searchQuery, setSearchQuery] = useState('')

  // Clear search on open/close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />
        <Dialog.Content
          className="fixed left-[50%] top-[50%] z-50 w-full max-w-[700px] translate-x-[-50%] translate-y-[-50%] bg-bg-card border border-border-subtle rounded-xl shadow-2xl overflow-hidden focus:outline-none"
        >
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <Dialog.Description className="sr-only">Search projects and folders</Dialog.Description>

          {/* Header - Search Input */}
          <div className="flex items-center px-4 py-3 border-b border-border-subtle">
            <Search className="text-text-muted mr-3" size={24} />
            <input
              type="text"
              placeholder="Search projects and folders"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-xl text-text-main outline-none placeholder:text-text-muted"
              autoFocus
            />
            <Dialog.Close asChild>
              <button className="text-text-muted hover:text-text-main transition-colors p-1 rounded-md hover:bg-hover-bg ml-2">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body - Results */}
          <div className="p-2 max-h-[50vh] overflow-y-auto">
            <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-text-muted uppercase">
              Recent Projects
            </div>

            <div className="space-y-1">
              {mockProjects.map(project => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-hover-bg cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    {/* Icon / Image Placeholder */}
                    <div className="h-12 w-[84px] shrink-0 rounded-md overflow-hidden bg-bg-sidebar flex items-center justify-center border border-border-subtle">
                      {project.type === 'image' ? (
                        <div className="h-full w-full bg-blue-900/30 relative flex items-center justify-center">
                          {/* Abstract elements to simulate the thumbnail from screenshot */}
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 mix-blend-overlay"></div>
                          <ImageIcon size={20} className="text-blue-500/50" />
                        </div>
                      ) : (
                        <Folder size={20} className="text-text-muted" />
                      )}
                    </div>

                    {/* Text Details */}
                    <div>
                      <h4 className="text-[15px] font-semibold text-text-main transition-colors">
                        {project.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-[9px] font-bold">
                          {project.userInitial}
                        </div>
                        <span className="text-xs text-text-muted font-medium">
                          {project.user}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="text-xs text-text-muted font-medium whitespace-nowrap hidden sm:block pr-2">
                    {project.time}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
