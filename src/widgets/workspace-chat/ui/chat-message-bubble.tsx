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

  const typedContent = useTypewriter(replacedContent, isAI && isFromResponse ? 15 : 0);

  useEffect(() => {
    if (isAI && isFromResponse) {
      onAutoScroll();
    }
  }, [typedContent, isAI, isFromResponse, onAutoScroll]);

  if (role === 'user') {
    return (
      <div className="flex w-full justify-end px-4 py-3">
        <div className="max-w-[85%] rounded-[20px] rounded-tr-[4px] overflow-hidden bg-bg-card border border-border-subtle px-5 py-3.5 text-[15px] text-text-main shadow-sm flex flex-col gap-3 transition-all hover:shadow-md">
          {type === 'audio' && audioUrl ? (
            <div className="rounded-xl bg-hover-bg/50 p-2">
              <audio src={audioUrl} controls className="h-9 w-[220px]" />
            </div>
          ) : null}
          {content && <span className="leading-relaxed whitespace-pre-wrap">{content}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="group flex w-full justify-start px-4 py-6">
      <div className="w-full max-w-full overflow-hidden">
        <div className="w-full max-w-full transition-all duration-300">
          <ReactMarkdown
            remarkPlugins={[remarkBreaks]}
            components={{
              // Custom Paragraph
              p({ children }) {
                return <p className="mb-4 last:mb-0 leading-7 text-[15px] text-text-main/90">{children}</p>
              },
              // Headings
              h1({ children }) {
                return <h1 className="mb-6 mt-8 text-3xl font-bold tracking-tight text-text-main first:mt-0">{children}</h1>
              },
              h2({ children }) {
                return <h2 className="mb-4 mt-6 text-2xl font-semibold tracking-tight text-text-main first:mt-0 border-b border-border-subtle pb-2">{children}</h2>
              },
              h3({ children }) {
                return <h3 className="mb-3 mt-5 text-xl font-semibold tracking-tight text-text-main first:mt-0">{children}</h3>
              },
              // Lists
              ul({ children }) {
                return <ul className="mb-4 ml-6 list-disc space-y-2 text-text-main/90 marker:text-primary/70">{children}</ul>
              },
              ol({ children }) {
                return <ol className="mb-4 ml-6 list-decimal space-y-2 text-text-main/90 marker:text-primary/70 marker:font-bold">{children}</ol>
              },
              li({ children }) {
                return <li className="pl-1 italic-none">{children}</li>
              },
              // Blockquote
              blockquote({ children }) {
                return (
                  <blockquote className="mb-4 border-l-3 border-primary/40 bg-primary/5 px-5 py-3 rounded-r-lg text-text-muted italic">
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
                    className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[13px] font-medium text-primary border border-border-subtle/50 whitespace-pre-wrap"
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
                    className="font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-all hover:text-primary-hover hover:decoration-primary"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                );
              },
              // Tables
              table({ children }) {
                return (
                  <div className="my-6 w-full overflow-hidden rounded-ai border border-border-subtle">
                    <table className="w-full border-collapse bg-bg-card text-sm">
                      {children}
                    </table>
                  </div>
                )
              },
              thead({ children }) {
                return <thead className="bg-muted/50 text-text-main">{children}</thead>
              },
              th({ children }) {
                return <th className="border-b border-border-subtle px-4 py-3 text-left font-semibold">{children}</th>
              },
              td({ children }) {
                return <td className="border-b border-border-subtle px-4 py-3 text-text-muted">{children}</td>
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
