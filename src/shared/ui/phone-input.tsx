'use client'

import React from 'react'
import PhoneInput, { Props } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { cn } from '@/shared/lib/utils/cn'

interface PhoneInputProps extends Omit<Props<any>, 'onChange'> {
  value: string
  onChange: (value: string) => void
  className?: string
  error?: boolean
}

export const PhoneInputReusable = ({
  value,
  onChange,
  className,
  error,
  ...props
}: PhoneInputProps) => {
  return (
    <div className={cn(
      "flex items-center w-full rounded-lg border border-border-subtle bg-bg-sidebar px-3 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary",
      error && "border-destructive focus-within:border-destructive focus-within:ring-destructive",
      className
    )}>
      <PhoneInput
        {...props}
        value={value}
        onChange={(val) => onChange(val || '')}
        className="flex-1 h-9 text-sm outline-none bg-transparent"
      />

      <style jsx global>{`
        .flex-1.h-9.text-sm.outline-none.bg-transparent input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          padding-left: 0.5rem;
          color: var(--text-main);
          font-size: 0.875rem;
          height: 100%;
        }
        .PhoneInputCountry {
          margin-right: 0.5rem;
          display: flex;
          align-items: center;
        }
        .PhoneInputCountrySelectArrow {
          color: var(--text-muted);
          opacity: 0.5;
          margin-left: 4px;
        }
      `}</style>
    </div>
  )
}
