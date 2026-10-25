'use client'

import React, { createContext, useContext, useEffect, useSyncExternalStore } from 'react'
import { Locale, TranslationDictionary } from './types'
import bgTranslations from './locales/bg.json'
import elTranslations from './locales/el.json'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslationDictionary
}

const translationsMap: Record<Locale, TranslationDictionary> = {
  bg: bgTranslations,
  el: elTranslations,
}

const defaultContextValue: LanguageContextType = {
  locale: 'bg',
  setLocale: () => {},
  t: bgTranslations,
}

const LanguageContext = createContext<LanguageContextType>(defaultContextValue)

const LOCALE_COOKIE_KEY = 'medbot_locale'

// Слушатели за промени в езика в реално време
const listeners = new Set<() => void>()

const notifyListeners = () => {
  listeners.forEach((listener) => listener())
}

const subscribe = (callback: () => void) => {
  listeners.add(callback)
  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCALE_COOKIE_KEY) {
      callback()
    }
  }
  window.addEventListener('storage', handleStorage)

  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', handleStorage)
  }
}

const getClientSnapshot = (): Locale => {
  try {
    const saved = localStorage.getItem(LOCALE_COOKIE_KEY) as Locale | null
    if (saved === 'bg' || saved === 'el') {
      return saved
    }
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/doctor')) {
      return 'el'
    }
  } catch {
    // Ignore restricted storage
  }
  return 'bg'
}

const getServerSnapshot = (): Locale => {
  return 'bg'
}

interface LanguageProviderProps {
  children: React.ReactNode
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const locale = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  )

  // Синхронизираме document.documentElement.lang с избрания език за a11y и SEO
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  const setLocale = (newLocale: Locale) => {
    try {
      localStorage.setItem(LOCALE_COOKIE_KEY, newLocale)
      document.cookie = `${LOCALE_COOKIE_KEY}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLocale
      }
    } catch {
      // Ignore
    }
    notifyListeners()
  }

  const t = translationsMap[locale] ?? bgTranslations

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext)
  return context ?? defaultContextValue
}
