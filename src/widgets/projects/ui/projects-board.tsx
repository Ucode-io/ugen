"use client";
import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  useProjectsList,
  useCompanyProjects,
  useSwitchProject,
} from "@/entities/project";
import {
  useProjectFolders,
  useProjectFolder,
  useCreateProjectFolder,
  ProjectFolder,
} from "@/entities/project-folder";
import { useAuthStore } from "@/entities/session";
import { ProjectsToolbar } from "./projects-toolbar";
import { ProjectsGrid } from "./projects-grid";
import { ProjectsList } from "./projects-list";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ChevronRight, MoreHorizontal, FolderPlus } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMemo } from "react";

export const ProjectsBoard = () => {
  const tNav = useTranslations("Navigation");
  const tWidgets = useTranslations("widgets.projects");
  const tCommon = useTranslations("widgets.common");
  const { project, refreshToken, user, switchProjectAuth, activeCompanyId } = useAuthStore();
  const { mutateAsync: switchProject } = useSwitchProject();
  const isUgen = project?.is_ugen ?? false;
  const [switchingProjectId, setSwitchingProjectId] = useState<string | null>(
    null,
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [viewType, setViewType] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Current folder
  const folderId = searchParams.get("folder_id") || undefined;
  const companyId = activeCompanyId || undefined;

  // Fetch folders and projects
  const { data: currentFolder } = useProjectFolder(folderId || "");
  const { data: folderItems, isLoading: isFoldersLoading } = useProjectFolders(
    folderId,
    undefined,
    !!folderId,
  );

  // Extract IDs of projects that belong to the current folder
  const projectIdsInFolder = useMemo(() => {
    if (!folderId || !folderItems) return undefined;
    return folderItems
      .filter(
        (item: ProjectFolder) =>
          item.type?.toUpperCase() === "PROJECT" && item.mcp_project_id,
      )
      .map((item: ProjectFolder) => item.mcp_project_id as string);
  }, [folderId, folderItems]);

  // If we are in a folder and there are no projects in it, we don't need to fetch projects.
  // Otherwise, if we are in a folder, fetch only those IDs.
  // If not in a folder, fetch all (or by search).
  const shouldFetchProjects =
    !folderId || (projectIdsInFolder && projectIdsInFolder.length > 0);

  const fetchParams = useMemo(() => {
    const params: any = {};
    if (debouncedSearchQuery) params.title = debouncedSearchQuery;
    if (folderId) params.ids = projectIdsInFolder || [];
    params.limit = 1000;
    return params;
  }, [debouncedSearchQuery, folderId, projectIdsInFolder]);

  const useCompanyLogic = !isUgen;

  const { data: projectsResponse, isLoading: isProjectsLoading } =
    useProjectsList(fetchParams, {
      enabled: !!shouldFetchProjects && !useCompanyLogic && isUgen,
    });

  const { data: companyProjectsData, isLoading: isCompanyProjectsLoading } =
    useCompanyProjects(companyId ?? "");

  const createFolder = useCreateProjectFolder();
  const [isCreatePopoverOpen, setIsCreatePopoverOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  const rawData = useCompanyLogic
    ? Array.isArray(companyProjectsData)
      ? companyProjectsData
      : companyProjectsData?.projects || companyProjectsData?.data || []
    : projectsResponse?.response || projectsResponse?.data || projectsResponse;
  const projectsList = Array.isArray(rawData)
    ? rawData
    : rawData?.projects || [];

  const isSearching = debouncedSearchQuery.length > 0;

  const foldersDisplay: any[] = [];

  if (!isSearching && folderItems) {
    folderItems.forEach((f: ProjectFolder) => {
      if (f.type?.toUpperCase() === "FOLDER") {
        foldersDisplay.push({
          id: f.id,
          name: f.label,
          rawFolder: f,
        });
      }
    });
  }

  const projectsDisplay = projectsList.map((p: any) => {
    // company-project API may use different id field names
    const resolvedId = p.id || p.project_id || p.mcp_project_id;

    const folderItem =
      folderId && folderItems
        ? folderItems.find(
            (f: ProjectFolder) =>
              f.type?.toUpperCase() === "PROJECT" &&
              f.mcp_project_id === resolvedId,
          )
        : undefined;

    return {
      ...p,
      id: resolvedId,
      isFolder: false,
      mcp_project_id: resolvedId,
      folderItemId: folderItem?.id,
      name: p.name || p.title || tWidgets("untitledProject"),
      description: p.description || "",
      editedAt: p.updated_at
        ? tWidgets("edited", {
            date: new Date(p.updated_at).toLocaleDateString(),
          })
        : tWidgets("recentlyEdited"),
      createdAt: p.created_at
        ? new Date(p.created_at).toLocaleDateString()
        : tWidgets("unknown"),
      author: {
        name: p.user?.name || p.owner || tWidgets("unknownAuthor"),
        initials: (p.user?.name || p.owner || "U")
          .substring(0, 2)
          .toUpperCase(),
      },
      image: p.project_image || p.image || p.thumbnail || null,
      microfrontend_url: p.microfrontend_url || null,
      rawProject: p,
    };
  });

  const isLoading =
    isFoldersLoading ||
    (useCompanyLogic ? isCompanyProjectsLoading : isProjectsLoading);

  const handleProjectClick = async (proj: any) => {
    if (switchingProjectId) return;
    const id = proj.mcp_project_id;
    if (!id) return;

    // Company projects always need a refresh before entering workspace
    if (useCompanyLogic) {
      setSwitchingProjectId(id);
      try {
        const envId = proj.environment_id || proj.rawProject?.environment_id || "";
        const responseData = await switchProject({
          refresh_token: refreshToken ?? "",
          role_id: user?.role?.id ?? "",
          client_type_id: user?.role?.client_type_id ?? "",
          env_id: envId,
          project_id: id,
        });
        const token = responseData?.token;
        const is_ugen = proj.rawProject?.is_ugen ?? proj.is_ugen ?? false;
        switchProjectAuth(
          { project_id: id, title: proj.name, environment_id: envId, is_ugen, company_id: companyId },
          token.access_token,
          token.refresh_token,
        );
      } catch (err) {
        console.error("Refresh before project open failed", err);
      } finally {
        setSwitchingProjectId(null);
      }
    }

    router.push(`/projects/${id}` as any);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsCreatePopoverOpen(false);
      }
    };
    if (isCreatePopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCreatePopoverOpen]);

  const handleCreateFolderSave = async () => {
    if (newFolderName.trim()) {
      try {
        await createFolder.mutateAsync({
          label: newFolderName.trim(),
          type: "FOLDER",
          parent_id: folderId || null,
          order_number: foldersDisplay.length + 1,
        });
        setIsCreateModalOpen(false);
        setNewFolderName("");
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="bg-bg-card flex h-full w-full flex-col rounded-2xl p-6 shadow-sm">
      <div className="relative mb-6 flex items-center gap-4" ref={popoverRef}>
        <h1 className="text-text-main flex items-center gap-2 text-2xl font-semibold">
          {folderId ? (
            <>
              <button
                onClick={() => router.push(pathname as any)}
                className="hover:text-primary transition-colors"
              >
                {tNav("projects")}
              </button>
              <ChevronRight size={20} className="text-text-muted" />
              <span>{currentFolder?.label || tWidgets("loading")}</span>
            </>
          ) : (
            tNav("projects")
          )}
        </h1>

        {isUgen && (
          <button
            onClick={() => setIsCreatePopoverOpen(!isCreatePopoverOpen)}
            className="text-text-muted hover:bg-hover-bg hover:text-text-main ml-1 flex h-8 w-8 items-center justify-center rounded-md transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>
        )}

        {isCreatePopoverOpen && isUgen && (
          <div className="border-border-subtle bg-bg-card absolute top-full left-[130px] z-[100] mt-1 w-48 overflow-hidden rounded-lg border shadow-lg">
            <button
              onClick={() => {
                setIsCreatePopoverOpen(false);
                setIsCreateModalOpen(true);
              }}
              className="text-text-main hover:bg-hover-bg flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium transition-colors"
            >
              <FolderPlus size={16} />
              {tWidgets("createFolder")}
            </button>
          </div>
        )}
      </div>

      <ProjectsToolbar
        viewType={viewType}
        setViewType={setViewType}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isUgen={isUgen}
      />

      <div className="mt-6 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-64 w-full items-center justify-center">
            <div className="border-bg-sidebar border-t-primary h-8 w-8 animate-spin rounded-full border-4"></div>
          </div>
        ) : viewType === "grid" ? (
          <ProjectsGrid
            projects={projectsDisplay}
            folders={foldersDisplay}
            readOnly={!isUgen}
            onProjectClick={handleProjectClick}
            switchingProjectId={switchingProjectId}
          />
        ) : (
          <ProjectsList
            projects={projectsDisplay}
            folders={foldersDisplay}
            readOnly={!isUgen}
            onProjectClick={handleProjectClick}
            onFolderClick={(f) => router.push(`/projects?folder_id=${f.id}` as any)}
            switchingProjectId={switchingProjectId}
          />
        )}
      </div>

      {/* Create Folder Modal */}
      <Dialog.Root open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="border-border-subtle bg-bg-card fixed top-1/2 left-1/2 z-[120] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-2xl focus:outline-none">
            <Dialog.Title className="text-text-main text-lg font-semibold uppercase">
              {tWidgets("createFolder")}
            </Dialog.Title>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="folderName"
                  className="text-text-main text-sm font-medium"
                >
                  {tWidgets("folderName")}
                </label>
                <input
                  id="folderName"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="border-border-subtle bg-bg-main text-text-main focus:border-primary/50 focus:ring-primary/5 w-full rounded-lg border px-3 py-2 text-sm transition-all outline-none focus:ring-4"
                  placeholder={tWidgets("folderPlaceholder")}
                  autoFocus
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleCreateFolderSave()
                  }
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="border-border-subtle text-text-main hover:bg-hover-bg rounded-lg border px-4 py-2 text-sm font-medium transition-colors">
                  {tCommon("cancel")}
                </button>
              </Dialog.Close>
              <button
                onClick={handleCreateFolderSave}
                disabled={createFolder.isPending || !newFolderName.trim()}
                className="bg-primary hover:bg-primary-hover rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
              >
                {createFolder.isPending
                  ? tWidgets("creating")
                  : tWidgets("create")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};
