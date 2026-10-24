'use client'

import React, { useState } from 'react'
import { useTranslation } from '@/features/i18n'
import { VoiceMicButton } from '@/features/voice'
import { ArrowUp } from 'lucide-react'

interface PatientComposerBarProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
}

export const PatientComposerBar: React.FC<PatientComposerBarProps> = ({
  onSendMessage,
  disabled = false,
}) => {
  const { t, locale } = useTranslation()
  const [text, setText] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || disabled) return
    onSendMessage(text.trim())
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="bg-slate-50 border border-slate-300 rounded-2xl p-1.5 sm:p-2 flex items-center gap-2 shadow-xs focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={t.patient.inputPlaceholder}
            aria-label={t.patient.inputPlaceholder}
            className="flex-1 bg-transparent border-0 text-base sm:text-lg px-3 focus:outline-none focus:ring-0 text-slate-900 placeholder:text-slate-400 font-sans"
          />

          <VoiceMicButton
            lang={locale === 'el' ? 'el-GR' : 'bg-BG'}
            onTranscript={(spokenText) => {
              setText((prev) => (prev ? `${prev} ${spokenText}` : spokenText))
            }}
            variant="compact"
            disabled={disabled}
          />

          <button
            type="submit"
            disabled={!text.trim() || disabled}
            aria-label={t.patient.send}
            title={t.patient.send}
            className="bg-[#006194] hover:bg-[#004e76] disabled:opacity-40 text-white w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
