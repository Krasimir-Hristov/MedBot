'use client'

import React from 'react'
import { logoutAction } from '@/features/auth'
import { useTranslation, LanguageSwitcher } from '@/features/i18n'
import { LogOut, Stethoscope, Clock, Microscope, Scan, Activity } from 'lucide-react'

const DoctorPortalPage: React.FC = () => {
  const { t } = useTranslation()

  const quickButtons = [
    { label: t.doctor.quickPrompts.timeline, icon: Clock, color: 'text-amber-400' },
    { label: t.doctor.quickPrompts.histology, icon: Microscope, color: 'text-emerald-400' },
    { label: t.doctor.quickPrompts.imaging, icon: Scan, color: 'text-cyan-400' },
    { label: t.doctor.quickPrompts.markers, icon: Activity, color: 'text-rose-400' },
  ]

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 flex flex-col">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-2xl">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t.doctor.title}</h1>
            <p className="text-xs text-slate-400">{t.doctor.subtitle}</p>
          </div>
        </div>

        {/* Контроли вдясно: Езиков превключвател + Бутон за изход */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <LanguageSwitcher compact />
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label={t.common.logout}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-medium transition-colors cursor-pointer text-slate-300 hover:text-white border border-slate-700"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.common.logout}</span>
            </button>
          </form>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="p-8 bg-slate-800/60 border border-slate-700/60 rounded-3xl max-w-xl text-center backdrop-blur-md shadow-xl mb-6">
          <h2 className="text-xl font-semibold text-cyan-400 mb-2">
            {t.doctor.welcomeTitle}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            {t.doctor.welcomeDesc}
          </p>

          {/* Преглед на 4-те бързи клавиша за лекаря */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
            {quickButtons.map((btn, idx) => {
              const Icon = btn.icon
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-700/70 text-xs font-medium text-slate-200"
                >
                  <Icon className={`w-4 h-4 shrink-0 ${btn.color}`} />
                  <span className="truncate">{btn.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}

export default DoctorPortalPage
