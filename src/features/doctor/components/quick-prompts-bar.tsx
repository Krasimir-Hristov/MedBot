'use client'

import React from 'react'
import { useTranslation } from '@/features/i18n'
import { History, Plus, Sparkles } from 'lucide-react'
import { DoctorQuickDropdown } from './doctor-quick-dropdown'

interface QuickPromptsBarProps {
  onSelectPrompt: (prompt: string) => void
  onToggleSessions: () => void
  onNewSession: () => void
  onOpenSummary?: () => void
  disabled?: boolean
}

export const QuickPromptsBar: React.FC<QuickPromptsBarProps> = ({
  onSelectPrompt,
  onToggleSessions,
  onNewSession,
  onOpenSummary,
  disabled = false,
}) => {
  const { t, locale } = useTranslation()

  return (
    <nav
      aria-label="Управление на сесии и бързи клинични действия"
      className="px-3 sm:px-4 py-2 bg-white border-b border-slate-200/90 flex items-center justify-between gap-2 shrink-0 select-none"
    >
      {/* Сесии (история и нова) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onToggleSessions}
          aria-label={t.doctor.chat.sessionsHistory}
          title={t.doctor.chat.sessionsHistory}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors cursor-pointer"
        >
          <History className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden sm:inline">{t.doctor.chat.sessionsHistory}</span>
        </button>

        <button
          type="button"
          onClick={onNewSession}
          aria-label={t.doctor.chat.newSession}
          title={t.doctor.chat.newSession}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-semibold text-sky-700 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-sky-600" />
          <span className="hidden sm:inline">{t.doctor.chat.newSession}</span>
        </button>
      </div>

      {/* Дясно: Видим бутон за Обобщение + Dropdown за бързи въпроси */}
      <div className="flex items-center gap-2 shrink-0">
        {onOpenSummary && (
          <button
            type="button"
            onClick={onOpenSummary}
            aria-label={t.doctor.openSummary}
            title={t.doctor.summary.title}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-linear-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>{locale === 'el' ? 'Σύνοψη Φακέλου' : 'Обобщение на досието'}</span>
          </button>
        )}

        <DoctorQuickDropdown onSelectPrompt={onSelectPrompt} disabled={disabled} />
      </div>
    </nav>
  )
}
