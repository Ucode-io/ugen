"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import { Layers2, Zap, Sparkles } from "lucide-react";
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
}

export const EditorDropdown = ({
  selectedValue,
  setSelectedValue,
  dropdownOptions,
  hasMicrofrontends,
  hasFunctions,
  isGitlabMode,
}: EditorDropdownProps) => {

  console.log({ selectedValue })
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border-subtle bg-bg-card shrink-0 z-10">
      <Select value={selectedValue} onValueChange={setSelectedValue}>
        <SelectTrigger className="h-7 w-[260px] text-xs border-border-subtle bg-bg-sidebar rounded-lg gap-1.5 px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="text-xs">
          <SelectItem value={FRONTEND_VALUE}>
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-primary" />
              Generated Frontend
            </span>
          </SelectItem>

          {hasMicrofrontends && (
            <SelectGroup>
              <SelectLabel className="text-[10px] uppercase tracking-wider text-text-muted px-2 pt-2">
                <span className="flex items-center gap-1">
                  <Layers2 size={10} /> Microfrontends
                </span>
              </SelectLabel>
              {dropdownOptions
                .filter((o) => o.group === 'microfrontend')
                .map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
            </SelectGroup>
          )}

          {hasFunctions && (
            <SelectGroup>
              <SelectLabel className="text-[10px] uppercase tracking-wider text-text-muted px-2 pt-2">
                <span className="flex items-center gap-1">
                  <Zap size={10} /> Functions
                </span>
              </SelectLabel>
              {dropdownOptions
                .filter((o) => o.group === 'function')
                .map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      <span className="text-[11px] text-text-muted">
        {isGitlabMode ? 'GitLab Repository' : 'AI Generated'}
      </span>
    </div>
  );
};
