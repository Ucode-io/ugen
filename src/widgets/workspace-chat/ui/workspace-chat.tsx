"use client"
import { useState, useEffect, useRef, useCallback } from "react";
import { History, Loader2, PanelLeft, PanelRight } from "lucide-react";
import { ChatMessageBubble } from "./chat-message-bubble"
import { ChatInput } from "./chat-input"
import { useChatStore, Message } from "@/entities/chat";
import { Checkbox } from "@/shared/ui";
import { api } from "@/shared/api";
import { useFilesStore, IFile } from "@/entities/project/model/files-store";
import { useCodeSelectionStore } from "@/entities/project/model/code-selection-store";
import { useAuthStore } from "@/entities/session";
import { queryClient } from "@/shared/api/query-client";
import React from 'react';
import { BpmnViewer } from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";
import { useTranslations } from "next-intl";
import { VersionHistoryPanel, VersionPreviewFile } from "@/widgets/project-workspace/ui/version-history-panel";
import { ThinkingBlock, type SseEvent } from "./thinking-block";
import { useGuardedAction } from "@/widgets/project-workspace/lib/save-flow";

const getLanguageByPath = (path: string) => {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    default:
      return 'javascript';
  }
};

import type { CodeEditorTarget } from "@/entities/session";

interface WorkspaceChatProps {
  projectId: string
  projectTitle?: string
  isChatCollapsed: boolean
  isPreviewMaximized: boolean
  isVersionHistory: boolean
  setIsChatCollapsed: (isChatCollapsed: boolean) => void
  onToggleVersionHistory: () => void
  onSelectVersion: (files: VersionPreviewFile[] | null) => void
  onViewVersionCode: () => void
  onVersionReverted: () => void | Promise<void>
  onSelectFunction?: (target: CodeEditorTarget) => void
  onSelectMicrofrontend?: (files: { path: string; content: string }[]) => void
}

interface QuestionOption {
  id: string;
  label: string;
}

interface Question {
  id: string;
  title: string;
  type: 'single' | 'multi';
  options: QuestionOption[];
}



const PendingActionConfirm = ({
  action,
  onConfirm,
  disabled
}: {
  action: any,
  onConfirm: (approved: boolean, text: string) => void,
  disabled: boolean
}) => {
  const t = useTranslations('widgets.workspaceChat');
  const isDelete = action.action === 'delete';
  const isCreate = action.action === 'create';
  const isUpdate = action.action === 'update';

  let btnText = t('pendingAction.confirm');
  if (isCreate) btnText = t('pendingAction.create');
  if (isUpdate) btnText = t('pendingAction.update');
  if (isDelete) btnText = t('pendingAction.delete');

  const showBulkInfo = action.affected_count > 1;

  return (
    <div className="flex flex-col gap-2 p-4 mt-2 ml-4 mr-4 bg-bg-card border border-border-subtle rounded-xl text-sm shadow-sm max-w-[90%] self-start animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="font-medium text-text-main leading-snug">
        {action.description || action.confirmation_prompt}
      </div>

      {showBulkInfo && (
        <div className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md w-fit
          ${isDelete ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
          {isDelete ? t('pendingAction.bulkDelete', { count: action.affected_count }) :
            isUpdate ? t('pendingAction.bulkUpdate', { count: action.affected_count }) :
              t('pendingAction.bulkCreate', { count: action.affected_count })}
        </div>
      )}

      {action.confirmation_prompt && action.confirmation_prompt !== action.description && (
        <div className="text-xs text-text-muted italic bg-bg-sidebar/50 p-2 rounded-lg border border-border-subtle/50">
          {action.confirmation_prompt}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        <button
          disabled={disabled}
          onClick={() => onConfirm(true, t("pendingAction.yes"))}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50
            ${isDelete
              ? 'bg-destructive text-white hover:bg-destructive/90 shadow-sm'
              : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
            }`}
        >
          {btnText}
        </button>
        <button
          disabled={disabled}
          onClick={() => onConfirm(false, t("pendingAction.no"))}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-text-main bg-bg-main hover:bg-hover-bg border border-border-subtle transition-all active:scale-95 disabled:opacity-50"
        >
          {t('pendingAction.cancel')}
        </button>
      </div>
    </div>
  )
}

export const WorkspaceChat = ({ projectId, isChatCollapsed, isVersionHistory, onToggleVersionHistory, onSelectVersion, onViewVersionCode, onVersionReverted, onSelectFunction, onSelectMicrofrontend }: WorkspaceChatProps) => {
  const t = useTranslations('widgets.workspaceChat');

  const MOCK_CHAT: Message[] = [
    {
      id: '1',
      role: 'ai',
      content: t('mockMessage')
    }
  ]

  const width = useChatStore((state) => state.chatWidth);
  const setChatWidth = useChatStore((state) => state.setChatWidth);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartWidthRef = useRef(360);
  const dragStartXRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const thinkingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sseEvents = useChatStore((state) => state.sseEvents);
  const addSseEvent = useChatStore((state) => state.addSseEvent);
  const clearSseEvents = useChatStore((state) => state.clearSseEvents);
  const accumulatedFilesRef = useRef<{ path: string; content: string }[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = useChatStore((state) => state.messages);
  const addMessage = useChatStore((state) => state.addMessage);
  const unshiftMessages = useChatStore((state) => state.unshiftMessages);
  const setMessages = useChatStore((state) => state.setMessages);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const chatId = useChatStore((state) => state.chatId);
  const setChatId = useChatStore((state) => state.setChatId);
  const setStoreProjectId = useChatStore((state) => state.setProjectId);
  const clearChat = useChatStore((state) => state.clearChat);
  const pendingPrompt = useChatStore((state) => state.pendingPrompt);
  const setPendingPrompt = useChatStore((state) => state.setPendingPrompt);
  const chatPosition = useChatStore((state) => state.chatPosition);
  const setChatPosition = useChatStore((state) => state.setChatPosition);
  const setIsStreaming = useChatStore((state) => state.setIsStreaming);
  const setStreamError = useChatStore((state) => state.setStreamError);
  const setPendingScreenshot = useChatStore((state) => state.setPendingScreenshot);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionData, setQuestionData] = useState<Question[]>([]);

  const handleOptionToggle = (questionId: string, optionId: string, type: 'single' | 'multi') => {
    setAnswers(prev => {
      const currentAnswers = prev[questionId] || [];
      if (type === 'single') {
        setCustomAnswers(prevCustom => ({ ...prevCustom, [questionId]: '' }));
        return { ...prev, [questionId]: [optionId] };
      }
      if (currentAnswers.includes(optionId)) {
        return { ...prev, [questionId]: currentAnswers.filter(id => id !== optionId) };
      }
      return { ...prev, [questionId]: [...currentAnswers, optionId] };
    });
  }

  const handleCustomAnswerChange = (questionId: string, value: string, type: 'single' | 'multi') => {
    setCustomAnswers(prev => ({ ...prev, [questionId]: value }));
    if (value.trim() && type === 'single') {
      setAnswers(prevAnswers => ({ ...prevAnswers, [questionId]: [] }));
    }
  }

  const handleFinish = () => {
    const formattedAnswers: string[] = [];
    questionData.forEach(q => {
      const selectedOptionLabels = q.options
        .filter(opt => (answers[q.id] || []).includes(opt.id))
        .map(opt => opt.label);

      const customVal = customAnswers[q.id];
      const allAnswers = [...selectedOptionLabels];
      if (customVal?.trim()) allAnswers.push(customVal.trim());

      if (allAnswers.length > 0) {
        formattedAnswers.push(`Question: ${q.title}\nUser answer: ${allAnswers.join(', ')}`);
      }
    });

    if (formattedAnswers.length > 0) {
      handleSendMessage(formattedAnswers.join('\n\n'));
    }

    setShowQuestionnaire(false);
  }

  const setFiles = useFilesStore((state) => state.setFiles);
  const activeCodeSelection = useCodeSelectionStore((state) => state.activeCodeSelection);
  const setActiveCodeSelection = useCodeSelectionStore((state) => state.setActiveCodeSelection);
  const apiKey = useAuthStore((state) => state.apiKey);
  const setApiKey = useAuthStore((state) => state.setApiKey);
  const accessToken = useAuthStore((state) => state.accessToken);

  const displayMessages = messages.length > 0 ? messages : (!isLoadingHistory && offset === 0 ? MOCK_CHAT : []);

  const fetchHistory = async (currentOffset: number) => {
    if (!projectId || !hasMore || isLoadingHistory) return;
    setIsLoadingHistory(true);

    try {
      const { data } = await api.get(`/v1/ai-chat/project/${projectId}`, {
        params: { limit: 10, offset: currentOffset },
      });

      const resData = data.data || data.messages || [];
      const historyMessages = Array.isArray(resData)
        ? resData
        : resData.messages || resData.data || [];

      if (historyMessages.length > 0) {
        setChatId(historyMessages[0].chat_id || historyMessages?.[1]?.chat_id);
        const formatted = historyMessages.map((m: Message) => ({
          id: m.id || Date.now().toString(),
          role: m.role || "ai",
          content: m.content || "",
          pending_action: m.pending_action,
          bpmnXml: m?.plan?.bpmn_xml,
        }));

        const previousScrollHeight = scrollRef.current?.scrollHeight || 0;

        if (currentOffset === 0) {
          setMessages(formatted);
        } else {
          unshiftMessages(formatted);
        }
        setOffset(currentOffset + 10);

        requestAnimationFrame(() => {
          if (scrollRef.current) {
            if (currentOffset === 0) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            } else {
              const newScrollHeight = scrollRef.current.scrollHeight;
              scrollRef.current.scrollTop = newScrollHeight - previousScrollHeight;
            }
          }
        });
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const startResizing = useCallback((e: React.PointerEvent) => {
    setIsResizing(true);
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = width;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [width]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: PointerEvent) => {
      if (isResizing) {
        const deltaX = e.clientX - dragStartXRef.current;
        const signedDelta = chatPosition === 'right' ? -deltaX : deltaX;
        const newWidth = dragStartWidthRef.current + signedDelta;

        if (newWidth >= 360 && newWidth <= 580) {
          setChatWidth(newWidth);
        } else if (newWidth < 360) {
          setChatWidth(360);
        } else if (newWidth > 580) {
          setChatWidth(580);
        }
      }
    },
    [isResizing, chatPosition]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("pointermove", resize);
      window.addEventListener("pointerup", stopResizing);
      window.addEventListener("pointercancel", stopResizing);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    return () => {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, resize, stopResizing]);

  useEffect(() => {
    if (projectId) {
      clearChat();
      clearSseEvents();
      setStoreProjectId(projectId);
      setOffset(0);
      setHasMore(true);
    }
  }, [projectId, clearChat, clearSseEvents, setStoreProjectId]);

  useEffect(() => {
    if (projectId && offset === 0 && hasMore && !isLoadingHistory) {
      fetchHistory(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, offset]);

  const lastProcessedPromptRef = useRef<any>(null);

  useEffect(() => {
    if (chatId && projectId && pendingPrompt && lastProcessedPromptRef.current !== pendingPrompt) {
      lastProcessedPromptRef.current = pendingPrompt;
      const promptToProcess = pendingPrompt;
      setPendingPrompt(null);
      handleSendMessage(
        promptToProcess.content,
        promptToProcess.images?.map((url: string) => ({ url })),
        promptToProcess.model,
        undefined,
        promptToProcess.context,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, projectId, pendingPrompt]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    if (scrollRef.current.scrollTop === 0 && hasMore && !isLoadingHistory) {
      fetchHistory(offset);
    }
  };

  const handleAutoScroll = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  const guardedAction = useGuardedAction();

  const handleSendMessage = (text: string, files?: any[], model?: string, pendingActionPayload?: any, context?: Array<{ path?: string | null; line?: number | string | null; element?: string | null }>) => {
    guardedAction(() => sendMessageInner(text, files, model, pendingActionPayload, context));
  };

  const sendMessageInner = async (text: string, files?: any[], model?: string, pendingActionPayload?: any, context?: Array<{ path?: string | null; line?: number | string | null; element?: string | null }>) => {
    clearSseEvents();
    setStreamError(null);
    accumulatedFilesRef.current = [];
    addMessage({ id: Date.now().toString(), role: "user", content: text, images: files?.map(f => f.url) || [] });
    handleAutoScroll();

    let activeChatId = chatId;
    if (!activeChatId) {
      try {
        const { data } = await api.get(`/v1/ai-chat/project/${projectId}`, {
          params: { limit: 10, offset: 0 },
        });
        const resData = data.data || data.messages || [];
        const historyMessages = Array.isArray(resData)
          ? resData
          : resData.messages || resData.data || [];

        activeChatId = historyMessages[0].chat_id || historyMessages?.[1]?.chat_id;
        setChatId(activeChatId);
      } catch (err) {
        console.error("Failed to create chat", err);
        return;
      }
    }

    if (activeChatId) {
      setIsSending(true);
      setIsStreaming(true);
      thinkingTimeoutRef.current = setTimeout(() => {
        setIsThinking(true);
        handleAutoScroll();
      }, 500);

      const isMicrofrontendSelected = activeCodeSelection?.kind === 'microfrontend';
      const isNewProjectSelected = activeCodeSelection?.kind === 'new_project';
      const payload = {
        content: text,
        images: files?.map(f => f.url) || [],
        has_files: (files?.length || 0) > 0,
        tokens_used: 100,
        model,
        resource_env_id: activeCodeSelection?.projectId,
        new_project: !isMicrofrontendSelected && !isNewProjectSelected,
        ...(isMicrofrontendSelected ? {
          microfrontend_id: activeCodeSelection.id,
          microfrontend_repo_id: activeCodeSelection.repoId,
          resource_env_id: activeCodeSelection.projectId,
        } : {}),
        ...(context?.length ? {
          context: context.map(({ element, ...rest }) => ({
            ...rest,
            ...(element ? { outer_html: element } : {}),
          }))
        } : {}),
        ...(pendingActionPayload ? { pending_action: pendingActionPayload } : {}),
      };

      const processDoneData = (data: any) => {
        const newMicrofrontendId = data?.microfrontend_id;
        const newMicrofrontendRepoId = data?.microfrontend_repo_id;
        const newMicrofrontendProjectId = data?.project_id ?? data?.microfrontend_project_id;
        if (newMicrofrontendId) {
          const headers = apiKey ? { Authorization: 'API-KEY', 'x-api-key': apiKey } : {};
          const partialTarget = {
            kind: 'microfrontend' as const,
            id: newMicrofrontendId,
            repoId: newMicrofrontendRepoId,
            projectId: newMicrofrontendProjectId,
          };
          // Set selection synchronously so chat-input's auto-select bails out
          // instead of racing with our codebase fetch and picking the wrong MF.
          setActiveCodeSelection(partialTarget, null);

          // BE just finished generating — codebase endpoint may briefly return
          // empty before the repo settles. Retry a few times before giving up.
          const fetchCodebase = async () => {
            for (let i = 0; i < 4; i++) {
              try {
                const { data } = await api.get(`/v2/function/${newMicrofrontendId}/codebase`, {
                  params: { 'project-id': projectId }, headers,
                });
                const fs = (data?.data?.files ?? []) as { path: string; content: string }[];
                if (fs.length > 0) return fs;
              } catch { /* fall through to retry */ }
              if (i < 3) await new Promise(r => setTimeout(r, 700));
            }
            return [] as { path: string; content: string }[];
          };

          Promise.all([
            fetchCodebase(),
            api.get('/v2/functions/micro-frontend', { params: { search: '', offset: 0, limit: 50, 'project-id': projectId }, headers }),
          ])
            .then(([codebaseFiles, listRes]) => {
              const list = (listRes.data?.data?.functions ?? []) as Array<{
                id: string; name?: string; path?: string; branch?: string; type?: string;
                project_id?: string; url?: string; repo_id?: string;
              }>;

              // First generation: preview viewer hasn't mounted, so the queries don't exist
              // in cache yet — invalidate/refetch are no-ops. Seed the cache directly so the
              // viewer sees the fresh list as soon as it mounts.
              if (!isMicrofrontendSelected) {
                queryClient.setQueryData(['preview-microfrontends', projectId], list);
                queryClient.setQueryData(['attach-microfrontends', projectId], list);
                queryClient.setQueryData(['microfrontends-dropdown', projectId], list);
              }

              const meta = list.find((m) => m.id === newMicrofrontendId);
              const target = meta
                ? {
                    ...partialTarget,
                    name: meta.name,
                    path: meta.path,
                    branch: meta.branch ?? 'master',
                    type: meta.type,
                    url: meta.url,
                    repoId: meta.repo_id ?? newMicrofrontendRepoId,
                    projectId: meta.project_id ?? newMicrofrontendProjectId,
                  }
                : partialTarget;
              setActiveCodeSelection(target, codebaseFiles);
              onSelectMicrofrontend?.(codebaseFiles);
            })
            // Keep partialTarget, but resolve files to [] (not null) so the
            // preview stops waiting — null reads as "codebase still loading".
            .catch(() => setActiveCodeSelection(partialTarget, []));
        }

        queryClient.invalidateQueries({ queryKey: ['attach-microfrontends', projectId] });
        queryClient.invalidateQueries({ queryKey: ['preview-microfrontends', projectId] });
        queryClient.invalidateQueries({ queryKey: ['microfrontends', projectId] });
        queryClient.invalidateQueries({ queryKey: ['microfrontends-dropdown', projectId] });

        // First generation: BE may have just minted the project's api_key and project_files.
        // Without these, attach-microfrontends query stays disabled and the preview viewer
        // never mounts (hasNoFiles=true), so subsequent invalidates are no-ops. Refresh project
        // state explicitly so the UI behaves like after a page reload.
        if (!isMicrofrontendSelected) {
          api.get(`/v1/mcp_project/${projectId}`)
            .then((res) => {
              const projectData = res.data?.data;
              if (!projectData) return;
              if (projectData.api_key) setApiKey(projectData.api_key, projectId);
              if (projectData.project_files?.length > 0) {
                setFiles(projectData.project_files.map((f: any) => ({
                  path: f.path, content: f.content, language: getLanguageByPath(f.path),
                })));
              }
            })
            .catch((err) => console.error('Failed to refresh project after first generation', err));
        }

        if (data?.project?.project_files) {
          setFiles(data.project.project_files.map((f: any) => ({
            path: f.path, content: f.content, language: getLanguageByPath(f.path),
          })));
        }

        const responseMsg = data?.message;
        const pendingAction = data?.pending_action;
        const questions = data?.questions;
        const bpmnXml = data?.plan?.bpmn_xml;

        if (responseMsg?.content || pendingAction || bpmnXml) {
          addMessage({
            id: responseMsg?.id || data?.id || (Date.now() + 1).toString(),
            role: 'ai',
            content: responseMsg?.content || '',
            pending_action: pendingAction || null,
            isFromResponse: true,
            bpmnXml,
          });
          handleAutoScroll();
        }
        if (questions) { setShowQuestionnaire(true); setQuestionData(questions); }
      };

      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://api.admin.u-code.io';
        const response = await fetch(`${baseUrl}/v1/ai-chat/new-messages/${activeChatId}?stream=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify(payload),
        });

        if (!response.ok || !response.body) throw new Error(`HTTP error! status: ${response.status}`);

        setIsThinking(true);
        handleAutoScroll();

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let finalDoneData: any = null;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              if (finalDoneData) processDoneData(finalDoneData);
              break;
            }

            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try {
                const event: SseEvent = JSON.parse(line.slice(6));
                addSseEvent(event);

                if (event.type === 'chunk_done' && event.data?.files?.length) {
                  accumulatedFilesRef.current = [...accumulatedFilesRef.current, ...event.data.files];
                  setFiles(accumulatedFilesRef.current.map((f: any) => ({
                    path: f.path, content: f.content, language: getLanguageByPath(f.path),
                  })));
                } else if (event.type === 'error') {
                  setStreamError(event.message ?? 'AI processing failed');
                } else if (event.type === 'done') {
                  finalDoneData = event.data?.data ?? event.data;
                }
              } catch {
                // skip malformed line
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch (err) {
        console.error(err);
        setStreamError(err instanceof Error ? err.message : 'Network error during AI generation');
      } finally {
        setIsSending(false);
        setIsThinking(false);
        setIsStreaming(false);
        setPendingScreenshot(true);
        if (thinkingTimeoutRef.current) {
          clearTimeout(thinkingTimeoutRef.current);
          thinkingTimeoutRef.current = null;
        }
      }
    }
  }

  const handleConfirmAction = async (originalMsg: Message, approved: boolean, text: string) => {
    updateMessage(originalMsg.id, {
      pending_action: { ...originalMsg.pending_action, approved: true }
    });
    handleSendMessage(text, undefined, undefined, {
      ...originalMsg.pending_action,
      approved
    });
  }

  const isDisabled = displayMessages.some((msg: Message) => msg.pending_action && !msg.pending_action.approved) || (showQuestionnaire && questionData.length > 0);

  const isPendingActionConfirm = (msg: Message) => {
    return msg.pending_action && !msg.pending_action.approved;
  }

  const lastMessage = displayMessages[displayMessages.length - 1];
  const showBpmnConfirm = !!lastMessage?.bpmnXml;

  return (
    <div className={cn(
      "h-full transition-width duration-300 ease-in-out",
      {
        "w-0 overflow-hidden": isChatCollapsed,
      }
    )}>
      {isResizing && (
        <div className="fixed inset-0 z-9999 cursor-col-resize select-none pointer-events-auto" />
      )}
      <div
        className={cn(`bg-bg-main group relative flex border-none h-full shrink-0 flex-col`, {"w-0": isChatCollapsed})}
        style={{
          width: isChatCollapsed ? 0 : `${width}px`,
          transition: isResizing ? 'none' : 'width 300ms cubic-bezier(0.4, 0, 0.2, 1), border 300ms opacity 300ms'
        }}
      >
        {/* Resize Handle */}
        <div
          onPointerDown={startResizing}
          className={cn("absolute top-0 h-full w-0.5 cursor-col-resize hover:bg-primary/20 transition-colors group z-50 flex items-center justify-center", {"left-0 translate-x-[-1/2]": chatPosition === "right", "right-0 translate-x-[1/2]": chatPosition === "left"})}
        >
          <div className="w-1 h-12 bg-border-subtle group-hover:bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm" />
        </div>

        <div className="flex h-10 shrink-0 items-center justify-between gap-2 px-2">
          <div />
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onToggleVersionHistory}
              title="Version History"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                isVersionHistory
                  ? "bg-bg-sidebar text-text-main"
                  : "text-text-muted hover:bg-hover-bg hover:text-text-main"
              )}
            >
              <History size={14} />
            </button>
            <button
              type="button"
              onClick={() => setChatPosition(chatPosition === 'left' ? 'right' : 'left')}
              title="Toggle chat position"
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors text-text-muted hover:bg-hover-bg hover:text-text-main"
            >
              {chatPosition === 'left' ? <PanelRight size={14} /> : <PanelLeft size={14} />}
            </button>
          </div>
        </div>

        <div
          className={`flex h-full w-full flex-col overflow-hidden transition-opacity duration-300 ${isChatCollapsed ? "pointer-events-none opacity-0" : "opacity-100"}`}
        >
          {/* Version History Panel */}
          {isVersionHistory && (
            <VersionHistoryPanel
              onClose={onToggleVersionHistory}
              onSelectCommit={onSelectVersion}
              onViewCode={onViewVersionCode}
              onReverted={onVersionReverted}
            />
          )}

          {/* Messages list */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className={cn("flex-1 overflow-y-auto py-2", isVersionHistory && "hidden")}
          >
            {isLoadingHistory && (
              <div className="flex justify-center p-2">
                <Loader2 className="text-text-muted animate-spin" size={20} />
              </div>
            )}

            {displayMessages.map((msg: Message) => (
              <React.Fragment key={msg.id}>
                {msg?.images && msg.images.length > 0 && (
                  <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2 mb-2`}>
                    {msg.images.map((image) => (
                      <img key={image} src={image} alt={image} className="w-20 h-20 object-cover rounded-sm" />
                    ))}
                  </div>
                )}
                {msg.content && (
                  <ChatMessageBubble
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    isFromResponse={msg.isFromResponse}
                    onAutoScroll={handleAutoScroll}
                  />
                )}
                {msg.bpmnXml && (
                  <>
                    <BpmnViewer bpmnXml={msg.bpmnXml} />
                    {showBpmnConfirm && msg.id === lastMessage?.id && (
                      <div className="flex flex-col gap-2 p-4 mt-2 ml-4 mr-4 bg-bg-card border border-border-subtle rounded-xl text-sm shadow-sm max-w-[90%] self-start animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="font-medium text-text-main leading-snug">
                          {t('bpmn.confirmPrompt', { fallback: 'Accept or Reject BPMN' })}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            disabled={isSending}
                            onClick={() => handleSendMessage('Accept')}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                          >
                            {t('bpmn.accept', { fallback: 'Accept' })}
                          </button>
                          <button
                            disabled={isSending}
                            onClick={() => handleSendMessage('Reject')}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-text-main bg-bg-main hover:bg-hover-bg border border-border-subtle transition-all active:scale-95 disabled:opacity-50"
                          >
                            {t('bpmn.reject', { fallback: 'Reject' })}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {isPendingActionConfirm(msg) && (
                  <PendingActionConfirm
                    action={msg.pending_action}
                    onConfirm={(approved, text) => handleConfirmAction(msg, approved, text)}
                    disabled={isSending}
                  />
                )}
              </React.Fragment>
            ))}

            {(isThinking || sseEvents.length > 0) && (
              <div className="flex w-full justify-start px-4 pb-2">
                {sseEvents.length > 0 ? (
                  <ThinkingBlock
                    events={sseEvents}
                    isStreaming={isSending}
                    className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-text-muted text-sm italic py-2">
                    <Loader2 className="animate-spin" size={16} />
                    <span>{t('thinking')}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fixed bottom input container */}
          <div className={cn("shrink-0 bg-transparent px-4 pt-2 pb-4", isVersionHistory && "hidden")}>
            {/* Questionnaire Container (Glued to Input) */}
            {showQuestionnaire && (
              <div className="bg-bg-card border border-border-subtle border-b-0 rounded-t-[20px] p-4 flex flex-col gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-sm font-bold text-text-main line-clamp-1">
                    {questionData[currentQuestionIndex].title}
                  </h4>
                  <span className="text-[10px] font-bold text-text-muted bg-bg-sidebar px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    {t('questionnaire.step', { current: currentQuestionIndex + 1, total: questionData.length })}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {questionData[currentQuestionIndex].options.map((option) => {
                    const isChecked = (answers[questionData[currentQuestionIndex].id] || []).includes(option.id);
                    return (
                      <div
                        key={option.id}
                        onClick={() => handleOptionToggle(
                          questionData[currentQuestionIndex].id,
                          option.id,
                          questionData[currentQuestionIndex].type
                        )}
                        className={`
                          flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer select-none
                          ${isChecked
                            ? 'border-primary/50 bg-primary/5 shadow-sm'
                            : 'border-border-subtle hover:border-border-subtle/80 hover:bg-hover-bg/50'}
                        `}
                      >
                        <Checkbox
                          id={option.id}
                          checked={isChecked}
                          readOnly
                          className="pointer-events-none"
                        />
                        <span className={`text-sm font-medium transition-colors ${isChecked ? 'text-text-main' : 'text-text-muted'}`}>
                          {option.label}
                        </span>
                      </div>
                    );
                  })}

                  {/* Own Answer Input */}
                  <div
                    className={`
                      flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer group
                      ${customAnswers[questionData[currentQuestionIndex].id]?.trim()
                        ? 'border-primary/50 bg-primary/5 shadow-sm'
                        : 'border-border-subtle hover:border-border-subtle/80 hover:bg-hover-bg/50'}
                    `}
                  >
                    <Checkbox
                      id={`${questionData[currentQuestionIndex].id}-custom`}
                      checked={!!customAnswers[questionData[currentQuestionIndex].id]?.trim()}
                      readOnly
                      className="pointer-events-none"
                    />
                    <input
                      type="text"
                      placeholder={t('questionnaire.ownAnswer')}
                      value={customAnswers[questionData[currentQuestionIndex].id] || ''}
                      onChange={(e) => handleCustomAnswerChange(
                        questionData[currentQuestionIndex].id,
                        e.target.value,
                        questionData[currentQuestionIndex].type
                      )}
                      className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-muted text-text-main disabled:cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-subtle/50 mt-1">
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="text-xs font-bold text-text-muted hover:text-text-main disabled:opacity-30 disabled:pointer-events-none transition-colors px-3 py-1.5 rounded-lg hover:bg-hover-bg"
                  >
                    {t('questionnaire.back')}
                  </button>
                  {currentQuestionIndex === questionData.length - 1 ? (
                    <button
                      onClick={handleFinish}
                      disabled={!(answers[questionData[currentQuestionIndex].id]?.length || customAnswers[questionData[currentQuestionIndex].id]?.trim())}
                      className="text-xs font-bold bg-primary text-white px-6 py-1.5 rounded-lg hover:bg-primary/90 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
                    >
                      {t('questionnaire.finish')}
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => Math.min(questionData.length - 1, prev + 1))}
                      disabled={!(answers[questionData[currentQuestionIndex].id]?.length || customAnswers[questionData[currentQuestionIndex].id]?.trim())}
                      className="text-xs font-bold bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary/90 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
                    >
                      {t('questionnaire.nextStep')}
                    </button>
                  )}
                </div>
              </div>
            )}

            <ChatInput
              onSendMessage={(msg, files, model, context) => handleSendMessage(msg, files, model, undefined, context)}
              isSending={isSending}
              disabled={isDisabled}
              projectId={projectId}
              onSelectFunction={onSelectFunction}
              onSelectMicrofrontend={onSelectMicrofrontend}
              className={cn(
                "!rounded-t-none !border-t-0",
                !showQuestionnaire && "!rounded-t-[20px] !border-t"
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
