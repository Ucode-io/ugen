"use client"
import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { ChatMessageBubble } from "./chat-message-bubble"
import { ChatInput } from "./chat-input"
import { useChatStore, Message } from "@/entities/chat";
import { api } from "@/shared/api";
import { useFilesStore, IFile } from "@/entities/project/model/files-store";
import React from 'react';
import { BpmnViewer } from "@/shared/ui/bpmn-viewer";
import { bpmnXmlContnet } from "./bpmn";
import { FlowDiagram } from "@/shared/ui/flow-diagram";

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

interface WorkspaceChatProps {
  projectId: string
  isCollapsed?: boolean;
}

const MOCK_CHAT: Message[] = [
  {
    id: '1',
    role: 'ai',
    content: "Hi there! I am your AI assistant for this workspace. How can I help you build your project today? \n\nYou can ask me to write code, debug issues, or plan architecture."
  }
]

const PendingActionConfirm = ({
  action,
  onConfirm,
  disabled
}: {
  action: any,
  onConfirm: (approved: boolean, text: string) => void,
  disabled: boolean
}) => {
  const isDelete = action.action === 'delete';
  const isCreate = action.action === 'create';
  const isUpdate = action.action === 'update';

  let btnText = '✓ Да, подтвердить';
  if (isCreate) btnText = '✓ Да, создать';
  if (isUpdate) btnText = '✓ Да, обновить';
  if (isDelete) btnText = '✓ Да, удалить';

  const showBulkInfo = action.affected_count > 1;

  return (
    <div className="flex flex-col gap-2 p-4 mt-2 ml-4 mr-4 bg-bg-card border border-border-subtle rounded-xl text-sm shadow-sm max-w-[90%] self-start animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="font-medium text-text-main leading-snug">
        {action.description || action.confirmation_prompt}
      </div>

      {showBulkInfo && (
        <div className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md w-fit
          ${isDelete ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
          {isDelete ? `Будет удалено ${action.affected_count} записей` :
           isUpdate ? `Будет обновлено ${action.affected_count} записей` :
           `Будет создано ${action.affected_count} записей`}
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
          onClick={() => onConfirm(true, "Да")}
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
          onClick={() => onConfirm(false, "Нет")}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-text-main bg-bg-main hover:bg-hover-bg border border-border-subtle transition-all active:scale-95 disabled:opacity-50"
        >
          ✕ Отмена
        </button>
      </div>
    </div>
  )
}

export const WorkspaceChat = ({ projectId, isCollapsed = false }: WorkspaceChatProps) => {
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const thinkingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = useChatStore((state) => state.messages);
  const addMessage = useChatStore((state) => state.addMessage);
  const unshiftMessages = useChatStore((state) => state.unshiftMessages);
  const setMessages = useChatStore((state) => state.setMessages);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const chatId = useChatStore((state) => state.chatId);
  // const currentStoreProjectId = useChatStore((state) => state.projectId);
  const setChatId = useChatStore((state) => state.setChatId);
  const setStoreProjectId = useChatStore((state) => state.setProjectId);
  const clearChat = useChatStore((state) => state.clearChat);
  const pendingPrompt = useChatStore((state) => state.pendingPrompt);
  const setPendingPrompt = useChatStore((state) => state.setPendingPrompt);

  const setFiles = useFilesStore((state) => state.setFiles);

  // Use global messages if available, else fallback to mock if not loading.
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
        console.log({ historyMessages })
        setChatId(historyMessages[0].chat_id || historyMessages?.[1]?.chat_id);
        const formatted = historyMessages.map((m: any) => ({
          id: m.id || m.message_id || Date.now().toString(),
          role: m.role || "ai",
          content: m.content || "",
          pending_action: m.pending_action,
        }));

        const previousScrollHeight = scrollRef.current?.scrollHeight || 0;

        if (currentOffset === 0) {
          setMessages(formatted);
        } else {
          unshiftMessages(formatted);
        }
        setOffset(currentOffset + 10);

        // Restore scroll position
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            if (currentOffset === 0) {
              // Initial load - scroll to bottom
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            } else {
              // History load - maintain position
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

  // Reset logic when projectId changes
  useEffect(() => {
    if (projectId) {
      clearChat();
      setStoreProjectId(projectId);
      setOffset(0);
      setHasMore(true);
    }
  }, [projectId, clearChat, setStoreProjectId]);

  // Load history on mount or when projectId changes, but only if offset is 0
  useEffect(() => {
    if (projectId && offset === 0 && hasMore && !isLoadingHistory) {
      console.log("fetching history for project", projectId);
      fetchHistory(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, offset]);

  const lastProcessedPromptRef = useRef<any>(null);

  // Handle pending prompt from dashboard
  useEffect(() => {
    if (chatId && projectId && pendingPrompt && lastProcessedPromptRef.current !== pendingPrompt) {
      lastProcessedPromptRef.current = pendingPrompt;
      const promptToProcess = pendingPrompt;
      setPendingPrompt(null);
      handleSendMessage(
        promptToProcess.content,
        promptToProcess.images?.map((url: string) => ({ url })),
        promptToProcess.model
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

  const handleSendMessage = async (text: string, files?: any[], model?: string, pendingActionPayload?: any) => {
    // Add user message locally
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

        console.log({ data, historyMessages })
        activeChatId = historyMessages[0].chat_id || historyMessages?.[1]?.chat_id;
        setChatId(activeChatId);
      } catch (err) {
        console.error("Failed to create chat", err);
        return;
      }
    }

    if (activeChatId) {
      setIsSending(true);
      thinkingTimeoutRef.current = setTimeout(() => {
        setIsThinking(true);
        handleAutoScroll();
      }, 2000);

      try {
        const { data: messageData } = await api.post(
          `/v1/ai-chat/new-messages/${chatId}`,
          {
            content: text,
            images: files?.map(f => f.url) || [],
            has_files: (files?.length || 0) > 0,
            tokens_used: 100,
            model: model,
            ...(pendingActionPayload ? { pending_action: pendingActionPayload } : {})
          },
        );

        if (messageData?.data?.project?.project_files) {
          const mappedFiles: IFile[] = messageData.data.project.project_files.map((file: any) => ({
            path: file.path,
            content: file.content,
            language: getLanguageByPath(file.path)
          }));
          setFiles(mappedFiles);
        }

        const responseMsg = messageData?.data?.message;
        const pendingAction = messageData?.data?.pending_action;

        if (responseMsg?.content || pendingAction) {
          addMessage({
            id: responseMsg?.id || messageData?.data?.id || (Date.now() + 1).toString(),
            role: "ai",
            content: responseMsg?.content || "",
            pending_action: pendingAction,
            isFromResponse: true,
          });

          // Auto scroll down upon new message
          handleAutoScroll();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSending(false);
        setIsThinking(false);
        if (thinkingTimeoutRef.current) {
          clearTimeout(thinkingTimeoutRef.current);
          thinkingTimeoutRef.current = null;
        }
      }
    }
  }

  const handleConfirmAction = async (originalMsg: Message, approved: boolean, text: string) => {
    updateMessage(originalMsg.id, {
      pending_action: { ...originalMsg.pending_action, approved: true } // optimistically hide buttons
    });
    // Post the action
    handleSendMessage(text, undefined, undefined, {
      ...originalMsg.pending_action,
      approved
    });
  }

  const isDisabled = displayMessages.some((msg: Message) => msg.pending_action && msg.pending_action.approved === false);

  const isPendingActionConfirm = (msg: Message) => {
    return msg.pending_action && msg.pending_action.approved === false;
  }

  return (
    <div
      className={`bg-bg-main border-border-subtle relative flex h-full shrink-0 flex-col transition-all duration-300 ${isCollapsed ? "w-0 border-r-0" : "w-[550px] border-r"}`}
    >
      <div
        className={`flex h-full w-full flex-col overflow-hidden transition-opacity duration-300 ${isCollapsed ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        {/* Messages list */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 space-y-4 overflow-y-auto p-4"
        >
          {isLoadingHistory && (
            <div className="flex justify-center p-2">
              <Loader2 className="text-text-muted animate-spin" size={20} />
            </div>
          )}
          {/* <BpmnViewer
            bpmnXml={bpmnXmlContnet}
          />
          <FlowDiagram edges={
            [
              { "from": "Web / Mobile", "to": "API Gateway", "label": "HTTPS" },
              { "from": "API Gateway", "to": "Auth Service", "label": "JWT" },
              { "from": "API Gateway", "to": "TMS Core API", "label": "REST" },
              { "from": "TMS Core API", "to": "PostgreSQL", "label": "queries" },
              { "from": "TMS Core API", "to": "Redis Cache", "label": "cache" },
              { "from": "TMS Core API", "to": "WebSocket Hub", "label": "live" },
              { "from": "GPS / IoT Devices", "to": "WebSocket Hub", "label": "stream" }
            ]
          }
          /> */}
          {displayMessages.map((msg: Message) => (
            <React.Fragment key={msg.id}>
              {msg?.images && msg.images.length > 0 && (
                <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2 mb-2`}>
                  {msg.images.map((image) => (
                    <img key={image} src={image} alt={image} className="w-20 h-20 object-cover rounded-sm" />
                  ))}
                </div>
              )}
              {
                msg.content && (
                  <ChatMessageBubble
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    isFromResponse={msg.isFromResponse}
                    onAutoScroll={handleAutoScroll}
                  />
                )
              }
              {isPendingActionConfirm(msg) && (
                <PendingActionConfirm
                  action={msg.pending_action}
                  onConfirm={(approved, text) => handleConfirmAction(msg, approved, text)}
                  disabled={isSending}
                />
              )}
            </React.Fragment>
          ))}
          {isThinking && (
            <div className="flex w-full justify-start px-4">
              <div className="flex items-center gap-2 text-text-muted text-sm italic py-2">
                <Loader2 className="animate-spin" size={16} />
                <span>Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Fixed bottom input container */}
        <div className="shrink-0 bg-transparent px-4 pt-2 pb-4">
          <ChatInput onSendMessage={handleSendMessage} isSending={isSending} disabled={isDisabled} />
        </div>
      </div>
    </div>
  );
};
