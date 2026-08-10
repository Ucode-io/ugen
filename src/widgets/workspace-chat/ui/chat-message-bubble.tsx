'use client';

import React, { useEffect, useState, useMemo } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import CodeBlock from "./code-block"
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { useTypewriter } from "@/shared/hooks/useTypewriter";
import { formatAIContent } from "@/shared/lib/utils/formatAiContent";
import { Check, Copy, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslations } from 'next-intl'

// Hoisted to module scope: these never depend on props, but were previously
// recreated inline on every render. The parent re-renders on every SSE tick
// during streaming, so each bubble was rebuilding this ~16-component object
// every tick. Stable identity also avoids extra work inside ReactMarkdown.
const REMARK_PLUGINS = [remarkBreaks];

const MARKDOWN_COMPONENTS: Components = {
  // Paragraph
  p({ children }) {
    return <p className="mb-5 last:mb-0 text-[14px] leading-[1.75] text-text-main">{children}</p>
  },
  // Headings
  h1({ children }) {
    return <h1 className="mb-4 mt-7 text-[1.5rem] font-semibold leading-[1.35] text-text-main first:mt-0">{children}</h1>
  },
  h2({ children }) {
    return <h2 className="mb-3 mt-7 text-[1.25rem] font-semibold leading-[1.4] text-text-main first:mt-0">{children}</h2>
  },
  h3({ children }) {
    return <h3 className="mb-2 mt-6 text-[1.125rem] font-semibold leading-[1.45] text-text-main first:mt-0">{children}</h3>
  },
  // Bold — ChatGPT uses 600, not browser-default 700
  strong({ children }) {
    return <strong className="font-semibold text-text-main">{children}</strong>
  },
  // Lists
  ul({ children }) {
    return <ul className="mb-5 list-disc pl-6 space-y-2 text-[16px] leading-[1.75] text-text-main marker:text-text-muted">{children}</ul>
  },
  ol({ children }) {
    return <ol className="mb-5 list-decimal pl-6 space-y-2 text-[16px] leading-[1.75] text-text-main marker:text-text-muted">{children}</ol>
  },
  li({ children }) {
    return <li className="pl-1.5 leading-[1.75] [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mt-2 [&>ol]:mt-2">{children}</li>
  },
  // Horizontal rule
  hr() {
    return <hr className="my-7 border-0 border-t border-border-subtle" />
  },
  // Blockquote
  blockquote({ children }) {
    return (
      <blockquote className="mb-5 border-l-2 border-border-subtle pl-4 text-text-muted leading-[1.75] [&>p]:mb-0">
        {children}
      </blockquote>
    )
  },
  // Code rendering
  code(props) {
    const { children, className, node, ...rest } = props;
    const match = /language-(\w+)/.exec(className || "");

    if (match) {
      return (
        <CodeBlock
          language={match[1]}
          value={String(children).replace(/\n$/, "")}
        />
      );
    }

    return (
      <code
        {...rest}
        className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.875em] text-text-main whitespace-pre-wrap"
      >
        {children}
      </code>
    );
  },
  // Links styling
  a(props) {
    const { node, ...rest } = props;
    return (
      <a
        {...rest}
        className="text-text-main underline decoration-text-muted/50 underline-offset-[3px] transition-colors hover:decoration-text-main"
        target="_blank"
        rel="noopener noreferrer"
      />
    );
  },
  // Tables
  table({ children }) {
    return (
      <div className="my-5 w-full overflow-hidden rounded-lg border border-border-subtle">
        <table className="w-full border-collapse text-[14px] leading-[1.6]">
          {children}
        </table>
      </div>
    )
  },
  thead({ children }) {
    return <thead className="bg-muted/50 text-text-main">{children}</thead>
  },
  th({ children }) {
    return <th className="border-b border-border-subtle px-4 py-2.5 text-left font-semibold">{children}</th>
  },
  td({ children }) {
    return <td className="border-b border-border-subtle px-4 py-2.5 text-text-main">{children}</td>
  }
};

interface ChatMessageProps {
  role: 'user' | 'ai' | 'assistant'
  content: string
  type?: 'text' | 'audio'
  audioUrl?: string
  isFromResponse?: boolean
  onAutoScroll: () => void
  onResend?: () => void
  resendDisabled?: boolean
  reaction?: MessageFeedback
  onReaction?: (reaction: MessageFeedback) => void
  reactionDisabled?: boolean
  likeCount?: number
  dislikeCount?: number
}

type MessageFeedback = "like" | "dislike" | null;

export const ChatMessageBubble = ({
  role,
  content,
  type,
  audioUrl,
  isFromResponse,
  onAutoScroll,
  onResend,
  resendDisabled,
  reaction: controlledReaction,
  onReaction,
  reactionDisabled,
  likeCount = 0,
  dislikeCount = 0,
}: ChatMessageProps) => {
  const t = useTranslations('widgets.workspaceChat')
  const isAI = role === 'ai' || role === 'assistant';
  const replacedContent = content.replace(/\\n/g, '\n');
  const [copied, setCopied] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<MessageFeedback>(null);
  const [localLikeCount, setLocalLikeCount] = useState(likeCount);
  const [localDislikeCount, setLocalDislikeCount] = useState(dislikeCount);
  const feedback = controlledReaction === undefined ? localFeedback : controlledReaction;
  const displayedLikeCount = controlledReaction === undefined ? localLikeCount : likeCount;
  const displayedDislikeCount = controlledReaction === undefined ? localDislikeCount : dislikeCount;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFeedback = (next: Exclude<MessageFeedback, null>) => {
    if (onReaction) {
      onReaction(feedback === next ? null : next);
      return;
    }

    // Uncontrolled fallback. Compute the next state up front and apply it with
    // pure functional updaters — never nest setState calls inside another
    // updater. StrictMode double-invokes updaters in dev, so a nested setState
    // side effect would run twice and double-count the reaction.
    const current = localFeedback;
    const nextFeedback: MessageFeedback = current === next ? null : next;
    setLocalFeedback(nextFeedback);
    setLocalLikeCount((count) => {
      const base = current === "like" ? Math.max(0, count - 1) : count;
      return nextFeedback === "like" ? base + 1 : base;
    });
    setLocalDislikeCount((count) => {
      const base = current === "dislike" ? Math.max(0, count - 1) : count;
      return nextFeedback === "dislike" ? base + 1 : base;
    });
  };

  const messageActions = (
    <div
      className={`flex items-center gap-0.5 text-text-muted ${
        role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Copied" : "Copy message"}
        aria-label={copied ? "Copied" : "Copy message"}
        className="hover:bg-hover-bg hover:text-text-main flex h-7 w-7 items-center justify-center rounded-md transition-colors"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      {onResend && (
        <button
          type="button"
          onClick={onResend}
          disabled={resendDisabled}
          title={t('resendMessage')}
          aria-label={t('resendMessage')}
          className="hover:bg-hover-bg hover:text-text-main flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw size={14} />
        </button>
      )}
      {/* Reactions only apply to AI replies — user messages have no reaction
          endpoint, so rendering them there silently no-ops (no API call). */}
      {isAI && (
        <>
          <button
            type="button"
            onClick={() => toggleFeedback("like")}
            disabled={reactionDisabled}
            title={t('likeMessage')}
            aria-label={t('likeMessage')}
            aria-pressed={feedback === "like"}
            className={`hover:bg-hover-bg flex h-7 min-w-7 items-center justify-center gap-1 rounded-md px-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              feedback === "like" ? "bg-primary/10 text-primary" : "hover:text-text-main"
            }`}
          >
            <ThumbsUp size={14} fill={feedback === "like" ? "currentColor" : "none"} />
            {displayedLikeCount > 0 && <span className="text-[11px]">{displayedLikeCount}</span>}
          </button>
          <button
            type="button"
            onClick={() => toggleFeedback("dislike")}
            disabled={reactionDisabled}
            title={t('dislikeMessage')}
            aria-label={t('dislikeMessage')}
            aria-pressed={feedback === "dislike"}
            className={`hover:bg-hover-bg flex h-7 min-w-7 items-center justify-center gap-1 rounded-md px-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              feedback === "dislike" ? "bg-destructive/10 text-destructive" : "hover:text-text-main"
            }`}
          >
            <ThumbsDown
              size={14}
              fill={feedback === "dislike" ? "currentColor" : "none"}
            />
            {displayedDislikeCount > 0 && <span className="text-[11px]">{displayedDislikeCount}</span>}
          </button>
        </>
      )}
    </div>
  );

  const hasMarkdownCodeBlock = replacedContent.includes('```');

  // Disable realtime typing effect if there are code blocks to prevent layout jumping
  const typeSpeed = isAI && isFromResponse && !hasMarkdownCodeBlock ? 15 : 0;
  const typedContent = useTypewriter(replacedContent, typeSpeed);
  // formatAIContent runs regex/substring work; memoize so it only re-runs when
  // the (typed) content actually changes, not on every parent re-render.
  const formattedContent = useMemo(
    () => formatAIContent(typedContent),
    [typedContent],
  );

  useEffect(() => {
    if (isAI && isFromResponse) {
      onAutoScroll();
    }
  }, [typedContent, isAI, isFromResponse, onAutoScroll]);

  if (role === 'user') {
    return (
      <div className="flex w-full min-w-0 justify-end px-4 pt-3 pb-1">
        <div className="flex min-w-0 grow flex-col items-end gap-1">
          <div className="w-fit min-w-0 max-w-[80%] overflow-hidden rounded-[26px] bg-muted px-4 py-2.5 text-[14px] text-text-main flex flex-col gap-3">
            {type === 'audio' && audioUrl ? (
              <div className="rounded-xl bg-bg-card/60 p-2">
                <audio src={audioUrl} controls className="h-9 w-55" />
              </div>
            ) : null}
            {content && (
              <span className="leading-[1.65] whitespace-pre-wrap wrap-anywhere">
                {content}
              </span>
            )}
          </div>
          {messageActions}
        </div>
      </div>
    )
  }

  return (
    <div className="group flex w-full justify-start px-4 py-2">
      <div className="w-full max-w-full overflow-hidden">
        <div className="w-full max-w-full wrap-break-word text-[14px] leading-[1.65] text-text-main">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              // Paragraph
              p({ children }) {
                return <p className="mb-4 last:mb-0 wrap-break-word text-[14px] leading-[1.65] text-text-main">{children}</p>
              },
              // Headings
              h1({ children }) {
                return <h1 className="mb-4 mt-7 text-[1.25rem] font-semibold leading-[1.35] text-text-main first:mt-0">{children}</h1>
              },
              h2({ children }) {
                return <h2 className="mb-3 mt-7 text-[1.125rem] font-semibold leading-[1.4] text-text-main first:mt-0">{children}</h2>
              },
              h3({ children }) {
                return <h3 className="mb-2 mt-6 text-[1rem] font-semibold leading-[1.45] text-text-main first:mt-0">{children}</h3>
              },
              // Bold — ChatGPT uses 600, not browser-default 700
              strong({ children }) {
                return <strong className="font-semibold text-text-main">{children}</strong>
              },
              // Lists
              ul({ children }) {
                return <ul className="mb-4 list-disc pl-6 space-y-2 text-[14px] leading-[1.65] text-text-main marker:text-text-muted">{children}</ul>
              },
              ol({ children }) {
                return <ol className="mb-4 list-decimal pl-6 space-y-2 text-[14px] leading-[1.65] text-text-main marker:text-text-muted">{children}</ol>
              },
              li({ children }) {
                return <li className="pl-1.5 leading-[1.65] [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mt-2 [&>ol]:mt-2">{children}</li>
              },
              // Horizontal rule
              hr() {
                return <hr className="my-6 border-0 border-t border-border-subtle" />
              },
              // Blockquote
              blockquote({ children }) {
                return (
                  <blockquote className="mb-4 border-l-2 border-border-subtle pl-4 text-text-muted leading-[1.65] [&>p]:mb-0">
                    {children}
                  </blockquote>
                )
              },
              // Code rendering
              code(props) {
                const { children, className, node, ...rest } = props;
                const match = /language-(\w+)/.exec(className || "");

                if (match) {
                  return (
                    <CodeBlock
                      language={match[1]}
                      value={String(children).replace(/\n$/, "")}
                    />
                  );
                }

                return (
                  <code
                    {...rest}
                    className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.875em] text-text-main whitespace-pre-wrap wrap-anywhere"
                  >
                    {children}
                  </code>
                );
              },
              // Links styling
              a(props) {
                const { node, ...rest } = props;
                return (
                  <a
                    {...rest}
                    className="text-text-main underline decoration-text-muted/50 underline-offset-[3px] transition-colors hover:decoration-text-main"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                );
              },
              // Tables
              table({ children }) {
                return (
                  <div className="my-5 w-full overflow-x-auto rounded-lg border border-border-subtle">
                    <table className="w-full border-collapse text-[14px] leading-[1.6]">
                      {children}
                    </table>
                  </div>
                )
              },
              thead({ children }) {
                return <thead className="bg-muted/50 text-text-main">{children}</thead>
              },
              th({ children }) {
                return <th className="border-b border-border-subtle px-4 py-2.5 text-left font-semibold">{children}</th>
              },
              td({ children }) {
                return <td className="border-b border-border-subtle px-4 py-2.5 text-text-main">{children}</td>
              }
            }}
          >
            {formattedContent}
          </ReactMarkdown>
        </div>
        <div className="mt-1">{messageActions}</div>
      </div>
    </div>
  );
}
