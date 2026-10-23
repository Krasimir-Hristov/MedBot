'use client'

import React from 'react'
import { logoutAction } from '@/features/auth'
import { useTranslation, LanguageSwitcher } from '@/features/i18n'
import { LogOut, ShieldAlert } from 'lucide-react'

const AdminPortalPage: React.FC = () => {
  const { t } = useTranslation()

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 flex flex-col">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-2xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t.admin.title}</h1>
            <p className="text-xs text-slate-400">{t.admin.subtitle}</p>
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

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="p-8 bg-slate-800/60 border border-slate-700/60 rounded-3xl max-w-lg text-center backdrop-blur-md shadow-xl">
          <h2 className="text-lg font-semibold text-teal-400 mb-2">
            {t.admin.step1CompleteTitle}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {t.admin.step1CompleteDesc}
          </p>
        </div>
      </div>
    </main>
  )
}

export default AdminPortalPage
