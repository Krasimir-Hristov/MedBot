'use client'

import React from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import type { VoiceLang } from '../types'
import { useVoiceDictation } from '../hooks/use-voice-dictation'

interface VoiceMicButtonProps {
  lang: VoiceLang
  onTranscript: (text: string) => void
  onError?: (err: string) => void
  variant?: 'hero' | 'compact'
  labelIdle?: string
  labelListening?: string
  labelTranscribing?: string
  className?: string
  disabled?: boolean
}

export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({
  lang,
  onTranscript,
  onError,
  variant = 'hero',
  labelIdle = '🎙️ Натисни и говори',
  labelListening = 'Слушам ви... Натиснете за край',
  labelTranscribing = 'Разпознаване на гласа...',
  className = '',
  disabled = false,
}) => {
  const { isListening, isTranscribing, toggleListening } = useVoiceDictation({
    lang,
    onTranscript,
    onError,
  })

  if (variant === 'compact') {
    return (
      <button
        type="button"
        disabled={disabled || isTranscribing}
        onClick={toggleListening}
        aria-label={isListening ? 'Спри гласовото въвеждане' : 'Започни гласово въвеждане'}
        aria-pressed={isListening}
        className={`relative inline-flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
          isListening
            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse ring-2 ring-rose-400'
            : isTranscribing
              ? 'bg-amber-500/20 text-amber-300 cursor-wait'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600'
        } ${className}`}
      >
        {isTranscribing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isListening ? (
          <Square className="w-5 h-5 fill-current" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
    )
  }

  // Hero вариант за пациентския портал
  return (
    <button
      type="button"
      disabled={disabled || isTranscribing}
      onClick={toggleListening}
      aria-label={isListening ? labelListening : isTranscribing ? labelTranscribing : labelIdle}
      aria-pressed={isListening}
      className={`w-full py-3.5 px-5 rounded-2xl font-semibold text-base sm:text-lg flex items-center justify-center gap-3 transition-all duration-200 shadow-md active:scale-[0.99] select-none ${
        isListening
          ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-500/20 animate-pulse'
          : isTranscribing
            ? 'bg-amber-600 text-white cursor-wait opacity-90'
            : 'bg-linear-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white shadow-sky-600/20'
      } ${className}`}
    >
      {isTranscribing ? (
        <>
          <Loader2 className="w-6 h-6 animate-spin shrink-0" />
          <span>{labelTranscribing}</span>
        </>
      ) : isListening ? (
        <>
          <Square className="w-6 h-6 fill-current shrink-0" />
          <span>{labelListening}</span>
        </>
      ) : (
        <>
          <Mic className="w-6 h-6 shrink-0" />
          <span>{labelIdle}</span>
        </>
      )}
    </button>
  )
}
