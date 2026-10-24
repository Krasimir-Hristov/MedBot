'use client'

import React, { useState } from 'react'
import { useTranslation } from '@/features/i18n'
import { VoiceMicButton } from '@/features/voice'
import { ArrowUp } from 'lucide-react'

interface ChatInputBarProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
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
    <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
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
          placeholder={t.doctor.chat.placeholder}
          aria-label={t.doctor.chat.placeholder}
          className="flex-1 bg-transparent border-0 text-xs sm:text-sm px-2.5 focus:outline-none focus:ring-0 text-slate-900 placeholder:text-slate-400 font-sans"
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
          aria-label={t.doctor.chat.send}
          title={t.doctor.chat.send}
          className="bg-sky-700 hover:bg-sky-800 disabled:opacity-40 text-white w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed shrink-0"
        >
          <ArrowUp className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>
      </form>
    </div>
  )
}
