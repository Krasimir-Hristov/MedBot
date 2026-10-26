'use client'

import React from 'react'
import { History, Plus, Heart } from 'lucide-react'
import { LogoutButton } from '@/features/auth'
import { LanguageSwitcher, useTranslation } from '@/features/i18n'

interface PatientHeaderProps {
  onToggleHistory: () => void
  onNewConversation: () => void
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  onToggleHistory,
  onNewConversation,
}) => {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-sky-100 text-sky-700">
          <Heart className="w-5 h-5 fill-sky-600/20 text-sky-600" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 font-bold text-lg text-slate-900 tracking-tight">
            <span>MedBot</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Online" />
          </div>
          <p className="text-xs text-slate-500 font-medium">{t.patient.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleHistory}
          aria-label={t.patient.history}
          title={t.patient.history}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-sky-800 hover:bg-sky-50 rounded-xl border border-slate-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
        >
          <History className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden sm:inline">{t.patient.history}</span>
        </button>

        <button
          type="button"
          onClick={onNewConversation}
          aria-label={t.patient.newConversation}
          title={t.patient.newConversation}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl border border-sky-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 text-sky-600" />
          <span className="hidden sm:inline">{t.patient.newConversation}</span>
        </button>

        <LanguageSwitcher compact />
        <LogoutButton />
      </div>
    </header>
  )
}
