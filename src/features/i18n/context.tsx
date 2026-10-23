'use client'

import React, { createContext, useContext, useState } from 'react'
import { Locale, TranslationDictionary } from './types'
import { bgTranslations } from './locales/bg'
import { elTranslations } from './locales/el'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslationDictionary
}

const translationsMap: Record<Locale, TranslationDictionary> = {
  bg: bgTranslations,
  el: elTranslations,
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const LOCALE_COOKIE_KEY = 'medbot_locale'

interface LanguageProviderProps {
  children: React.ReactNode
  initialLocale?: Locale
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  initialLocale = 'bg',
}) => {
  // Използваме lazy initializer за безопасно четене от localStorage при първо зареждане в браузъра
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCALE_COOKIE_KEY) as Locale | null
        if (saved === 'bg' || saved === 'el') {
          return saved
        }
      } catch {
        // Fallback при забрана за достъп до localStorage
      }
    }
    return initialLocale
  })

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCALE_COOKIE_KEY, newLocale)
        document.cookie = `${LOCALE_COOKIE_KEY}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`
      } catch {
        // Ignore storage errors
      }
    }
  }

  const t = translationsMap[locale]

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return context
}
