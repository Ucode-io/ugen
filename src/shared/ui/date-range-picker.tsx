'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
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
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[240px] justify-start text-left font-normal rounded-lg h-9 bg-bg-sidebar border-border-subtle hover:border-primary/50 transition-colors',
              !date && 'text-text-muted'
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-text-muted" />
            <span className="text-[13px] truncate">
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
        </PopoverContent>
      </Popover>
    </div>
  )
}
