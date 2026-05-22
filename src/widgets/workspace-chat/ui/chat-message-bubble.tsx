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
        <div className="max-w-[80%] rounded-[26px] bg-muted px-5 py-2.5 text-[16px] text-text-main flex flex-col gap-3">
          {type === 'audio' && audioUrl ? (
            <div className="rounded-xl bg-bg-card/60 p-2">
              <audio src={audioUrl} controls className="h-9 w-[220px]" />
            </div>
          ) : null}
          {content && (
            <span className="leading-[1.75] whitespace-pre-wrap break-words">
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
        <div className="w-full max-w-full text-[14px] leading-[1.75] text-text-main">
          <ReactMarkdown
            remarkPlugins={[remarkBreaks]}
            components={{
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
            }}
          >
            {formatAIContent(typedContent)}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
