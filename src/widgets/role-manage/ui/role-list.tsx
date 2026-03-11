'use client'

import { useState } from "react"
import { Plus, Edit2, Shield, User, Key, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/shared/ui/ui/button"
import { DataLoadingState, DataErrorState } from "@/shared/ui/data-states"

export interface Role {
  client_platform_id: string | null;
  client_type_id: string;
  guid: string;
  is_system: boolean;
  name: string;
  project_id: string;
  status: boolean;
}

const mockRoles: Role[] = [
  {
    "client_platform_id": null,
    "client_type_id": "f084aadd-c171-4dc8-aa44-66f9b3b83528",
    "guid": "a9ebaaed-33ea-4457-ac3f-91cba6235326",
    "is_system": false,
    "name": "user",
    "project_id": "d7102b28-a455-439c-a5ab-228514ea8782",
    "status": true
  },
  {
    "client_platform_id": null,
    "client_type_id": "fc0b4109-f230-46a8-8e12-a5f26a722642",
    "guid": "b228b50d-6669-49d7-ba94-45a344b0a6b6",
    "is_system": false,
    "name": "New",
    "project_id": "d7102b28-a455-439c-a5ab-228514ea8782",
    "status": true
  },
  {
    "client_platform_id": "92da52d7-e0e2-4e88-b501-827533c225a2",
    "client_type_id": "f084aadd-c171-4dc8-aa44-66f9b3b83528",
    "guid": "479f8b9a-347a-43e5-9be5-62f346cd6866",
    "is_system": true,
    "name": "DEFAULT ADMIN",
    "project_id": "003344df-8c26-436a-b986-fe7b3e974e9e",
    "status": true
  }
];

export const RoleList = () => {
  // Mock query state for now
  const isLoading = false;
  const isError = false;
  const roles = mockRoles;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Role | null>(null);

  const handleEdit = (item: Role) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <DataLoadingState message="Loading roles..." />
  }

  if (isError) {
    return (
      <DataErrorState
        title="Failed to load Roles"
        onRetry={() => { }}
      />
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-text-main to-text-muted bg-clip-text text-transparent">
            Roles Management
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Manage your project's roles and permissions.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="rounded-lg px-8"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Role
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {roles?.map((item, index) => (
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
                        <User className="w-6 h-6 text-text-muted group-hover:text-primary transition-colors" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-text-main text-lg leading-tight truncate max-w-[120px]">
                          {item.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1.5">
                          <Key size={10} className="text-text-muted" />
                          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                            {item.guid.split('-')[0]}
                          </span>
                        </div>
                        {item.is_system && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-tighter">
                            System
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(item)}
                    className="w-8 h-8 shrink-0 rounded-lg border border-border-subtle bg-bg-sidebar hover:bg-primary/10 hover:text-primary transition-all"
                  >
                    <Edit2 size={14} />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-2 mt-auto">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-bg-sidebar border border-border-subtle/50 group-hover:border-border-subtle transition-colors">
                    <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-tight">
                      <RefreshCw size={13} strokeWidth={2.5} />
                      Status
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                      {item.status ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mocking the modal rendering condition */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setIsModalOpen(false)}>
          <div className="bg-bg-card p-6 rounded-2xl border border-border-subtle w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{selectedItem ? 'Edit Role' : 'Create Role'}</h2>
            <p className="text-text-muted mb-6">Modal form placeholder for {selectedItem?.name || 'new role'}.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={() => setIsModalOpen(false)}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
