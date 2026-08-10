"use client";

import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import { Column, useUpdateRecord } from "@/entities/database";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils/cn";
import { useTranslations } from 'next-intl'

interface RecordEditModalProps {
  open: boolean;
  tableName: string;
  schema: Column[];
  record: Record<string, any>;
  onClose: () => void;
  onSuccess?: () => void;
}

const FLOAT_TYPES = ["NUMBER", "FLOAT", "FLOAT_NOLIMIT", "FORMULA"];
const SERIAL_TYPES = ["INCREMENT_NUMBER"];
const BOOL_TYPES = ["CHECKBOX", "SWITCH"];
const ARRAY_TYPES = [
  "MULTISELECT",
  "LOOKUPS",
  "DYNAMIC",
  "LANGUAGE_TYPE",
  "MULTI_IMAGE",
  "MULTI_FILE",
  "MONEY",
  "ARRAY",
];

const transformValue = (val: any, col: Column): any => {
  if (val === "" || val === undefined || val === null) return null;
  const type = (col.type || "").toUpperCase();

  if (FLOAT_TYPES.includes(type) || SERIAL_TYPES.includes(type)) {
    const num = Number(val);
    if (isNaN(num)) return { error: `${col.label} must be a number` };
    return num;
  }
  if (BOOL_TYPES.includes(type)) {
    return val === true || val === "true" || val === "1";
  }
  if (ARRAY_TYPES.includes(type)) {
    return typeof val === "string"
      ? val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : val;
  }
  return val;
};

export const RecordEditModal = ({
  open,
  tableName,
  schema,
  record,
  onClose,
  onSuccess,
}: RecordEditModalProps) => {
  const t = useTranslations('widgets.databaseStudio')
  const [formData, setFormData] = useState<Record<string, any>>({});
  const updateRecordMutation = useUpdateRecord();

  useEffect(() => {
    if (open) {
      setFormData({ ...record });
    }
  }, [open, record]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleChange = (slug: string, value: any) => {
    setFormData((prev) => ({ ...prev, [slug]: value }));
  };

  const handleSubmit = async () => {
    const dataToSave: Record<string, any> = {};

    for (const col of schema) {
      const rawVal = formData[col.slug];

      if (col.isPrimaryKey && col.type === "uuid") {
        dataToSave[col.slug] = rawVal ?? record[col.slug];
        continue;
      }

      if (
        col.required &&
        (rawVal === undefined || rawVal === "" || rawVal === null)
      ) {
        toast.error(`${col.label} is required`);
        return;
      }

      const result = transformValue(rawVal, col);
      if (result && typeof result === "object" && "error" in result) {
        toast.error(result.error as string);
        return;
      }
      dataToSave[col.slug] = result;
    }

    if (!dataToSave.guid && record.guid) {
      dataToSave.guid = record.guid;
    }

    try {
      await updateRecordMutation.mutateAsync({
        tableName,
        data: dataToSave,
      });
      toast.success(t('recordUpdated'));
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(t('recordUpdateFailed'));
    }
  };

  const renderField = (col: Column) => {
    const value = formData[col.slug];
    const type = (col.type || "").toUpperCase();
    const isAutoUuid = col.isPrimaryKey && col.type === "uuid";

    if (isAutoUuid) {
      return (
        <input
          type="text"
          value={value ?? ""}
          readOnly
          className="bg-bg-main/40 border-border-subtle text-text-muted w-full cursor-not-allowed rounded-md border px-3 py-2 font-mono text-[12px]"
        />
      );
    }

    if (BOOL_TYPES.includes(type)) {
      const checked = value === true || value === "true" || value === "1";
      return (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => handleChange(col.slug, e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-text-muted text-[12px]">
            {checked ? "True" : "False"}
          </span>
        </label>
      );
    }

    if (FLOAT_TYPES.includes(type) || SERIAL_TYPES.includes(type)) {
      return (
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => handleChange(col.slug, e.target.value)}
          placeholder={`Enter ${col.type}…`}
          className="bg-bg-main border-border-subtle text-text-main focus:border-primary/50 w-full rounded-md border px-3 py-2 text-[13px] outline-none"
        />
      );
    }

    if (ARRAY_TYPES.includes(type)) {
      const displayVal = Array.isArray(value)
        ? value.join(", ")
        : (value ?? "");
      return (
        <input
          type="text"
          value={displayVal}
          onChange={(e) => handleChange(col.slug, e.target.value)}
          placeholder={t('commaSeparated')}
          className="bg-bg-main border-border-subtle text-text-main focus:border-primary/50 w-full rounded-md border px-3 py-2 text-[13px] outline-none"
        />
      );
    }

    const stringVal =
      typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : (value ?? "");

    return (
      <input
        type="text"
        value={stringVal}
        onChange={(e) => handleChange(col.slug, e.target.value)}
        placeholder={`Enter ${col.type || "value"}…`}
        className="bg-bg-main border-border-subtle text-text-main focus:border-primary/50 w-full rounded-md border px-3 py-2 text-[13px] outline-none"
      />
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        className="bg-bg-card border-border-subtle relative z-10 flex max-h-[85vh] w-[560px] flex-col rounded-xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-border-subtle flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-text-main text-[15px] leading-tight font-semibold">
              {t('editRecord')}
            </h3>
            <p className="text-text-muted mt-0.5 text-[12px]">
              {t('updateFieldsHint')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-main hover:bg-hover-bg rounded-md p-1.5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-4">
            {schema.map((col) => (
              <div key={col.slug} className="flex flex-col gap-1.5">
                <label className="text-text-main flex items-center gap-1 text-[12px] font-medium">
                  {col.label || col.slug}
                  {col.required && (
                    <span className="text-destructive">*</span>
                  )}
                  <span
                    className={cn(
                      "text-text-muted/60 bg-bg-sidebar border-border-subtle/50 ml-1 rounded border px-1 font-mono text-[9px] font-medium uppercase",
                    )}
                  >
                    {col.type}
                  </span>
                </label>
                {renderField(col)}
              </div>
            ))}
          </div>
        </div>

        <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg rounded-lg border px-4 py-2 text-[13px] font-medium transition-colors"
          >
            {t('cancelBtn')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={updateRecordMutation.isPending}
            className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={13} />
            {updateRecordMutation.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
};
