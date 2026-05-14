"use client";

import React from "react";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui";
import { Layers2, Zap, Download, Loader2, Save, ChevronDown, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import type { CodeEditorTarget } from "@/entities/session";

export type DropdownOption = {
  value: string;
  label: string;
  group: 'frontend' | 'microfrontend' | 'function';
  target: CodeEditorTarget;
};

export const FRONTEND_VALUE = '__generated_frontend__';

interface EditorDropdownProps {
  selectedValue: string;
  setSelectedValue: (value: string) => void;
  dropdownOptions: DropdownOption[];
  hasMicrofrontends: boolean;
  hasFunctions: boolean;
  isGitlabMode: boolean;
  onImportZip: () => void;
  isImporting?: boolean;
  canImport?: boolean;
  onSave?: () => void;
  hasDirty?: boolean;
}

export const EditorDropdown = ({
  selectedValue,
  setSelectedValue,
  dropdownOptions,
  hasMicrofrontends,
  hasFunctions,
  isGitlabMode,
  onImportZip,
  isImporting = false,
  canImport = true,
  onSave,
  hasDirty = false,
}: EditorDropdownProps) => {
  const [open, setOpen] = React.useState(false);

  const microfrontendOptions = dropdownOptions.filter((o) => o.group === 'microfrontend');
  const functionOptions = dropdownOptions.filter((o) => o.group === 'function');
  const selectedOption = dropdownOptions.find((o) => o.value === selectedValue);

  const renderOption = (o: DropdownOption) => {
    const isActive = o.value === selectedValue;
    const isFn = o.group === 'function';
    return (
      <button
        key={o.value}
        type="button"
        onClick={() => {
          setSelectedValue(o.value);
          setOpen(false);
        }}
        className={cn(
          "flex w-full items-center justify-between gap-1.5 rounded-md px-2 py-1 text-left text-[11px] transition-colors",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-text-muted hover:bg-hover-bg hover:text-text-main",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {isFn ? (
            <Zap size={11} className="shrink-0 text-amber-500" />
          ) : (
            <Layers2 size={11} className="shrink-0 text-blue-500" />
          )}
          <span className="truncate">{o.label}</span>
        </span>
        {isActive && <Check size={10} className="shrink-0" />}
      </button>
    );
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border-subtle bg-bg-card shrink-0 z-10">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="border-border-subtle bg-bg-sidebar text-text-main hover:border-primary/40 hover:bg-primary/5 flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors"
          >
            {selectedOption?.group === 'function' ? (
              <Zap size={12} className="shrink-0 text-amber-500" />
            ) : (
              <Layers2 size={12} className="shrink-0 text-blue-500" />
            )}
            <span className="max-w-[160px] truncate text-left">
              {selectedOption?.label ?? 'Select...'}
            </span>
            <ChevronDown
              size={11}
              className={cn(
                "shrink-0 text-text-muted transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-44 p-1">
          {hasMicrofrontends && (
            <>
              <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-text-muted">
                <span className="flex items-center gap-1">
                  <Layers2 size={10} /> Microfrontends
                </span>
              </div>
              {microfrontendOptions.map(renderOption)}
            </>
          )}

          {hasFunctions && (
            <>
              <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-text-muted">
                <span className="flex items-center gap-1">
                  <Zap size={10} /> Functions
                </span>
              </div>
              {functionOptions.map(renderOption)}
            </>
          )}
        </PopoverContent>
      </Popover>
      <span className="text-[11px] text-text-muted">
        {isGitlabMode ? 'GitLab Repository' : 'AI Generated'}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {onSave && hasDirty && (
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            className="h-7 text-xs gap-1.5 px-2.5"
          >
            <Save size={12} />
            Save changes
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onImportZip}
          disabled={isImporting || !canImport}
          className="h-7 text-xs gap-1.5 px-2.5"
        >
          {isImporting ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Download size={12} />
          )}
          Export ZIP
        </Button>
      </div>
    </div>
  );
};
