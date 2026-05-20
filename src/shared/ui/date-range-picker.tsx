'use client'

import * as React from 'react'
import { CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'

import { cn } from '@/shared/lib/utils/cn'
import { Button } from '@/shared/ui'
import { Calendar } from '@/shared/ui'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui'

import { useTranslations } from 'next-intl'

interface DatePickerWithRangeProps {
  className?: string
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
}: DatePickerWithRangeProps) {
  const t = useTranslations('shared.dateRangePicker')
  const hasValue = Boolean(date?.from)

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDate(undefined)
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'group w-[240px] justify-start text-left font-normal rounded-lg h-9 bg-bg-sidebar border-border-subtle hover:border-primary/50 transition-colors',
              !date && 'text-text-muted'
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0 text-text-muted" />
            <span className="text-[13px] truncate flex-1">
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(date.from, 'LLL dd, y')
                )
              ) : (
                <span>{t('placeholder')}</span>
              )}
            </span>
            {hasValue && (
              <span
                role="button"
                tabIndex={0}
                aria-label={t('clear')}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleClear(e as unknown as React.MouseEvent)
                }}
                className="ml-2 shrink-0 rounded-md p-0.5 text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-xl overflow-hidden" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
          {hasValue && (
            <div className="flex justify-end border-t border-border-subtle p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 gap-1.5 text-[13px] text-text-muted hover:text-text-main"
              >
                <X className="h-3.5 w-3.5" />
                {t('clear')}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
