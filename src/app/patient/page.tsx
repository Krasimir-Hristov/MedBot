'use client'

import React from 'react'
import { LogoutButton } from '@/features/auth'
import { useTranslation, LanguageSwitcher } from '@/features/i18n'
import { HeartHandshake, Mic } from 'lucide-react'

const PatientPortalPage: React.FC = () => {
  const { t } = useTranslation()

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 flex flex-col">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-2xl">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t.patient.title}</h1>
            <p className="text-xs sm:text-sm text-slate-400">{t.patient.subtitle}</p>
          </div>
        </div>

        {/* Контроли вдясно: Езиков превключвател + Бутон за изход */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <LanguageSwitcher compact />
          <LogoutButton />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="p-8 bg-slate-800/60 border border-slate-700/60 rounded-3xl max-w-lg text-center backdrop-blur-md shadow-xl mb-6">
          <h2 className="text-xl font-semibold text-rose-400 mb-2">
            {t.patient.welcomeTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
            {t.patient.welcomeDesc}
          </p>

          {/* Бутон за гласово питане (превю за Стъпка 4) */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              disabled
              aria-label={t.patient.voiceAssistant}
              className="w-16 h-16 rounded-full bg-linear-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 opacity-70 cursor-not-allowed mb-2"
            >
              <Mic className="w-8 h-8" />
            </button>
            <span className="text-xs text-slate-400">
              {t.patient.voiceAssistant} {t.patient.voiceAssistantStep}
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}

export default PatientPortalPage
