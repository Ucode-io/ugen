import {
  Paperclip,
  MousePointerClick,
  ArrowUp,
  X,
  FileIcon,
  Loader2,
  Plus,
  Zap,
  Layers2,
  Sparkles,
  Check,
  FolderPlus,
  Folder,
  ChevronDown,
} from "lucide-react";
import {
  useState,
  useRef,
  KeyboardEvent,
  ClipboardEvent,
  DragEvent,
  useEffect,
} from "react";
import {
  AudioRecorder,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui";
import { useFileUpload } from "@/shared/hooks/useFileUpload";
import { useVisualEditorStore } from "@/entities/visual-editor";
import {
  DEFAULT_MODEL_ID,
  CHAT_PROVIDERS,
  type ChatProvider,
  normalizeChatProvider,
} from "@/entities/ai-model";
import { cn } from "@/shared/lib/utils/cn";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/api";
import type { CodeEditorTarget } from "@/entities/session";
import { useAuthStore } from "@/entities/session";
import { useChatStore } from "@/entities/chat";
import { useCodeSelectionStore } from "@/entities/project/model/code-selection-store";
import { useGuardedAction } from "@/widgets/project-workspace/lib/save-flow";

interface AttachItem {
  id: string;
  name: string;
  path?: string;
  branch?: string;
  type?: string;
  project_id?: string;
  repo_id?: string;
  url?: string;
}

export interface MessageContextItem {
  path?: string | null;
  line?: number | string | null;
  element?: string | null;
}

export type MessageContext = MessageContextItem[];

interface ChatInputProps {
  onSendMessage: (
    msg: string,
    files?: any[],
    model?: string,
    context?: MessageContext,
  ) => void;
  isSending?: boolean;
  disabled?: boolean;
  className?: string;
  projectId?: string;
  onSelectFunction?: (target: CodeEditorTarget) => void;
  onSelectMicrofrontend?: (files: { path: string; content: string }[]) => void;
}

export const ChatInput = ({
  onSendMessage,
  isSending,
  disabled,
  className,
  projectId,
  onSelectFunction,
  onSelectMicrofrontend,
}: ChatInputProps) => {
  const t = useTranslations("widgets.workspaceChat");
  const {
    isInspectMode,
    selectedElements,
    setInspectMode,
    removeSelectedElement,
    clearSelectedElements,
  } = useVisualEditorStore();
  const [value, setValue] = useState("");
  const [isPlanOn, setIsPlanOn] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTogglePlan = () => {
    setIsPlanOn(!isPlanOn);
  };

  const handleToggleVisualEdit = () => {
    setInspectMode(!isInspectMode);
  };

  const { uploadFile, uploadedFiles, removeFile, clearFiles, isUploading } =
    useFileUpload();

  const apiKey = useAuthStore((s) => s.apiKey);
  const project = useAuthStore((s) => s.project);
  const chatId = useChatStore((s) => s.chatId);
  const chatModel = useChatStore((s) => s.chatModel);
  const setChatModel = useChatStore((s) => s.setChatModel);
  const inputDraft = useChatStore((s) => s.inputDraft);
  const inputDraftNonce = useChatStore((s) => s.inputDraftNonce);
  const setInputDraft = useChatStore((s) => s.setInputDraft);
  const activeCodeSelection = useCodeSelectionStore(
    (s) => s.activeCodeSelection,
  );
  const setActiveCodeSelection = useCodeSelectionStore(
    (s) => s.setActiveCodeSelection,
  );
  const flashFolderAt = useCodeSelectionStore((s) => s.flashFolderAt);
  const getApiKeyHeaders = () =>
    apiKey ? { Authorization: "API-KEY", "x-api-key": apiKey } : {};

  const guardedAction = useGuardedAction();

  // Attach popover state
  const [attachOpen, setAttachOpen] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [recentlySelected, setRecentlySelected] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI provider selector (Claude / OpenAI / Gemini). The active value is mirrored
  // in the chat store; selecting one persists it on the chat via PUT.
  const [modelOpen, setModelOpen] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const currentProvider = normalizeChatProvider(chatModel);
  const currentProviderName =
    CHAT_PROVIDERS.find((p) => p.id === currentProvider)?.name ?? "Claude";

  const handleSelectModel = async (next: ChatProvider) => {
    setModelOpen(false);
    if (next === currentProvider) return;
    const prev = chatModel;
    setChatModel(next); // optimistic
    // No chat yet — keep the local choice; it'll be persisted once a chat exists.
    if (!chatId) return;
    setSavingModel(true);
    try {
      await api.put(
        `/v1/ai-chat/${chatId}`,
        { model: next },
        {
          headers: {
            project_id: projectId ?? project?.project_id ?? "",
            environment_id: project?.environment_id ?? "",
          },
        },
      );
      const label = CHAT_PROVIDERS.find((p) => p.id === next)?.name ?? next;
      toast.success(`Provider changed to ${label}`);
    } catch (err) {
      setChatModel(prev); // revert on failure
      toast.error("Failed to change provider");
      console.error("Failed to update chat model", err);
    } finally {
      setSavingModel(false);
    }
  };

  // Highlight the folder icon green for 15s. Called only from the manual
  // selection handlers — the auto/bootstrap selection must not trigger it,
  // otherwise the folder would flash at seemingly random moments (apiKey
  // arriving, microfrontend list refetching, etc.).
  const flashFolder = () => {
    setRecentlySelected(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setRecentlySelected(false), 15_000);
  };

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  // Flash the folder green when an explicit "Edit with AI" selection is made
  // elsewhere (e.g. the microfrontend table). Skip the initial 0 so the folder
  // doesn't flash on mount.
  useEffect(() => {
    if (!flashFolderAt) return;
    flashFolder();
  }, [flashFolderAt]);

  // Prefill the input when something elsewhere seeds a draft (e.g. the "New
  // Agent" button → "Create an agent "). Focus and place the caret at the end so
  // the user can keep typing. Consume the draft so it doesn't reapply on
  // re-render; `inputDraftNonce` lets the same text be pushed again.
  useEffect(() => {
    if (inputDraft == null) return;
    setValue(inputDraft);
    setInputDraft(null);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputDraftNonce]);

  const {
    data: functionsList,
    isLoading: isFunctionsLoading,
    isError: isFunctionsError,
    refetch: refetchFunctions,
  } = useQuery({
    queryKey: ["attach-functions", projectId],
    queryFn: async () => {
      const { data } = await api.get("/v1/function", {
        params: { search: "", limit: 50, offset: 0, "project-id": projectId },
        headers: getApiKeyHeaders(),
      });
      return (data.data?.functions ?? []) as AttachItem[];
    },
    enabled: attachOpen && !!projectId,
    staleTime: 0,
  });

  const {
    data: microfrontendsList,
    isLoading: isMicrofrontendsLoading,
    isError: isMicrofrontendsError,
    refetch: refetchMicrofrontends,
  } = useQuery({
    queryKey: ["attach-microfrontends", projectId],
    queryFn: async () => {
      const { data } = await api.get("/v2/functions/micro-frontend", {
        params: { search: "", offset: 0, "project-id": projectId },
        headers: getApiKeyHeaders(),
      });
      return (data.data?.functions ?? []) as AttachItem[];
    },
    enabled: !!projectId && !!apiKey,
    staleTime: 0,
  });

  const activeCodeFiles = useCodeSelectionStore((s) => s.activeCodeFiles);

  // Auto-select (or restore after refresh) the active microfrontend's codebase files.
  // Runs when microfrontendsList or apiKey changes so that a race condition on page
  // load (apiKey arrives after the list) doesn't leave the preview empty.
  useEffect(() => {
    if (!microfrontendsList || microfrontendsList.length === 0) return;
    if (activeCodeSelection?.kind === "new_project") return;
    // If any MF is already selected, leave it alone — whoever set it (initial
    // bootstrap, processDoneData after generation, manual pick) is responsible
    // for loading its codebase. Without this guard we race with externally-set
    // selections and may load the wrong MF.
    if (activeCodeSelection?.kind === "microfrontend") return;
    // Wait for apiKey so the codebase request doesn't 401
    if (!apiKey) return;

    const targetMf = microfrontendsList[0];

    const target = {
      kind: "microfrontend" as const,
      id: targetMf.id,
      name: targetMf.name,
      path: targetMf.path,
      branch: targetMf.branch ?? "master",
      type: targetMf.type,
      repoId: targetMf.repo_id,
      url: targetMf.url,
      projectId: targetMf.project_id,
    };
    api
      .get(`/v2/function/${targetMf.id}/codebase`, {
        params: { "project-id": projectId },
        headers: { Authorization: "API-KEY", "x-api-key": apiKey },
      })
      .then(({ data }) => {
        const files = (data?.data?.files ?? []) as {
          path: string;
          content: string;
        }[];
        // Bootstrap auto-select on page load: only seed the code selection so the
        // preview viewer has files. Do NOT call onSelectMicrofrontend here — that
        // force-switches to the Preview tab, which would yank the user away if
        // they've navigated to Settings/Code while the codebase was resolving.
        // (The tab already defaults to "preview" on a fresh open, so switching is
        // redundant anyway.)
        setActiveCodeSelection(target, files);
      })
      // On failure set an empty file array (not null) so consumers can tell the
      // codebase finished resolving — `null` means "still loading" and would
      // otherwise leave the preview stuck on a loader forever.
      .catch(() => setActiveCodeSelection(target, []));
  }, [microfrontendsList, apiKey]);

  const handleSelectNewProject = () => {
    guardedAction(() => {
      setActiveCodeSelection({ kind: "new_project" });
      setAttachOpen(false);
    });
  };

  const handleSelectGeneratedFrontend = () => {
    guardedAction(() => {
      setActiveCodeSelection({ kind: "frontend" });
      onSelectMicrofrontend?.([]);
      setAttachOpen(false);
    });
  };

  const handleSelectFunction = (fn: AttachItem) => {
    guardedAction(async () => {
      try {
        setPendingItemId(fn.id);
        await api.get(`/v2/function/${fn.id}/codebase`, {
          params: { "project-id": projectId },
          headers: getApiKeyHeaders(),
        });
        setActiveCodeSelection({
          kind: "function",
          id: fn.id,
          name: fn.name,
          path: fn.path,
          branch: fn.branch ?? "master",
          type: fn.type,
          repoId: fn.repo_id,
        });
        flashFolder();
      } catch (err) {
        console.error("Failed to load function", err);
      } finally {
        setPendingItemId(null);
        setAttachOpen(false);
      }
    });
  };

  const handleSelectMicrofrontend = (mf: AttachItem) => {
    if (
      activeCodeSelection?.kind === "microfrontend" &&
      activeCodeSelection.id === mf.id
    ) {
      setAttachOpen(false);
      return;
    }
    guardedAction(async () => {
      try {
        setPendingItemId(mf.id);
        const { data } = await api.get(`/v2/function/${mf.id}/codebase`, {
          params: { "project-id": projectId },
          headers: getApiKeyHeaders(),
        });
        const files = (data?.data?.files ?? []) as {
          path: string;
          content: string;
        }[];
        setActiveCodeSelection(
          {
            kind: "microfrontend",
            id: mf.id,
            name: mf.name,
            path: mf.path,
            branch: mf.branch ?? "master",
            type: mf.type,
            repoId: mf.repo_id,
            url: mf.url,
            projectId: mf.project_id,
          },
          files,
        );
        flashFolder();
        onSelectMicrofrontend?.(files);
      } catch (err) {
        console.error("Failed to load microfrontend", err);
      } finally {
        setPendingItemId(null);
        setAttachOpen(false);
      }
    });
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSend = () => {
    if (
      !(
        (value.trim() ||
          uploadedFiles.length > 0 ||
          selectedElements.length > 0) &&
        !isSending
      )
    ) {
      return;
    }
    guardedAction(() => doSend());
  };

  const doSend = () => {
    const messageText = value;
    let context: MessageContext | undefined;

    if (selectedElements.length > 0) {
      // Build context array from all selected elements that have source info
      const contextItems = selectedElements
        .filter((el) => el.sourceFile)
        .map((el) => {
          let element: string | undefined = el.outerHTML ?? undefined;
          if (!element) {
            const tag = el.tagName.toLowerCase();
            const attrs: string[] = [];
            if (el.htmlId) attrs.push(`id="${el.htmlId}"`);
            if (el.className) attrs.push(`class="${el.className}"`);
            if (el.dataName) attrs.push(`data-element-name="${el.dataName}"`);
            element = `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>`;
          }
          return {
            path: el.sourceFile,
            line: el.sourceLine ?? undefined,
            element,
          };
        });
      if (contextItems.length > 0) context = contextItems;
    }

    onSendMessage(messageText, uploadedFiles, DEFAULT_MODEL_ID, context);
    setValue("");
    clearFiles();
    clearSelectedElements();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      // If Command+Enter or Shift+Enter, allow new line
      if (e.metaKey || e.shiftKey) {
        return;
      }

      // Otherwise, submit
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i]);
      }
    }
  };

  const handlePaste = async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          const file = items[i].getAsFile();
          if (file) await uploadFile(file);
        }
      }
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i]);
      }
    }
  };

  return (
    <div
      className={cn(
        "bg-bg-card border-border-subtle focus-within:ring-border-subtle relative flex w-full flex-col overflow-hidden rounded-[20px] border p-2 shadow-sm transition-all focus-within:ring-1",
        className,
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Visual Edit Selected Elements */}
      {selectedElements.length > 0 && (
        <div className="mb-1 flex max-h-[60px] flex-wrap gap-2 overflow-x-auto px-3 pt-2">
          {selectedElements.map((el) => (
            <div
              key={el.id}
              className="bg-primary/10 border-primary/20 text-primary group flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium"
            >
              <span className="font-mono text-[10px] opacity-70">
                &lt;{el.tagName.toLowerCase()}&gt;
              </span>
              <span className="max-w-25 truncate">
                {el.textContent ||
                  el.dataName ||
                  el.className ||
                  t("input.element")}
              </span>
              {el.sourceFile && (
                <span className="text-primary/60 max-w-40 truncate font-mono text-[10px]">
                  {el.sourceFile}
                  {el.sourceLine != null ? `:${el.sourceLine}` : ""}
                </span>
              )}
              <button
                onClick={() => removeSelectedElement(el.id)}
                className="hover:bg-primary/20 rounded-sm p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File Previews */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-2">
          {uploadedFiles.map((file) => {
            const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);
            return (
              <div
                key={file.id}
                className="group bg-bg-main border-border-subtle relative flex max-w-[200px] items-center gap-2 rounded-lg border p-2"
              >
                {isImage ? (
                  <div className="border-border-subtle h-10 w-10 shrink-0 overflow-hidden rounded-md border">
                    <img
                      src={file.url}
                      alt={file.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-border-subtle text-text-muted group-hover:text-text-main rounded-md p-1.5 transition-colors">
                    <FileIcon size={16} />
                  </div>
                )}
                <span className="text-text-main truncate text-xs font-medium">
                  {file.name}
                </span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="absolute -top-1.5 -right-1.5 z-10 rounded-full bg-red-500 p-0.5 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        disabled={isSending || disabled}
        placeholder={t("input.placeholder")}
        className="text-text-main placeholder:text-text-muted w-full resize-none bg-transparent px-3 py-3 text-[15px] outline-none disabled:opacity-70"
        style={{ minHeight: "44px", maxHeight: "200px" }}
      />

      <div className="mt-2 flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-text-muted hover:bg-hover-bg hover:text-text-main flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:opacity-50"
            title={t("input.attachFile")}
          >
            {isUploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Paperclip size={14} />
            )}
          </button>

          <Popover
            open={attachOpen}
            onOpenChange={(open) => {
              setAttachOpen(open);
              if (open) {
                refetchFunctions();
                refetchMicrofrontends();
              }
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "hover:bg-hover-bg flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-500",
                  recentlySelected
                    ? "text-green-500 hover:text-green-400"
                    : "text-text-muted hover:text-text-main",
                )}
                title={t("input.attach", { fallback: "Attach" })}
              >
                <Folder
                  size={15}
                  className="transition-colors duration-500"
                  fill={
                    activeCodeSelection?.kind === "new_project"
                      ? "#3b82f6"
                      : recentlySelected
                        ? "#22c55e"
                        : "currentColor"
                  }
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              sideOffset={6}
              className="max-h-60 w-48 overflow-y-auto p-0.5"
            >
              {isFunctionsLoading || isMicrofrontendsLoading ? (
                <div className="space-y-0.5 p-0.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="bg-hover-bg/60 h-6 animate-pulse rounded"
                    />
                  ))}
                </div>
              ) : (
                <>
                  <div>
                    <div className="text-text-muted flex items-center gap-1 px-2 pt-1.5 pb-0.5 text-[9px] tracking-wider uppercase">
                      Project
                    </div>
                    <button
                      type="button"
                      onClick={handleSelectNewProject}
                      className="text-text-main hover:bg-hover-bg flex w-full items-center justify-between gap-1.5 rounded px-2 py-1 text-left text-xs"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <FolderPlus
                          size={10}
                          className="text-primary shrink-0"
                        />
                        New frontend
                      </span>
                      {activeCodeSelection?.kind === "new_project" && (
                        <Check size={10} className="text-primary shrink-0" />
                      )}
                    </button>
                  </div>

                  {(microfrontendsList?.length ?? 0) > 0 && (
                    <div>
                      {microfrontendsList!.map((mf) => (
                        <button
                          key={mf.id}
                          type="button"
                          disabled={pendingItemId === mf.id}
                          onClick={() => handleSelectMicrofrontend(mf)}
                          className="text-text-main hover:bg-hover-bg flex w-full items-center justify-between gap-1.5 rounded px-2 py-1 text-left text-xs disabled:opacity-60"
                        >
                          <span className="truncate">{mf.name}</span>
                          <span className="flex shrink-0 items-center gap-1">
                            {activeCodeSelection?.kind === "microfrontend" &&
                              activeCodeSelection.id === mf.id && (
                                <Check size={10} className="text-primary" />
                              )}
                            {pendingItemId === mf.id && (
                              <Loader2 size={10} className="animate-spin" />
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {(functionsList?.length ?? 0) === 0 &&
                    (microfrontendsList?.length ?? 0) === 0 && (
                      <div className="text-text-muted px-2 py-3 text-center text-[11px]">
                        No items available
                      </div>
                    )}

                  {(isFunctionsError || isMicrofrontendsError) && (
                    <div className="px-2 py-1.5 text-[11px] text-red-500">
                      Failed to load items
                    </div>
                  )}
                </>
              )}
            </PopoverContent>
          </Popover>

          <Popover open={modelOpen} onOpenChange={setModelOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={savingModel}
                className="text-text-muted hover:bg-hover-bg hover:text-text-main flex h-7 items-center gap-1 rounded-full px-2 text-xs font-medium transition-colors disabled:opacity-60"
                title={t("input.model", { fallback: "AI provider" })}
              >
                {savingModel ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Sparkles size={13} className="text-primary shrink-0" />
                )}
                <span>{currentProviderName}</span>
                <ChevronDown size={12} className="opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              sideOffset={6}
              className="w-40 p-0.5"
            >
              {CHAT_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectModel(p.id)}
                  className="text-text-main hover:bg-hover-bg flex w-full items-center justify-between gap-1.5 rounded px-2 py-1 text-left text-xs"
                >
                  <span className="truncate">{p.name}</span>
                  {currentProvider === p.id && (
                    <Check size={10} className="text-primary shrink-0" />
                  )}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-1">
          {/* <button
            className={`border-border-subtle text-text-muted hover:bg-hover-bg hover:text-text-main flex h-7 items-center justify-center gap-1.5 rounded-full border px-2 text-xs font-medium transition-colors ${isInspectMode ? "bg-text-main text-bg-main" : ""} `}
            onClick={handleToggleVisualEdit}
          >
            <MousePointerClick size={13} />
            <span>{t('input.visualEdits')}</span>
          </button> */}
          {/* <button
            className={
              `
              text-text-muted hover:bg-hover-bg hover:text-text-main 
              flex h-8 items-center justify-center rounded-full px-3 
              text-xs font-medium transition-colors
              ${isPlanOn ? "bg-text-main text-bg-main" : ""}
              `
            }
            onClick={handleTogglePlan}
          >
            {t('input.plan')}
          </button>
          <AudioRecorder
            onTranscription={(text) => {
              setValue(prev => prev + (prev ? " " : "") + text);
              if (textareaRef.current) {
                textareaRef.current.focus();
              }
            }}
            size="sm"
          /> */}
          <button
            onClick={handleSend}
            disabled={
              (!value.trim() &&
                uploadedFiles.length === 0 &&
                selectedElements.length === 0) ||
              isUploading ||
              isSending
            }
            className="bg-text-main text-bg-main ml-1 flex h-7 w-7 items-center justify-center rounded-full transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            title={t("input.send")}
          >
            {isSending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ArrowUp size={14} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
