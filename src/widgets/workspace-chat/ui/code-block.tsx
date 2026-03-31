'use client';

import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/shared/lib/utils/cn';
import { useTranslations } from 'next-intl';

interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock = ({ language, value }: CodeBlockProps) => {
  const t = useTranslations('workspaceChat');
  const [isCopied, setIsCopied] = useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!mounted) {
    return (
      <div className="relative my-4 flex h-32 w-full animate-pulse flex-col rounded-ai border border-border-subtle bg-bg-card">
        <div className="h-10 w-full border-b border-border-subtle bg-muted/40" />
        <div className="flex-1 p-4" />
      </div>
    );
  }

  return (
    <div className={cn(
      "ai-card relative my-6 w-full overflow-hidden border border-border-subtle bg-bg-card shadow-sm transition-all hover:shadow-md group",
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle bg-muted/40 px-4 py-2.5 select-none backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]/80 shadow-[0_0_8px_rgba(255,95,86,0.3)]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]/80 shadow-[0_0_8px_rgba(255,189,46,0.3)]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#27c93f]/80 shadow-[0_0_8px_rgba(39,201,63,0.3)]" />
          </div> */}
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            {language || 'code'}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-hover-bg hover:text-primary transition-all active:scale-95 cursor-pointer"
        >
          {isCopied ? (
            <>
              <Check size={14} className="text-primary" />
              <span className="text-primary">{t('codeBlock.copied')}</span>
            </>
          ) : (
            <>
              <Copy size={14} className="opacity-70" />
              <span>{t('codeBlock.copy')}</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="relative overflow-hidden">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1.5rem',
            fontSize: '13px',
            lineHeight: '1.6',
            background: resolvedTheme === 'dark' ? 'transparent' : '#1e1e1e',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'var(--font-mono), monospace',
            }
          }}
          wrapLines={true}
          wrapLongLines={true}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeBlock;