'use client'
import { useState } from 'react'
import { ArrowUp, Plus } from 'lucide-react'
import { ModelSelector, DEFAULT_MODEL_ID } from '@/entities/ai-model'

export const LandingCtaSection = () => {
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID)

  const handleSubmit = () => {
    if (!prompt.trim()) return
    window.dispatchEvent(new CustomEvent('open-auth', { detail: 'login' }))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <section className="py-24 px-6 text-center border-t border-border-subtle"
      style={{ background: '#0d0d0d' }}>
      <h2 className="font-black tracking-[-0.04em] text-white mb-3"
        style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)' }}>
        Ready to build?
      </h2>
      <p className="text-[0.95rem] mb-9" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Describe your idea and u&#8209;gen will build it in 15 minutes — for free.
      </p>

      <div className="max-w-[620px] mx-auto rounded-2xl p-4 transition-all"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask u-gen to build your app…"
          className="w-full bg-transparent border-none outline-none text-[0.95rem] text-white pb-3.5"
          style={{ caretColor: '#3b82f6' }}
        />
        <div className="flex items-center gap-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: '10px' }}>
          <button
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer border-none bg-transparent"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            <Plus size={16} />
          </button>
          <ModelSelector
            value={selectedModel}
            onValueChange={setSelectedModel}
            triggerClassName="h-8"
          />
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!prompt.trim()}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-85 hover:scale-105"
            style={{ background: '#004eea' }}
          >
            <ArrowUp size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <p className="text-[0.74rem] mt-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
        No credit card required · Free forever on starter plan
      </p>
    </section>
  )
}
