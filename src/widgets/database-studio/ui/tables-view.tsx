"use client";

import React from "react";
import { Plus, Table as TableIcon, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import {
  useTables,
  useDatabaseStore,
  useDeleteTable,
  useCreateTable,
} from "@/entities/database";
import { useAuthStore } from "@/entities/session";
import { Skeleton } from "@/shared/ui";
import { Table } from "@/entities/database/model/types";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/shared/ui";
import { Button, Input, Label } from "@/shared/ui";
import { toast } from "sonner";

export const TablesView = () => {
  const t = useTranslations("widgets.databaseStudio");
  const ucodeProjectId = useAuthStore((state) => state.ucodeProjectId);

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: tables, isLoading } = useTables(debouncedSearch);
  const { setSelectedTable } = useDatabaseStore();
  const deleteTableMutation = useDeleteTable();
  const createTableMutation = useCreateTable();
  const [tableToDelete, setTableToDelete] = React.useState<Table | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");

  const resetCreateForm = () => {
    setLabel("");
    setSlug("");
    setDescription("");
  };

  const handleCreate = async () => {
    if (!ucodeProjectId) return;
    const trimmedLabel = label.trim();
    const trimmedSlug = slug.trim();
    if (!trimmedLabel) {
      toast.error("Label is required");
      return;
    }
    if (!trimmedSlug) {
      toast.error("Slug is required");
      return;
    }

    try {
      await createTableMutation.mutateAsync({
        projectId: ucodeProjectId,
        payload: {
          label: trimmedLabel,
          slug: trimmedSlug,
          menu_id: "c57eedc3-a954-4262-a0af-376c65b5a284",
          description: description.trim(),
        },
      });
      toast.success("Table created");
      setIsCreateOpen(false);
      resetCreateForm();
    } catch (error) {
      console.error("Create table error:", error);
      toast.error("Failed to create table");
    }
  };

  const handleDelete = async () => {
    if (!tableToDelete || !ucodeProjectId) return;

    try {
      await deleteTableMutation.mutateAsync({
        tableId: tableToDelete.id,
        projectId: ucodeProjectId,
      });
      toast.success(t("tables.deleteSuccess"));
      setTableToDelete(null);
    } catch (error) {
      console.error("Delete table error:", error);
      toast.error(t("tables.deleteError"));
    }
  };

  if (isLoading && !debouncedSearch) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 px-2">
        <input
          placeholder="Search tables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-bg-main border-border-subtle w-full rounded-md border px-2 py-1.5 text-[11px] outline-none focus:border-[#004eea]"
        />
      </div>

      <div className="flex flex-col gap-0.5">
        {tables?.map((table: Table) => {
          const isActive =
            useDatabaseStore.getState().selectedTable === table.slug;
          return (
            <div
              key={table.id}
              onClick={() => {
                setSelectedTable(table.slug);
              }}
              className={cn(
                "group mx-2 flex cursor-pointer items-center rounded-lg px-3 py-1 text-[13px] transition-colors",
                isActive
                  ? "bg-[#004eea]/10 font-medium text-[#004eea]"
                  : "text-text-muted hover:bg-bg-sidebar hover:text-text-main",
              )}
            >
              <TableIcon
                size={12}
                className={cn(
                  "mr-2",
                  isActive
                    ? "text-[#004eea]"
                    : "text-text-muted/70 group-hover:text-text-main/70",
                )}
              />
              <span className="truncate">{table.label}</span>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setTableToDelete(table)
                }}
                className={cn(
                  "ml-auto p-1 rounded-md transition-all",
                  isActive ? "text-[#004eea]/60 hover:text-destructive" : "opacity-0 group-hover:opacity-100 text-text-muted/60 hover:text-destructive"
                )}
                title={t('tables.delete')}
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}

        <div className="mt-1 px-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="text-text-muted hover:bg-bg-sidebar flex w-full items-center gap-2 rounded-lg px-3 py-1 text-[13px] transition-colors hover:text-[#004eea]"
          >
            <Plus size={12} />
            <span className="truncate">Create table</span>
          </button>
        </div>
      </div>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TableIcon size={18} />
              Create new table
            </DialogTitle>
            <DialogDescription className="pt-1">
              Define a label and slug for the new table.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-table-label">Label</Label>
              <Input
                id="create-table-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Customers"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-table-slug">Slug</Label>
              <Input
                id="create-table-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. customers"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-table-description">Description</Label>
              <Input
                id="create-table-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                resetCreateForm();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={createTableMutation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!tableToDelete}
        onOpenChange={(open) => !open && setTableToDelete(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 size={20} />
              {t("tables.deleteConfirmTitle")}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t("tables.deleteConfirmDescription", {
                table: tableToDelete?.label || "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setTableToDelete(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleDelete}
              loading={deleteTableMutation.isPending}
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
