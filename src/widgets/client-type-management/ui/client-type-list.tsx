'use client'

import { useState } from "react"
import { Plus, Edit2, Shield, Globe, Users2, Database, AlertCircle, RefreshCw, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/shared/ui/ui/button"
import { useClientTypes, ClientType } from "@/entities/client-type"
import { ClientTypeModal } from "@/features/client-type-form"
import { useAuthStore } from "@/entities/session"

export const ClientTypeManagement = () => {
  const projectId = useAuthStore(state => state.project?.project_id)
  const { data: clientTypes = [], isLoading, isError, refetch } = useClientTypes(projectId)

  console.log(clientTypes)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ClientType | null>(null)

  const handleEdit = (item: ClientType) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setSelectedItem(null)
    setIsModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-text-muted font-medium">Loading client platforms...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-text-main">Failed to load Client Types</h3>
          <p className="text-text-muted max-w-[320px]">
            We couldn't retrieve the list from the server. Please try again.
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="rounded-xl px-8 h-12 bg-white/5 border-white/10">
          <RefreshCw className="mr-2 w-4 h-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-text-main to-text-muted bg-clip-text text-transparent">
            Client Types
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Manage your project's authentication platforms and user scopes.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="rounded-lg px-8"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Client Type
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {clientTypes?.map((item, index) => (
            <motion.div
              layout
              key={item.guid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative h-full bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 overflow-hidden"
            >
              {/* Background Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10 flex flex-col h-full gap-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-bg-sidebar border border-border-subtle flex items-center justify-center group-hover:border-primary/20 transition-all duration-300">
                      {item.is_system ? (
                        <Shield className="w-6 h-6 text-primary" />
                      ) : (
                        <Globe className="w-6 h-6 text-text-muted group-hover:text-primary transition-colors" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-text-main text-lg leading-tight truncate max-w-[140px]">
                          {item.name}
                        </h3>
                        {item.is_system && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-tighter">
                            System
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Database size={10} className="text-text-muted" />
                        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">{item.table_slug}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(item)}
                    className="w-8 h-8 rounded-lg border border-border-subtle bg-bg-sidebar hover:bg-primary/10 hover:text-primary transition-all"
                  >
                    <Edit2 size={14} />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-bg-sidebar border border-border-subtle/50 group-hover:border-border-subtle transition-colors">
                    <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-tight">
                      <Users2 size={13} strokeWidth={2.5} />
                      Sessions
                    </div>
                    <span className="text-sm font-bold text-text-main">{item.session_limit}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-bg-sidebar border border-border-subtle/50 group-hover:border-border-subtle transition-colors">
                    <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-tight">
                      <Globe size={13} strokeWidth={2.5} />
                      Registration
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.self_register ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-text-muted/10 text-text-muted border border-text-muted/20'}`}>
                      {item.self_register ? 'Public' : 'Private'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-bg-sidebar border border-border-subtle/50 group-hover:border-border-subtle transition-colors">
                    <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-tight">
                      <RefreshCw size={13} strokeWidth={2.5} />
                      Recovery
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.self_recover ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-text-muted/10 text-text-muted border border-text-muted/20'}`}>
                      {item.self_recover ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                {item.default_page && (
                  <div className="mt-2 px-3 py-2 rounded-lg bg-bg-sidebar/50 border border-border-subtle/30 flex items-center gap-2 group/link cursor-default">
                    <div className="w-5 h-5 rounded-md bg-bg-card flex items-center justify-center border border-border-subtle">
                      <Globe size={10} className="text-text-muted group-hover/link:text-primary transition-colors" />
                    </div>
                    <span className="text-[11px] text-text-muted truncate flex-1 font-medium group-hover/link:text-text-main transition-colors">
                      {item.default_page.replace('https://', '').replace('http://', '')}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <ClientTypeModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        projectId={projectId!}
        initialData={selectedItem}
      />
    </div>
  )
}
