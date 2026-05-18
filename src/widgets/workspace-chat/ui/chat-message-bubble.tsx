'use client';

import React, { useEffect } from "react"
import ReactMarkdown from "react-markdown"
import CodeBlock from "./code-block"
import remarkBreaks from "remark-breaks";
import { useTypewriter } from "@/shared/hooks/useTypewriter";
import { formatAIContent } from "@/shared/lib/utils/formatAiContent";

interface ChatMessageProps {
  role: 'user' | 'ai' | 'assistant'
  content: string
  type?: 'text' | 'audio'
  audioUrl?: string
  isFromResponse?: boolean
  onAutoScroll: () => void
}

export const ChatMessageBubble = ({ role, content, type, audioUrl, isFromResponse, onAutoScroll }: ChatMessageProps) => {
  const isAI = role === 'ai' || role === 'assistant';
  const replacedContent = content.replace(/\\n/g, '\n');
  const hasMarkdownCodeBlock = replacedContent.includes('```');

  // Disable realtime typing effect if there are code blocks to prevent layout jumping
  const typeSpeed = isAI && isFromResponse && !hasMarkdownCodeBlock ? 15 : 0;
  const typedContent = useTypewriter(replacedContent, typeSpeed);

  useEffect(() => {
    if (isAI && isFromResponse) {
      onAutoScroll();
    }
  }, [typedContent, isAI, isFromResponse, onAutoScroll]);

  if (role === 'user') {
    return (
      <div className="flex w-full justify-end px-4 pt-3 pb-1">
        <div className="max-w-[85%] rounded-[22px] bg-primary/8 px-4 py-2.5 text-[15px] text-text-main flex flex-col gap-3 transition-colors">
          {type === 'audio' && audioUrl ? (
            <div className="rounded-xl bg-bg-card/60 p-2">
              <audio src={audioUrl} controls className="h-9 w-[220px]" />
            </div>
          ) : null}
          {content && (
            <span className="leading-[1.55] tracking-[-0.003em] whitespace-pre-wrap break-words">
              {content}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="group flex w-full justify-start px-4 py-2">
      <div className="w-full max-w-full overflow-hidden">
        <div className="w-full max-w-full transition-all duration-300 text-[15px] leading-[1.7] tracking-[-0.003em] text-text-main">
          <ReactMarkdown
            remarkPlugins={[remarkBreaks]}
            components={{
              // Custom Paragraph
              p({ children }) {
                return <p className="mb-4 last:mb-0 leading-[1.7] tracking-[-0.003em] text-[15px] text-text-main">{children}</p>
              },
              // Headings
              h1({ children }) {
                return <h1 className="mb-4 mt-7 text-[26px] font-semibold leading-[1.25] tracking-[-0.02em] text-text-main first:mt-0">{children}</h1>
              },
              h2({ children }) {
                return <h2 className="mb-3 mt-6 text-[20px] font-semibold leading-[1.3] tracking-[-0.015em] text-text-main first:mt-0">{children}</h2>
              },
              h3({ children }) {
                return <h3 className="mb-2 mt-5 text-[17px] font-semibold leading-[1.35] tracking-[-0.01em] text-text-main first:mt-0">{children}</h3>
              },
              // Lists
              ul({ children }) {
                return <ul className="mb-4 ml-5 list-disc space-y-1.5 text-[15px] leading-[1.7] text-text-main marker:text-text-muted">{children}</ul>
              },
              ol({ children }) {
                return <ol className="mb-4 ml-5 list-decimal space-y-1.5 text-[15px] leading-[1.7] text-text-main marker:text-text-muted marker:font-medium">{children}</ol>
              },
              li({ children }) {
                return <li className="pl-1 leading-[1.7] [&>p]:mb-2 [&>p:last-child]:mb-0">{children}</li>
              },
              // Blockquote
              blockquote({ children }) {
                return (
                  <blockquote className="mb-4 border-l-[3px] border-primary/40 bg-primary/[0.04] px-4 py-2.5 rounded-r-lg text-text-muted leading-[1.7] [&>p]:mb-0">
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
                    className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] font-medium text-primary border border-border-subtle/50 whitespace-pre-wrap"
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
                    className="font-medium text-primary underline decoration-primary/30 underline-offset-[3px] transition-all hover:text-primary-hover hover:decoration-primary"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                );
              },
              // Tables
              table({ children }) {
                return (
                  <div className="my-5 w-full overflow-hidden rounded-ai border border-border-subtle">
                    <table className="w-full border-collapse bg-bg-card text-[14px] leading-[1.55]">
                      {children}
                    </table>
                  </div>
                )
              },
              thead({ children }) {
                return <thead className="bg-muted/50 text-text-main">{children}</thead>
              },
              th({ children }) {
                return <th className="border-b border-border-subtle px-4 py-2.5 text-left font-semibold tracking-[-0.005em]">{children}</th>
              },
              td({ children }) {
                return <td className="border-b border-border-subtle px-4 py-2.5 text-text-muted">{children}</td>
              }
            }}
          >
            {formatAIContent(typedContent)}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
