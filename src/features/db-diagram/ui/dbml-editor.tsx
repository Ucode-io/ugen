"use client";

import React, { useCallback, useEffect, useRef } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { Code2, Lock, Pencil, RefreshCw } from "lucide-react";
import { useUIStore } from "@/shared/model/theme/use-ui-store";
import { cn } from "@/shared/lib/utils/cn";
import { useDiagramStore } from "../model/store";
import { DBML_LANGUAGE_ID, registerDbmlLanguage } from "../lib/dbml";

interface Props {
  parseErrorCount: number;
  onUserEdit: (value: string) => void;
  onRegenerate: () => void;
}

export const DbmlEditor: React.FC<Props> = ({
  parseErrorCount,
  onUserEdit,
  onRegenerate,
}) => {
  const { theme } = useUIStore();
  const dbml = useDiagramStore((s) => s.dbml);
  const isEditing = useDiagramStore((s) => s.isDbmlEditing);
  const setEditing = useDiagramStore((s) => s.setDbmlEditing);

  const monacoRef = useRef<Monaco | null>(null);

  const handleMount = useCallback<OnMount>((_editor, monaco) => {
    monacoRef.current = monaco;
    registerDbmlLanguage(monaco);
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined) return;
      onUserEdit(value);
    },
    [onUserEdit],
  );

  // When toggling edit mode off, regenerate from current diagram so the
  // editor stays in sync with the source-of-truth API data.
  useEffect(() => {
    if (!isEditing) onRegenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  return (
    <div className="bg-bg-card flex h-full min-h-0 flex-col">
      <div className="bg-bg-main/50 border-border-subtle flex h-9 shrink-0 items-center gap-2 border-b px-3">
        <Code2 size={13} className="text-primary" />
        <span className="text-text-main text-[12px] font-semibold">DBML</span>
        <span className="text-text-muted/70 text-[10.5px] font-mono">
          schema.dbml
        </span>

        {parseErrorCount > 0 && isEditing && (
          <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-rose-500 uppercase dark:text-rose-400">
            {parseErrorCount} issue{parseErrorCount > 1 ? "s" : ""}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onRegenerate}
            title="Regenerate from API schema"
            className="text-text-muted hover:text-text-main hover:bg-hover-bg flex items-center justify-center rounded p-1 transition-colors"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setEditing(!isEditing)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
              isEditing
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg",
            )}
          >
            {isEditing ? <Pencil size={11} /> : <Lock size={11} />}
            {isEditing ? "Editing" : "Read-only"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language={DBML_LANGUAGE_ID}
          value={dbml}
          theme={theme === "dark" ? "vs-dark" : "light"}
          onMount={handleMount}
          onChange={handleChange}
          options={{
            readOnly: !isEditing,
            minimap: { enabled: false },
            fontSize: 12.5,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            renderLineHighlight: isEditing ? "line" : "none",
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            cursorBlinking: isEditing ? "smooth" : "solid",
            cursorStyle: isEditing ? "line" : "block-outline",
            domReadOnly: !isEditing,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  );
};
