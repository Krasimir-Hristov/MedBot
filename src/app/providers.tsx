'use client'

import React from 'react'
import { LanguageProvider } from '@/features/i18n'

interface ProvidersProps {
  children: React.ReactNode
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return <LanguageProvider>{children}</LanguageProvider>
}
