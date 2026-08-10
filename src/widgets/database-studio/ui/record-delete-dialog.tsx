"use client";

import { useEffect } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from 'next-intl'

interface RecordDeleteDialogProps {
  recordLabel: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RecordDeleteDialog = ({
  recordLabel,
  isLoading,
  onConfirm,
  onCancel,
}: RecordDeleteDialogProps) => {
  const t = useTranslations('widgets.databaseStudio')
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        className="bg-bg-card border-border-subtle relative z-10 flex w-[400px] flex-col gap-5 rounded-xl border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className="bg-destructive/10 border-destructive/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
            <Trash2 size={18} className="text-destructive" />
          </div>
          <div className="pt-0.5">
            <h3 className="text-text-main text-[15px] leading-tight font-semibold">
              {t('deleteRecord')}
            </h3>
            <p className="text-text-muted mt-1.5 text-[13px] leading-relaxed">
              Are you sure you want to delete{" "}
              <code className="text-text-main bg-bg-main border-border-subtle rounded border px-1.5 py-0.5 font-mono text-[12px] font-semibold">
                {recordLabel}
              </code>
              ? This action is <strong>permanent</strong> and cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg rounded-lg border px-4 py-2 text-[13px] font-medium transition-colors"
          >
            {t('cancelBtn')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90 flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 size={13} />
            {isLoading ? "Deleting…" : "Delete record"}
          </button>
        </div>
      </div>
    </div>
  );
};
