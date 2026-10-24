'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Check, Link2, Lock, ShieldCheck } from 'lucide-react'
import { LogoutButton } from '@/features/auth'
import { LanguageSwitcher, useTranslation } from '@/features/i18n'
import { getDoctorShareLinkAction } from '../actions'

type CopyState = 'idle' | 'loading' | 'done' | 'error'

export const AdminHeader: React.FC = () => {
  const { t } = useTranslation()
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }
    },
    []
  )

  const scheduleReset = () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
    }
    resetTimerRef.current = setTimeout(() => setCopyState('idle'), 2500)
  }

  const handleCopy = async () => {
    setCopyState('loading')
    try {
      const result = await getDoctorShareLinkAction()
      if (!result.success) {
        throw new Error(result.error)
      }
      await navigator.clipboard.writeText(result.data.text)
      setCopyState('done')
    } catch (error) {
      console.error('Copy doctor link failed:', error)
      setCopyState('error')
    }
    scheduleReset()
  }

  const copyLabel =
    copyState === 'done'
      ? t.admin.copyLinkDone
      : copyState === 'error'
        ? t.admin.copyLinkError
        : t.admin.copyLink

  return (
    <header className="sticky top-0 z-40 flex min-h-[60px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-4 py-2 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-600" aria-hidden="true" />
          <span className="text-base font-bold tracking-tight text-sky-700">{t.common.appName}</span>
        </div>
        <span className="hidden h-4 w-px bg-slate-200 sm:block" aria-hidden="true" />
        <span className="hidden items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-clinical-mono text-[11px] text-slate-600 sm:inline-flex">
          <ShieldCheck className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
          {t.admin.badge}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={handleCopy}
          disabled={copyState === 'loading'}
          aria-label={t.admin.copyLink}
          className={`flex h-8 cursor-pointer items-center gap-2 rounded-md px-3 text-xs font-semibold text-white shadow-xs transition-all active:scale-[0.98] disabled:opacity-60 ${
            copyState === 'error' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-sky-600 hover:bg-sky-700'
          }`}
        >
          {copyState === 'done' ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span className="hidden md:inline">{copyLabel}</span>
          <span className="md:hidden">{copyState === 'idle' ? t.admin.copyLinkShort : copyLabel}</span>
          <Lock className="hidden h-3 w-3 text-sky-200 md:block" aria-hidden="true" />
        </button>
        <LanguageSwitcher variant="light" compact />
        <LogoutButton variant="light" />
      </div>
    </header>
  )
}
