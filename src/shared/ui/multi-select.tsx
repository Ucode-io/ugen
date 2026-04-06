"use client"
import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';
import { cn } from '@/shared/lib/utils/cn';

export interface Option {
  label: string;
  value: string;
}

export interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  searchPlaceholder?: string;
  maxSelections?: number;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onChange,
  placeholder = 'Add item...',
  className,
  searchPlaceholder = 'Search...',
  maxSelections,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOptions = useMemo(
    () =>
      selected
        .map((val) => options.find((opt) => opt.value === val))
        .filter(Boolean) as Option[],
    [selected, options]
  );

  const filteredOptions = useMemo(
    () =>
      options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [options, searchQuery]
  );

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== value));
  };

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      if (maxSelections && selected.length >= maxSelections) return;
      onChange([...selected, value]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            'flex flex-wrap gap-1.5 p-2 bg-bg-sidebar border border-border-subtle rounded-lg min-h-[38px] cursor-pointer transition-colors hover:border-primary/50 focus-within:border-primary',
            className
          )}
        >
          {selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="bg-bg-main px-2 py-0.5 rounded text-[12px] flex items-center gap-1 border border-border-subtle"
            >
              {opt.label}
              <button
                type="button"
                className="text-text-muted hover:text-destructive shrink-0 ml-0.5 flex items-center justify-center outline-none"
                onClick={(e) => handleRemove(opt.value, e)}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {(!maxSelections || selected.length < maxSelections) && (
            <input
              className="flex-1 min-w-[80px] bg-transparent text-[12px] outline-none text-text-main placeholder:text-text-muted"
              placeholder={selected.length === 0 ? placeholder : ''}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={() => setOpen(true)}
            />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex flex-col">
          <div className="max-h-[250px] overflow-y-auto p-1 py-1.5">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-3 text-center text-[12px] text-text-muted">
                No items found.
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[13px] rounded-md transition-colors",
                      isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-bg-sidebar text-text-main"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <X size={12} className="shrink-0 opacity-70 hover:opacity-100" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
