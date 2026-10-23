'use client'

import React, { useTransition } from 'react'
import { logoutAction } from '../actions'
import { LogOut } from 'lucide-react'
import { useTranslation } from '@/features/i18n'

interface LogoutButtonProps {
  className?: string
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({ className = '' }) => {
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
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-medium transition-colors cursor-pointer text-slate-300 hover:text-white border border-slate-700 disabled:opacity-50 ${className}`}
    >
      <LogOut className="w-4 h-4" />
      <span>{isPending ? t.common.loading : t.common.logout}</span>
    </button>
  )
}
