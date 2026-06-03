'use client'

import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/shared/lib/utils/cn'

import {
  createTemplateReaction,
  deleteTemplateReaction,
  type ReactionType,
} from '../model/templates'

interface TemplateReactionsProps {
  templateId: string
  initialReaction?: ReactionType | null
  initialLikeCount?: number
  initialDislikeCount?: number
  className?: string
}

// 1234 -> "1.2K", 2_000_000 -> "2M" (YouTube-style compact counts).
const formatCount = (n: number): string => {
  if (n < 1000) return String(n)
  if (n < 1_000_000) {
    const v = n / 1000
    return `${v % 1 === 0 ? v : v.toFixed(1)}K`
  }
  const v = n / 1_000_000
  return `${v % 1 === 0 ? v : v.toFixed(1)}M`
}

/**
 * YouTube-style segmented like / dislike pill. Updates optimistically and
 * reverts (with a toast) if the request fails. The backend replaces a user's
 * previous reaction on POST, so switching like↔dislike is a single call.
 */
export const TemplateReactions = ({
  templateId,
  initialReaction = null,
  initialLikeCount = 0,
  initialDislikeCount = 0,
  className,
}: TemplateReactionsProps) => {
  const [reaction, setReaction] = useState<ReactionType | null>(initialReaction)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount)

  // Re-sync if the template (or its server-side counts) changes underneath us.
  useEffect(() => {
    setReaction(initialReaction)
    setLikeCount(initialLikeCount)
    setDislikeCount(initialDislikeCount)
  }, [templateId, initialReaction, initialLikeCount, initialDislikeCount])

  const { mutate, isPending } = useMutation({
    mutationFn: (vars: { remove: boolean; type: ReactionType }) =>
      vars.remove
        ? deleteTemplateReaction(templateId)
        : createTemplateReaction(templateId, vars.type),
  })

  const react = (type: ReactionType) => {
    if (isPending) return
    const prev = { reaction, likeCount, dislikeCount }
    const removing = reaction === type

    // Optimistic update: toggle the clicked reaction, and if we're switching
    // away from the other one, take a point off it too.
    setReaction(removing ? null : type)
    setLikeCount(
      (c) => c + (type === 'like' ? (removing ? -1 : 1) : prev.reaction === 'like' ? -1 : 0),
    )
    setDislikeCount(
      (c) =>
        c + (type === 'dislike' ? (removing ? -1 : 1) : prev.reaction === 'dislike' ? -1 : 0),
    )

    mutate(
      { remove: removing, type },
      {
        onError: () => {
          setReaction(prev.reaction)
          setLikeCount(prev.likeCount)
          setDislikeCount(prev.dislikeCount)
          toast.error('Could not save your reaction. Please try again.')
        },
      },
    )
  }

  const liked = reaction === 'like'
  const disliked = reaction === 'dislike'

  return (
    <div
      className={cn(
        'border-border-subtle bg-bg-card inline-flex shrink-0 items-center rounded-full border',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => react('like')}
        disabled={isPending}
        aria-pressed={liked}
        aria-label="Like template"
        title="Like"
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-l-full pr-3 pl-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed',
          liked
            ? 'text-primary'
            : 'text-text-muted hover:text-text-main hover:bg-hover-bg',
        )}
      >
        <ThumbsUp size={16} fill={liked ? 'currentColor' : 'none'} />
        <span className="tabular-nums">{formatCount(likeCount)}</span>
      </button>

      <span className="bg-border-subtle h-5 w-px" aria-hidden="true" />

      <button
        type="button"
        onClick={() => react('dislike')}
        disabled={isPending}
        aria-pressed={disliked}
        aria-label="Dislike template"
        title="Dislike"
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-r-full pr-3.5 pl-3 text-sm font-medium transition-colors disabled:cursor-not-allowed',
          disliked
            ? 'text-primary'
            : 'text-text-muted hover:text-text-main hover:bg-hover-bg',
        )}
      >
        <ThumbsDown size={16} fill={disliked ? 'currentColor' : 'none'} />
        <span className="tabular-nums">{formatCount(dislikeCount)}</span>
      </button>
    </div>
  )
}
