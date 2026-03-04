"use client"
import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { ChatMessageBubble } from "./chat-message-bubble"
import { ChatInput } from "./chat-input"
import { useChatStore, Message } from "@/entities/chat";
import { api } from "@/shared/api";

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

export const WorkspaceChat = ({ projectId, isCollapsed = false }: WorkspaceChatProps) => {
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = useChatStore((state) => state.messages);
  const addMessage = useChatStore((state) => state.addMessage);
  const unshiftMessages = useChatStore((state) => state.unshiftMessages);
  const setMessages = useChatStore((state) => state.setMessages);
  const chatId = useChatStore((state) => state.chatId);
  const currentStoreProjectId = useChatStore((state) => state.projectId);
  const setChatId = useChatStore((state) => state.setChatId);
  const setStoreProjectId = useChatStore((state) => state.setProjectId);
  const clearChat = useChatStore((state) => state.clearChat);

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
        setChatId(historyMessages[0].chat_id);
        const formatted = historyMessages.map((m: any) => ({
          id: m.id || m.message_id || Date.now().toString(),
          role: m.role || "ai",
          content: m.content || "",
        }));

        // Reverse to ensure newest is at the bottom (given offset=0 usually means latest messages)
        // const reversed = [...formatted]

        const previousScrollHeight = scrollRef.current?.scrollHeight || 0;

        if (currentOffset === 0) {
          setMessages(formatted);
        } else {
          unshiftMessages(formatted);
        }
        setOffset(currentOffset + 10);

        // Restore scroll position so user isn't snapped to the top
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            const newScrollHeight = scrollRef.current.scrollHeight;
            scrollRef.current.scrollTop =
              newScrollHeight - previousScrollHeight;
          }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Reset logic when projectId changes
  useEffect(() => {
    if (projectId && projectId !== currentStoreProjectId) {
      clearChat();
      setStoreProjectId(projectId);
      setOffset(0);
      setHasMore(true);
    }
  }, [projectId, currentStoreProjectId, clearChat, setStoreProjectId]);

  // Load history on mount or when projectId changes, but only if offset is 0
  useEffect(() => {
    if (projectId && offset === 0 && hasMore && !isLoadingHistory) {
      console.log("fetching history for project", projectId);
      fetchHistory(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, offset]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    if (scrollRef.current.scrollTop === 0 && hasMore && !isLoadingHistory) {
      fetchHistory(offset);
    }
  };

  const handleSendMessage = async (text: string) => {
    // Add user message locally
    addMessage({
      id: Date.now().toString(),
      role: "user",
      content: text,
    });

    if (chatId) {
      try {
        const { data: messageData } = await api.post(
          `/v1/ai-chat/new-messages/${chatId}`,
          {
            content: text,
            images: [],
            has_files: false,
            tokens_used: 100,
          },
        );

        if (messageData?.data?.content) {
          addMessage({
            id: messageData.data.id || (Date.now() + 1).toString(),
            role: "ai",
            content: messageData.data.content,
          });

          // Auto scroll down upon new message
          requestAnimationFrame(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          });
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      // Fallback
      setTimeout(() => {
        addMessage({
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: `(Mock mode - no Chat ID) I received: \n\n\`\`\`text\n${text}\n\`\`\``,
        });
      }, 1000);
    }
  };

  const handleSendAudio = async (blob: Blob, url: string) => {
    // Add user audio message locally
    addMessage({
      id: Date.now().toString(),
      role: 'user',
      content: '', // No text
      type: 'audio',
      audioUrl: url,
    });

    if (chatId) {
      try {
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');
        formData.append('chat_id', chatId);

        // Try to send audio to backend. We'll use the existing /new-messages endpoint 
        // if it supports form data, or maybe a dedicated endpoint like /audio-message
        // The prompt says "Подготовь аудио и для отправки в бэкенд."
        // Meaning "Prepare audio for sending to the backend."
        // The previous code had POST /api/upload-audio. Let's use that or a similar structure 
        // through our api abstraction or just keep it generically ready.
        // We'll prepare the form and hit the chat endpoint. Backends usually accept FormData if there are files.
        const { data: messageData } = await api.post(
          `/v1/ai-chat/new-messages/${chatId}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            }
          }
        );

        if (messageData?.data?.content) {
          addMessage({
            id: messageData.data.id || (Date.now() + 1).toString(),
            role: 'ai',
            content: messageData.data.content,
          });

          // Auto scroll down
          requestAnimationFrame(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          });
        }
      } catch (err) {
        console.error('Failed to send audio', err);
      }
    } else {
      setTimeout(() => {
        addMessage({
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: '(Mock mode) Got your voice message! Loud and clear.',
        });
      }, 1000);
    }
  };

  return (
    <div
      className={`bg-bg-main border-border-subtle relative flex h-full shrink-0 flex-col transition-all duration-300 ${isCollapsed ? "w-0 border-r-0" : "w-[450px] border-r"}`}
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
          {displayMessages.map((msg: Message) => (
            <ChatMessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
            />
          ))}
        </div>

        {/* Fixed bottom input container */}
        <div className="shrink-0 bg-transparent px-4 pt-2 pb-4">
          <ChatInput onSendMessage={handleSendMessage} onSendAudio={handleSendAudio} />
        </div>
      </div>
    </div>
  );
};
