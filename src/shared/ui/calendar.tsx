'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/shared/lib/utils/cn'
import { buttonVariants } from '@/shared/ui'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-2', className)}
      classNames={{
        months: 'flex flex-wrap gap-x-8 gap-y-4',
        month: 'space-y-4',
        month_caption: 'flex justify-center pt-1 relative items-center h-9 mb-1',
        caption_label: 'text-sm font-semibold',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1 top-1'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1 top-1'
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'grid grid-cols-7 mb-1',
        weekday:
          'text-text-muted rounded-md w-8 h-8 flex items-center justify-center font-normal text-[0.7rem] uppercase',
        week: 'grid grid-cols-7 mt-0',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-8 w-8 p-0 font-normal aria-selected:opacity-100 transition-none rounded-lg text-[13px] flex items-center justify-center border border-transparent'
        ),
        range_end: 'day-range-end',
        selected:
          'bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white',
        today: 'bg-hover-bg text-text-main font-bold ring-1 ring-inset ring-primary/20',
        outside:
          'day-outside text-text-muted opacity-20 aria-selected:bg-hover-bg/30 aria-selected:text-text-muted aria-selected:opacity-30',
        disabled: 'text-text-muted opacity-50',
        range_middle:
          'aria-selected:bg-primary/10 aria-selected:text-primary',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight
          return <Icon className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
