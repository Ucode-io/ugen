'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/ui/select';
import { MODELS } from '../model/types';
import { cn } from '@/shared/lib/utils/cn';

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ModelSelector = ({
  value,
  onValueChange,
  className,
  triggerClassName,
  size = 'md'
}: ModelSelectorProps) => {
  const sizeClasses = {
    sm: "h-8 px-2 text-xs gap-1.5",
    md: "h-9 px-2.5 text-sm gap-2",
    lg: "h-10 px-3 text-base gap-2.5",
  }[size];

  const selectItemClasses = {
    sm: "h-6 px-2 text-xs gap-1.5",
    md: "h-8 px-2 text-sm gap-2",
    lg: "h-10 px-3 text-base gap-2.5",
  }[size];

  const iconSize = {
    sm: 14,
    md: 16,
    lg: 18,
  }[size];

  return (
    <div className={cn("flex items-center", className)}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className={cn(
            "border-none bg-transparent hover:bg-hover-bg text-text-muted hover:text-text-main transition-colors shadow-none focus:ring-0 w-auto rounded-full",
            sizeClasses,
            triggerClassName
          )}
        >
          <Sparkles size={iconSize} className="text-primary/60" />
          <SelectValue placeholder="Model" />
        </SelectTrigger>
        <SelectContent>
          {MODELS.map((model) => (
            <SelectItem className={selectItemClasses} key={model.id} value={model.id}>
              {model.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
