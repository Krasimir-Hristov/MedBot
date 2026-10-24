'use client'

import React, { useTransition } from 'react'
import { logoutAction } from '../actions'
import { LogOut } from 'lucide-react'
import { useTranslation } from '@/features/i18n'

interface LogoutButtonProps {
  className?: string
  /** `light` – клиничен стил за светлите портали (/admin, /doctor) */
  variant?: 'dark' | 'light'
}

const BUTTON_VARIANT_STYLES = {
  dark: 'px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-medium text-slate-300 hover:text-white border border-slate-700',
  light:
    'px-3 py-1.5 rounded-md bg-white hover:bg-rose-50 text-xs font-medium text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200',
} as const

export const LogoutButton: React.FC<LogoutButtonProps> = ({ className = '', variant = 'dark' }) => {
  const [isPending, startTransition] = useTransition()
  const { t } = useTranslation()

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction()
      window.location.replace('/')
    })
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      aria-label={t.common.logout}
      className={`flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 ${BUTTON_VARIANT_STYLES[variant]} ${className}`}
    >
      <LogOut className="w-4 h-4" />
      <span>{isPending ? t.common.loading : t.common.logout}</span>
    </button>
  )
}
