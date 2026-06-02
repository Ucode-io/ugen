'use client'

import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Input,
} from '@/shared/ui'

type FormState = {
  name: string
  company: string
  email: string
  phone: string
  services: string
  portfolio: string
  message: string
}

const EMPTY: FormState = {
  name: '',
  company: '',
  email: '',
  phone: '',
  services: '',
  portfolio: '',
  message: '',
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export const BecomeExpertModal = ({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setForm(EMPTY)
      setSubmitting(false)
    }
  }, [open])

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const canSubmit =
    form.name.trim().length > 0 && isValidEmail(form.email.trim()) && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/hire-expert-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Failed to submit application')
      }
      toast.success("Application sent! We'll get back to you soon.")
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = 'bg-bg-sidebar border-border-subtle h-10 text-[13px]'
  const labelClass = 'text-text-muted text-[12px] font-medium'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg gap-0 overflow-hidden rounded-2xl p-0">
        <div className="border-border-subtle flex items-center gap-3 border-b px-6 py-4">
          <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
            <Sparkles size={16} />
          </div>
          <div>
            <DialogTitle className="text-text-main text-[15px] leading-tight font-semibold">
              Become a u-gen Expert
            </DialogTitle>
            <DialogDescription className="text-text-muted mt-0.5 text-xs">
              Tell us about yourself — we&apos;ll reach out with next steps.
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className={labelClass}>
                Full name <span className="text-primary">*</span>
              </label>
              <Input
                placeholder="Jane Doe"
                value={form.name}
                onChange={set('name')}
                className={fieldClass}
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Company / Team</label>
              <Input
                placeholder="Acme Studio"
                value={form.company}
                onChange={set('company')}
                className={fieldClass}
                autoComplete="organization"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className={labelClass}>
                Email <span className="text-primary">*</span>
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                className={fieldClass}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Phone / Telegram</label>
              <Input
                placeholder="+998 90 123 45 67"
                value={form.phone}
                onChange={set('phone')}
                className={fieldClass}
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Services you offer</label>
            <Input
              placeholder="Backend, Mobile, UI/UX…"
              value={form.services}
              onChange={set('services')}
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Portfolio / Website</label>
            <Input
              placeholder="https://…"
              value={form.portfolio}
              onChange={set('portfolio')}
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Anything else?</label>
            <textarea
              placeholder="Tell us about your experience…"
              value={form.message}
              onChange={set('message')}
              rows={3}
              className="border-border-subtle bg-bg-sidebar text-text-main placeholder:text-text-muted focus:border-primary focus:ring-primary w-full resize-none rounded-lg border px-3 py-2 text-[13px] outline-none transition-all focus:ring-1"
            />
          </div>

          <div className="border-border-subtle -mx-6 -mb-6 mt-2 flex items-center justify-end gap-2 border-t px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-lg px-4 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-primary hover:bg-primary/90 h-9 rounded-lg px-5 text-[13px] font-medium text-white shadow-sm"
            >
              {submitting && <Loader2 size={14} className="mr-2 animate-spin" />}
              Send application
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
