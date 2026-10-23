'use client'

import React from 'react'
import { useTranslation } from '@/features/i18n'

export const HomeFooter: React.FC = () => {
  const { t } = useTranslation()

  return (
    <footer className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
      <p>{t.common.footerCopyright}</p>
    </footer>
  )
}
