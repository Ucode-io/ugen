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
        weekdays: 'flex mb-1',
        weekday:
          'text-text-muted w-9 h-8 flex items-center justify-center font-normal text-[0.7rem] uppercase',
        week: 'flex w-full mt-0.5',
        // `day` is the <td> cell — it carries the continuous range strip so
        // selected days connect edge-to-edge with no gaps between them.
        day: 'relative h-9 w-9 p-0 text-[13px]',
        // `day_button` is the actual <button> — make it fill the whole cell so
        // the entire square is clickable, not just the number.
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-hover-bg focus-visible:ring-1 focus-visible:ring-primary'
        ),
        // Solid pill on every selected day (also covers a single picked day).
        selected:
          '[&>button]:bg-primary [&>button]:text-white [&>button]:hover:bg-primary',
        range_start: 'bg-primary/10 rounded-l-lg',
        range_end: 'bg-primary/10 rounded-r-lg',
        // In-between days: light continuous strip, transparent button on top.
        range_middle:
          'bg-primary/10 rounded-none [&>button]:!bg-transparent [&>button]:!text-primary [&>button]:hover:!bg-primary/15',
        today: '[&>button]:font-bold [&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-primary/30',
        outside: '[&>button]:text-text-muted [&>button]:opacity-40',
        disabled:
          '[&>button]:text-text-muted [&>button]:opacity-40 [&>button]:cursor-not-allowed [&>button]:pointer-events-none',
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
