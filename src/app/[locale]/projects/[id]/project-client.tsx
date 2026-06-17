"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { WorkspaceChat } from "@/widgets/workspace-chat";
import { Loader2 } from "lucide-react";
import { ProjectCodeViewer } from "@/widgets/project-workspace/ui/project-code-viewer";
import { ProjectPreviewViewer } from "@/widgets/project-workspace/ui/project-preview-viewer";
import {
  ensureEsbuild,
  WASM_URL,
} from "@/widgets/project-workspace/lib/bundler";
import { useRouter } from "@/shared/lib/i18n/navigation";
import { api } from "@/shared/api";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/entities/session";
import type { CodeEditorTarget } from "@/entities/session";
import { useCodeSelectionStore } from "@/entities/project/model/code-selection-store";
import { useFilesStore, IFile } from "@/entities/project/model/files-store";
import { useDirtyFilesStore } from "@/entities/project/model/dirty-files-store";
import { useMobileProjectStore } from "@/entities/project/model/mobile-project-store";
import { CommitModal } from "@/widgets/project-workspace/ui/commit-modal";
import { UnsavedChangesModal } from "@/widgets/project-workspace/ui/unsaved-changes-modal";
import { toast } from "sonner";

import {
  ProjectHeader,
  DeviceType,
} from "@/widgets/project-workspace/ui/project-header";
import { WorkspaceLoader } from "@/widgets/project-workspace/ui/workspace-loader";
import { ProjectDashboard } from "@/widgets/project-workspace/ui/project-dashboard";
import { EmptyProjectView } from "@/widgets/project-workspace/ui/empty-project-view";
import { ProjectBuildingAnimation } from "@/widgets/project-workspace/ui/project-building-animation";
import { StreamErrorView } from "@/widgets/project-workspace/ui/stream-error-view";
import {
  ErrorBoundary,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import { useSearchParams } from "next/navigation";
import { useChatStore } from "@/entities/chat";
import { cn } from "@/shared/lib/utils/cn";

// Tab order as shown in the header (Settings → Preview → Code). Each tab panel
// is positioned at an x-offset equal to its distance from the active tab, so
// switching tabs slides every panel by one step in the same direction.
const TAB_ORDER: Record<string, number> = {
  dashboard: 0,
  preview: 1,
  code: 2,
};

const normalizePublicUrl = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) return "";
  const url = value.trim();
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

const getLanguageByPath = (path: string) => {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "json":
      return "json";
    case "css":
      return "css";
    case "html":
      return "html";
    default:
      return "javascript";
  }
};

export const ProjectWorkspaceClient = ({
  projectId,
}: {
  projectId: string;
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isDashboardSidebarCollapsed, setIsDashboardSidebarCollapsed] =
    useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);
  const [isVersionHistory, setIsVersionHistory] = useState(false);
  const [versionPreviewFiles, setVersionPreviewFiles] = useState<
    { path: string; content: string }[] | null
  >(null);

  const handleToggleVersionHistory = useCallback(() => {
    setIsVersionHistory((prev) => {
      if (prev) setVersionPreviewFiles(null);
      return !prev;
    });
  }, []);

  const handleVersionReverted = useCallback(async () => {
    // Drop the panel-side preview override so the viewer falls back to live codebase
    setVersionPreviewFiles(null);

    const target = useCodeSelectionStore.getState().activeCodeSelection;
    if (target?.kind !== "microfrontend") return;

    try {
      const apiKey = useAuthStore.getState().apiKey;
      const headers = apiKey
        ? { Authorization: "API-KEY", "x-api-key": apiKey }
        : {};
      const { data } = await api.get(`/v2/function/${target.id}/codebase`, {
        params: { "project-id": projectId },
        headers,
      });
      const files = (data?.data?.files ?? []) as {
        path: string;
        content: string;
      }[];
      useCodeSelectionStore.getState().setActiveCodeSelection(target, files);
    } catch (err) {
      console.error("Failed to refresh codebase after revert", err);
    }
  }, [projectId]);

  const handleTogglePreviewMaximize = useCallback(() => {
    setIsPreviewMaximized((prev) => {
      const next = !prev;
      setIsChatCollapsed(next);
      return next;
    });
  }, []);
  const [projectTitle, setProjectTitle] = useState("Loading...");
  const [isLoading, setIsLoading] = useState(true);
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);

  // Synchronously reset loading state when projectId changes (before cleanup runs).
  // This prevents EmptyProjectView from flashing when navigating between projects.
  if (loadedProjectId !== null && loadedProjectId !== projectId && !isLoading) {
    setIsLoading(true);
  }
  const [microfrontends, setMicrofrontends] = useState<
    Array<{ id: string; name: string; url: string }>
  >([]);
  const [selectedMicrofrontend, setSelectedMicrofrontend] = useState<{
    id: string;
    name: string;
    url: string;
  } | null>(null);
  const [isMicrofrontendLoading, setIsMicrofrontendLoading] = useState(false);
  // Field selectors instead of subscribing to the whole files-store: the bare
  // useFilesStore() re-rendered this large component (and its whole tree) on ANY
  // store change — including activeFile/openedFiles clicks and, worst, every
  // keystroke (updatedFiles). updatedFiles is read on-demand in handleSaveChanges
  // via getState(), so we don't subscribe to it here.
  const rawFiles = useFilesStore((s) => s.files);
  const setFiles = useFilesStore((s) => s.setFiles);
  const clearWorkspace = useFilesStore((s) => s.clearWorkspace);
  const filesProjectId = useFilesStore((s) => s.filesProjectId);
  // Ignore files still stamped for the *previous* project: the store is global
  // and is only cleared in an effect cleanup that runs after this render, so on
  // the first commit after a project switch it transiently holds the old
  // project's files. Treating those as "no files" keeps the loader up instead
  // of mounting the preview viewer with stale content (the "project A shows
  // inside project B until refresh" bug).
  const files = useMemo(
    () =>
      filesProjectId !== null && filesProjectId !== projectId ? [] : rawFiles,
    [rawFiles, filesProjectId, projectId],
  );
  const setApiKey = useAuthStore((state) => state.setApiKey);
  const setUcodeProjectId = useAuthStore((state) => state.setUcodeProjectId);
  const setProjectEnvId = useAuthStore((state) => state.setProjectEnvId);
  const setResourceEnvId = useAuthStore((state) => state.setResourceEnvId);
  const setActiveProjectTab = useAuthStore(
    (state) => state.setActiveProjectTab,
  );
  const setCodeEditorTarget = useAuthStore(
    (state) => state.setCodeEditorTarget,
  );
  const clearCodeSelection = useCodeSelectionStore(
    (state) => state.clearCodeSelection,
  );
  const activeCodeFiles = useCodeSelectionStore(
    (state) => state.activeCodeFiles,
  );
  const activeCodeSelection = useCodeSelectionStore(
    (state) => state.activeCodeSelection,
  );
  const mobileProject = useMobileProjectStore((state) => state.mobileProject);
  const mobileProjectId = useMobileProjectStore(
    (state) => state.mobileProjectId,
  );
  const setMobileProject = useMobileProjectStore(
    (state) => state.setMobileProject,
  );
  const apiKey = useAuthStore((state) => state.apiKey);
  const ucodeProjectId = useAuthStore((state) => state.ucodeProjectId);
  const projectEnvId = useAuthStore((state) => state.projectEnvId);
  const project = useAuthStore((state) => state.project);
  const isUgen = project?.is_ugen ?? false;
  const chatPosition = useChatStore((state) => state.chatPosition);
  const sseEvents = useChatStore((state) => state.sseEvents);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const streamError = useChatStore((state) => state.streamError);
  const setStreamError = useChatStore((state) => state.setStreamError);
  const messages = useChatStore((state) => state.messages);
  const setPendingPrompt = useChatStore((state) => state.setPendingPrompt);

  const handleRetryStream = useCallback(() => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    if (!lastUserMessage?.content) {
      setStreamError(null);
      return;
    }
    setStreamError(null);
    setPendingPrompt({
      content: lastUserMessage.content,
      images: lastUserMessage.images,
    });
  }, [messages, setStreamError, setPendingPrompt]);
  // Latches true when a stream starts on an empty project (first generation).
  // We keep ProjectBuildingAnimation up for the whole stream in that case so
  // the preview viewer doesn't mount mid-stream and flash its own loaders.
  // For follow-up edits on a project that already has files, this stays false
  // and the existing preview keeps showing through the stream.
  const [isFirstGeneration, setIsFirstGeneration] = useState(false);
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    if (isStreaming && !wasStreamingRef.current) {
      // Stream just started — snapshot whether the project had any files.
      setIsFirstGeneration(files.length === 0);
    } else if (!isStreaming && wasStreamingRef.current) {
      // Stream just ended — release the latch so the preview viewer mounts.
      setIsFirstGeneration(false);
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming, files.length]);
  // Only treat the workspace as "no files" when there's no selection that owns
  // its own rendering. Picking a microfrontend/function from the code-viewer
  // dropdown briefly resets `activeCodeFiles` to null while the new codebase
  // loads — without this guard the viewer unmounts mid-fetch and the parent
  // WorkspaceLoader hangs forever (the in-viewer fetch effect can't run when
  // it's unmounted). The inner viewers already handle their own loading and
  // empty states for microfrontend/function selections.
  const hasCurrentMobileFiles =
    mobileProjectId === projectId && !!mobileProject?.files?.length;
  const hasNoFiles =
    files.length === 0 &&
    !activeCodeFiles?.length &&
    !hasCurrentMobileFiles &&
    activeCodeSelection?.kind !== "microfrontend" &&
    activeCodeSelection?.kind !== "function";
  const isAiBuilding = sseEvents.length >= 3;

  // The previewable code can arrive from two places: `project_files` on the
  // mcp_project response (already in `files`), or a microfrontend codebase that
  // chat-input auto-selects after the page loads. While that second path is
  // still in flight, `hasNoFiles` is transiently true — without this guard the
  // EmptyProjectView ("Your project will appear here") flashes, sometimes for
  // the whole duration of a slow codebase fetch, before the build kicks in.
  // We mirror chat-input's `attach-microfrontends` query (react-query dedupes
  // by key) to know whether a microfrontend codebase is still being resolved.
  const { data: previewMicrofrontends, isFetched: microfrontendsFetched } =
    useQuery({
      queryKey: ["attach-microfrontends", projectId],
      queryFn: async () => {
        const headers = apiKey
          ? { Authorization: "API-KEY", "x-api-key": apiKey }
          : {};
        const { data } = await api.get("/v2/functions/micro-frontend", {
          params: { search: "", offset: 0, "project-id": projectId },
          headers,
        });
        return (data.data?.functions ?? []) as Array<{ id: string }>;
      },
      enabled: !!projectId && !!apiKey && isUgen,
      staleTime: 0,
    });

  // Project info is fetched via react-query so StrictMode in dev (which fires
  // useEffect twice) doesn't produce duplicate network calls — the raw axios
  // call inside useEffect can't be cancelled without an AbortController, so
  // both invocations would otherwise hit the server.
  const { data: projectInfo } = useQuery({
    queryKey: ["company-project", projectId],
    queryFn: async () => {
      const headers = !isUgen
        ? { Authorization: `Bearer ${useAuthStore.getState().accessToken}` }
        : undefined;
      const { data } = await api.get("/v1/company-project", {
        params: { "project-id": projectId },
        headers,
      });
      const info = data?.data;
      if (!info) return null;
      return Array.isArray(info) ? info[0] : info;
    },
    enabled: !!projectId,
  });

  // The published app's public link is the short URL (e.g. "app.ucode.co/p/xxxx"),
  // keyed by the microfrontend's function_id — the same one shown in the Publish
  // popover. We fetch it here so the Preview QR can encode the real live link.
  const shortLinkFnId =
    activeCodeSelection?.kind === "microfrontend"
      ? activeCodeSelection.id
      : undefined;
  const { data: shortLinkUrl = "" } = useQuery({
    queryKey: [
      "mf-short-link",
      shortLinkFnId,
      ucodeProjectId || projectId,
      projectEnvId,
    ],
    queryFn: async () => {
      const { data } = await api.get(
        `/v1/mcp_project/short-link/${shortLinkFnId}`,
        {
          params: { "project-id": ucodeProjectId || projectId },
          headers: {
            "Environment-Id": projectEnvId ?? "",
          },
        },
      );
      return normalizePublicUrl(data?.data?.short_url);
    },
    enabled: isUgen && !!shortLinkFnId && !!projectId,
  });

  // A microfrontend codebase is still loading when either: a microfrontend is
  // selected but its files haven't landed (`activeCodeFiles === null`), or no
  // selection exists yet but the microfrontend list has entries waiting to be
  // auto-selected.
  const codeSelectionPending =
    activeCodeSelection === null
      ? (previewMicrofrontends?.length ?? 0) > 0
      : activeCodeSelection.kind === "microfrontend" &&
        activeCodeFiles === null;
  const isResolvingFiles =
    hasNoFiles &&
    !isAiBuilding &&
    !!apiKey &&
    (!microfrontendsFetched || codeSelectionPending);
  const t = useTranslations("features.project");

  // Active tab is local state (the source of truth), NOT the URL. Previously it
  // was derived from ?tab= and setActiveTab did router.push, so every tab click
  // went through next-intl middleware → RSC fetch → router re-render — even
  // though page.tsx never reads ?tab=, making the RSC response identical. We
  // seed from the URL once (shareable links) and keep the address bar in sync
  // via history.replaceState (see setActiveTab).
  const [activeTab, setActiveTabState] = useState<
    "dashboard" | "code" | "preview"
  >(
    () =>
      (searchParams.get("tab") as "dashboard" | "code" | "preview") ||
      "preview",
  );

  // Tab panels stay mounted once visited so switching away and back doesn't
  // remount them — without this, returning to Preview would rebuild the bundle
  // from scratch every time. A tab is added on first activation and never
  // removed; inactive panels stay in the DOM but hidden and slid off-screen.
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(
    () => new Set([activeTab]),
  );
  if (!mountedTabs.has(activeTab)) {
    setMountedTabs((prev) => new Set(prev).add(activeTab));
  }

  const setActiveTab = useCallback(
    (tab: "dashboard" | "code" | "preview") => {
      setActiveTabState(tab);
      // Keep the URL shareable without a server roundtrip: native
      // history.replaceState integrates with the Next router (keeps
      // useSearchParams in sync) but skips the middleware + RSC fetch that
      // router.push triggered on every click.
      const params = new URLSearchParams(window.location.search);
      params.set("tab", tab);
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?${params.toString()}`,
      );
    },
    [],
  );

  // This component is reused (not remounted) when navigating between projects,
  // so local tab state would otherwise leak across projects. Reset it to the
  // new URL's tab on project switch — usually "preview", since cross-project
  // navigation arrives without a ?tab= param (matches prior behavior).
  const prevProjectIdRef = useRef(projectId);
  useEffect(() => {
    if (prevProjectIdRef.current === projectId) return;
    prevProjectIdRef.current = projectId;
    const urlTab = new URLSearchParams(window.location.search).get("tab") as
      | "dashboard"
      | "code"
      | "preview"
      | null;
    setActiveTabState(urlTab || "preview");
  }, [projectId]);

  const handleSaveChanges = () => {
    const updatedFiles = useFilesStore.getState().updatedFiles;
    if (updatedFiles.length > 0) {
      api.put(`/v1/mcp_project/${projectId}`, {
        project_files: updatedFiles,
      });
    }
  };

  // Browser-level guard against losing unsaved microfrontend edits on tab close / reload.
  // We can't show our own modal here — only trigger the native confirmation.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasAny = Object.values(useDirtyFilesStore.getState().dirty).some(
        (m) => Object.keys(m).length > 0,
      );
      if (hasAny) {
        e.preventDefault();
        // Some browsers still require a returnValue assignment
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Start fetching + compiling the 13 MB esbuild WASM as soon as the project
  // route mounts, in parallel with the codebase fetch above. ProjectPreviewViewer
  // only mounts once files have loaded, so its own idle-time warmup starts too
  // late to overlap that fetch — kicking off here hides the cold WASM cost behind
  // network latency the user is already waiting on. Idempotent (cached on
  // window[INIT_KEY]); the viewer's idle warmup stays as a fallback.
  useEffect(() => {
    if (!isUgen) return;
    void ensureEsbuild().catch(() => {});
  }, [isUgen]);

  const handleEditCode = async (target: CodeEditorTarget) => {
    setCodeEditorTarget(target);
    // Explicit user action ("Edit with AI") — flash the chat-input folder green.
    useCodeSelectionStore.getState().flashFolderIcon();
    // Editing a microfrontend with AI: surface the live preview and open the
    // chat so the freshly-selected MF is active everywhere at once (preview
    // viewer + chat both read it from the code-selection store). Done up front
    // so the UI reacts immediately, before the codebase fetch below resolves.
    if (target.kind === "microfrontend") {
      setActiveTab("preview");
      setIsChatCollapsed(false);
    }
    if (!target.id) {
      useCodeSelectionStore.getState().setActiveCodeSelection(target, null);
      return;
    }
    try {
      const apiKey = useAuthStore.getState().apiKey;
      const headers = apiKey
        ? { Authorization: "API-KEY", "x-api-key": apiKey }
        : {};
      const { data } = await api.get(`/v2/function/${target.id}/codebase`, {
        params: { "project-id": projectId },
        headers,
      });
      const files = (data?.data?.files ?? []) as {
        path: string;
        content: string;
      }[];
      useCodeSelectionStore.getState().setActiveCodeSelection(target, files);
      toast.success(
        target.name
          ? `“${target.name}” selected for AI edit`
          : "Function selected for AI edit",
      );
    } catch (err) {
      console.error("Failed to load function for AI edit", err);
      toast.error("Failed to load function. Please try again.");
    }
  };

  const handlePreviewMicrofrontend = useCallback(() => {
    setActiveTab("preview");
  }, [setActiveTab]);

  useEffect(() => {
    if (!projectId) return;

    // ⚡ Immediately clear previous project's apiKey, tab & ucode_project_id BEFORE
    // any async requests. Without this, requests fired during loading would still
    // carry the stale apiKey from the previous project (race condition between
    // cleanup and new effect start). ucodeProjectId is set only after the async
    // /v1/mcp_project response below, so leaving the previous value in place lets
    // workspace queries keyed on it (client types, roles → the Invite modal) read
    // and submit a previous project's ids, which the backend rejects with a grpc
    // error until a refresh. Null it here so those queries stay disabled until the
    // correct id arrives.
    setApiKey(null);
    setActiveProjectTab(null);
    setUcodeProjectId(null);

    setIsLoading(true);
    // Fetch project details and files
    if (isUgen) {
      api
        .get(`/v1/mcp_project/${projectId}`)
        .then((res) => {
          const projectData = res.data?.data;
          if (!projectData) {
            return;
          }

          // Save API key for dashboard requests
          if (projectData.api_key) {
            setApiKey(projectData.api_key, projectId);
          } else {
            setApiKey(null);
          }

          if (projectData.ucode_project_id) {
            setUcodeProjectId(projectData.ucode_project_id);
          }

          if (projectData.environment_id) {
            setProjectEnvId(projectData.environment_id);
          }

          if (projectData.resource_env_id) {
            setResourceEnvId(projectData.resource_env_id);
          }

          if (projectData.title) {
            setProjectTitle(projectData.title);
          }

          // Some backend versions persist the complete Capacitor bundle on the
          // project record. Hydrate it so reloads can use the same live-preview
          // path as the original mobile_project SSE event.
          if (projectData.mobile_project) {
            setMobileProject(projectData.mobile_project, projectId);
          }

          if (
            projectData.project_files &&
            projectData.project_files.length > 0
          ) {
            const mappedFiles: IFile[] = projectData.project_files.map(
              (file: any) => ({
                path: file.path,
                content: file.content,
                language: getLanguageByPath(file.path),
              }),
            );
            setFiles(mappedFiles, projectId);
          }
        })
        .catch((err) => {
          console.error("Failed to load project details", err);
          setProjectTitle("Workspace Project");
        })
        .finally(() => {
          setIsLoading(false);
          setLoadedProjectId(projectId);
        });
    }

    return () => {
      setIsLoading(true);
      clearWorkspace();
      setApiKey(null);
      setActiveProjectTab(null);
      setUcodeProjectId(null);
      clearCodeSelection();
      useDirtyFilesStore.getState().clearAll();
    };
  }, [
    projectId,
    setFiles,
    clearWorkspace,
    setApiKey,
    setActiveProjectTab,
    setUcodeProjectId,
    clearCodeSelection,
    setMobileProject,
  ]);

  useEffect(() => {
    setActiveProjectTab(activeTab);
  }, [activeTab, setActiveProjectTab]);

  useEffect(() => {
    if (!projectId || isUgen) return;
    setIsMicrofrontendLoading(true);
    api
      .get("/v2/functions/micro-frontend", {
        params: { search: "", offset: 0, limit: 50, "project-id": projectId },
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        },
      })
      .then((res) => {
        const list: Array<{ id: string; name: string; url: string }> =
          res.data?.data?.functions ?? [];
        const normalized = list
          .map((mf) => ({
            ...mf,
            url: mf.url?.startsWith("http") ? mf.url : `https://${mf.url}`,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setMicrofrontends(normalized);
        setSelectedMicrofrontend(normalized[0] ?? null);
      })
      .catch((err) => console.error("Failed to load microfrontends", err))
      .finally(() => setIsMicrofrontendLoading(false));
  }, [projectId, isUgen]);

  const renderTabContent = (tab: "dashboard" | "code" | "preview") => {
    if (tab === "dashboard") {
      return (
        <ProjectDashboard
          isSidebarCollapsed={isDashboardSidebarCollapsed}
          setIsSidebarCollapsed={setIsDashboardSidebarCollapsed}
          projectInfo={projectInfo}
          projectId={projectId}
          onEditCode={handleEditCode}
          isChatCollapsed={isChatCollapsed}
        />
      );
    }

    // Stream error on first generation: nothing was built, so the Preview tab
    // would otherwise sit on the AI animation forever. Show an actionable
    // error view with a Retry button instead. (For follow-up edits the chat
    // already surfaces the error inline and the existing preview keeps showing.)
    if (tab === "preview" && streamError && hasNoFiles) {
      return (
        <StreamErrorView
          message={streamError}
          onRetry={handleRetryStream}
          isRetrying={isStreaming}
        />
      );
    }
    // First-generation streams on the Preview tab: keep the AI-building
    // animation up for the whole stream so the preview viewer doesn't mount
    // mid-stream on the first chunk_done and flash its internal loaders.
    // Follow-up edits skip this branch (isFirstGeneration stays false), and
    // the Code tab keeps streaming files in real-time as before.
    if (tab === "preview" && isStreaming && isFirstGeneration) {
      return <ProjectBuildingAnimation />;
    }
    // Preview and Code share the same "no files yet" placeholder states.
    if (hasNoFiles) {
      return isAiBuilding ? (
        <ProjectBuildingAnimation />
      ) : isResolvingFiles ? (
        <WorkspaceLoader message="Loading project workspace..." />
      ) : (
        <EmptyProjectView onStartChatting={() => setActiveTab("preview")} />
      );
    }

    if (tab === "preview") {
      const activeMicrofrontendUrl =
        activeCodeSelection?.kind === "microfrontend"
          ? activeCodeSelection.url
          : "";
      const shareUrl = normalizePublicUrl(
        shortLinkUrl ||
          activeMicrofrontendUrl ||
          projectInfo?.url ||
          projectInfo?.project_url,
      );

      return (
        <ProjectPreviewViewer
          key={projectId}
          device={device}
          isMaximized={isPreviewMaximized}
          versionPreviewFiles={versionPreviewFiles}
          projectId={projectId}
          shareUrl={shareUrl}
          onDeviceChange={setDevice}
          onToggleMaximize={handleTogglePreviewMaximize}
          isChatCollapsed={isChatCollapsed}
          chatPosition={chatPosition}
          isVersionHistory={isVersionHistory}
        />
      );
    }

    return (
      <ProjectCodeViewer
        projectId={projectId}
        getLanguageByPath={getLanguageByPath}
        versionFiles={versionPreviewFiles}
        isChatCollapsed={isChatCollapsed}
        chatPosition={chatPosition}
      />
    );
  };

  if (!isUgen) {
    return (
      <ErrorBoundary>
        <div className="bg-bg-main flex h-screen w-full flex-col overflow-hidden">
          {isMicrofrontendLoading ? (
            <div className="relative flex-1 overflow-hidden">
              <WorkspaceLoader
                message="Loading microfrontends..."
                subMessage="Fetching project workspace"
              />
            </div>
          ) : (
            <>
              <div className="border-border-subtle bg-bg-card flex h-[48px] shrink-0 items-center gap-2.5 border-b px-4">
                <button
                  onClick={() => router.push("/projects")}
                  className="text-text-muted hover:text-text-main flex items-center gap-2.5 transition-colors"
                >
                  <img
                    src="/logo.svg"
                    alt={projectTitle}
                    className="h-6 w-6 rounded object-contain"
                  />
                </button>
                {microfrontends.length > 0 && (
                  <Select
                    value={selectedMicrofrontend?.id ?? ""}
                    onValueChange={(id) => {
                      const mf = microfrontends.find((m) => m.id === id);
                      if (mf) setSelectedMicrofrontend(mf);
                    }}
                  >
                    <SelectTrigger className="w-auto min-w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {microfrontends.map((mf) => (
                        <SelectItem key={mf.id} value={mf.id}>
                          {mf.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {selectedMicrofrontend?.url ? (
                <iframe
                  key={selectedMicrofrontend.id}
                  src={selectedMicrofrontend.url}
                  className="w-full flex-1 border-none"
                  title={selectedMicrofrontend.name}
                />
              ) : (
                <div className="text-text-muted flex flex-1 items-center justify-center">
                  <p className="text-sm font-medium">No preview available</p>
                </div>
              )}
            </>
          )}
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {/* Preload the esbuild WASM so the 13 MB download starts before the esbuild
          JS chunk even loads. as="fetch" + no crossorigin matches the same-origin
          fetch the worker issues, so it's reused (not double-fetched). React 19
          hoists this <link> into <head>. */}
      <link rel="preload" as="fetch" href={WASM_URL} type="application/wasm" />
      <div
        className="bg-bg-main relative h-screen w-full overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: isChatCollapsed
            ? chatPosition === "right"
              ? "1fr 0"
              : "0 1fr"
            : chatPosition === "right"
              ? "1fr auto"
              : "auto 1fr",
          gridTemplateRows: "auto 1fr",
          gridTemplateAreas:
            chatPosition === "right"
              ? '"header header" "preview chat"'
              : '"header header" "chat preview"',
        }}
      >
        {/* Chat — spans full height */}
        <div
          style={{
            gridArea: "chat",
            minWidth: 0,
            overflow: "hidden",
            height: "100%",
          }}
        >
          <WorkspaceChat
            projectId={projectId}
            projectTitle={projectTitle}
            isChatCollapsed={isChatCollapsed}
            setIsChatCollapsed={setIsChatCollapsed}
            onSelectFunction={handleEditCode}
            onSelectMicrofrontend={handlePreviewMicrofrontend}
            isPreviewMaximized={isPreviewMaximized}
            isVersionHistory={isVersionHistory}
            onToggleVersionHistory={handleToggleVersionHistory}
            onSelectVersion={setVersionPreviewFiles}
            onViewVersionCode={() => setActiveTab("code")}
            onVersionReverted={handleVersionReverted}
          />
        </div>

        {/* Header */}
        {!isPreviewMaximized && (
          <div style={{ gridArea: "header" }} className="min-w-0 py-2">
            <ProjectHeader
              projectTitle={projectTitle}
              projectId={projectId}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isSidebarCollapsed={isDashboardSidebarCollapsed}
              onToggleSidebar={() =>
                setIsDashboardSidebarCollapsed(!isDashboardSidebarCollapsed)
              }
              isLoading={isLoading}
              hasNoFiles={hasNoFiles}
              onSave={handleSaveChanges}
              isChatCollapsed={isChatCollapsed}
              onToggleChat={() => setIsChatCollapsed(!isChatCollapsed)}
              chatPosition={chatPosition}
              projectUrl={projectInfo?.url || projectInfo?.project_url || ""}
              isUgen={isUgen}
            />
          </div>
        )}

        {/* Content Area */}
        <div
          style={{ gridArea: "preview" }}
          className={cn(
            "relative flex min-w-0 overflow-hidden",
            isPreviewMaximized && "absolute inset-0 z-50",
          )}
        >
          {isLoading ? (
            <WorkspaceLoader message="Loading project workspace..." />
          ) : (
            (["dashboard", "preview", "code"] as const).map((tab) => {
              if (!mountedTabs.has(tab)) return null;
              const isActive = tab === activeTab;
              const offset = TAB_ORDER[tab] - TAB_ORDER[activeTab];
              return (
                <motion.div
                  key={tab}
                  initial={false}
                  animate={{ x: `${offset * 100}%` }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute inset-0 flex min-w-0 overflow-hidden"
                  style={{ pointerEvents: isActive ? "auto" : "none" }}
                  aria-hidden={!isActive}
                >
                  {renderTabContent(tab)}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
      <CommitModal />
      <UnsavedChangesModal />
    </ErrorBoundary>
  );
};
