'use client'

import React from 'react'
import { LanguageSwitcher, useTranslation } from '@/features/i18n'
import { LogoutButton } from '@/features/auth'
import { Activity } from 'lucide-react'

interface DoctorHeaderProps {
  totalDocs?: number
}

export const DoctorHeader: React.FC<DoctorHeaderProps> = ({ totalDocs = 0 }) => {
  const { t } = useTranslation()

  return (
    <header className="h-[60px] px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-40">
      {/* Brand & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl tracking-tight text-slate-900 font-sans">
            MedBot
          </span>
          <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block animate-pulse"></span>
        </div>
        <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
          Clinical
        </span>
      </div>

      {/* Patient Pill */}
      <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 rounded-full text-xs font-medium text-slate-700 border border-slate-200 shadow-xs">
        <Activity className="w-3.5 h-3.5 text-cyan-600" />
        <span>{t.doctor.headerStatus}</span>
        {totalDocs > 0 && (
          <>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-mono">
              {t.doctor.catalog.totalDocs.replace('{count}', totalDocs.toString())}
            </span>
          </>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <LanguageSwitcher compact />
        <LogoutButton />
      </div>
    </header>
  )
}
