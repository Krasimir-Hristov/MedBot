'use client'

import React from 'react'
import { useTranslation } from '@/features/i18n'
import { Clock, Microscope, Scan, Activity, History, Plus } from 'lucide-react'

interface QuickPromptsBarProps {
  onSelectPrompt: (prompt: string) => void
  onToggleSessions: () => void
  onNewSession: () => void
  disabled?: boolean
}

export const QuickPromptsBar: React.FC<QuickPromptsBarProps> = ({
  onSelectPrompt,
  onToggleSessions,
  onNewSession,
  disabled = false,
}) => {
  const { t } = useTranslation()

  const prompts = [
    {
      label: t.doctor.quickPrompts.timeline,
      icon: Clock,
      promptText: 'Δώσε μου το πλήρες ογκολογικό χρονολόγιο της ασθενούς με όλες τις σημαντικές ημερομηνίες, επεμβάσεις, θεραπείες και απεικονίσεις.',
    },
    {
      label: t.doctor.quickPrompts.histology,
      icon: Microscope,
      promptText: 'Ποια είναι τα αναλυτικά ιστολογικά ευρήματα, ο ιστολογικός τύπος, το grade και η έκφραση των υποδοχέων (ER, PR, HER2, Ki-67);',
    },
    {
      label: t.doctor.quickPrompts.imaging,
      icon: Scan,
      promptText: 'Ποια είναι τα αποτελέσματα των απεικονιστικών εξετάσεων (CT, MRI, PET) και πώς συγκρίνονται οι βλάβες διαχρονικά;',
    },
    {
      label: t.doctor.quickPrompts.markers,
      icon: Activity,
      promptText: 'Ποια είναι η πορεία των καρκινικών και αιματολογικών δεικτών (CA 15-3, CEA и др.);',
    },
  ]

  return (
    <nav
      aria-label="Бързи клинични въпроси и сесии"
      className="px-4 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-2 overflow-x-auto shrink-0 select-none scrollbar-none"
    >
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

      <div className="flex items-center gap-1.5 overflow-x-auto">
        {prompts.map((p, idx) => {
          const Icon = p.icon
          return (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => onSelectPrompt(p.promptText)}
              aria-label={p.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-xs font-medium text-slate-700 whitespace-nowrap transition-colors shadow-2xs hover:border-slate-300 disabled:opacity-50 cursor-pointer"
            >
              <Icon className="w-3 h-3 text-cyan-600 shrink-0" />
              <span>{p.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
