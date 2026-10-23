'use client'

import React from 'react'
import { useTranslation } from '../context'
import { Locale } from '../types'
import { Languages } from 'lucide-react'

interface LanguageSwitcherProps {
  compact?: boolean
  className?: string
}

// Кръгло SVG знаме на България (Бяло, Зелено, Червено)
const BgFlag: React.FC = () => (
  <svg
    viewBox="0 0 640 480"
    className="w-4 h-4 rounded-full overflow-hidden shrink-0 shadow-xs border border-white/20"
    aria-hidden="true"
  >
    <rect width="640" height="160" fill="#ffffff" />
    <rect y="160" width="640" height="160" fill="#00966e" />
    <rect y="320" width="640" height="160" fill="#d62612" />
  </svg>
)

// Кръгло SVG знаме на Гърция (Сини и бели ленти с кръст)
const GrFlag: React.FC = () => (
  <svg
    viewBox="0 0 640 480"
    className="w-4 h-4 rounded-full overflow-hidden shrink-0 shadow-xs border border-white/20"
    aria-hidden="true"
  >
    <rect width="640" height="480" fill="#0d5eaf" />
    <rect y="53.3" width="640" height="53.3" fill="#ffffff" />
    <rect y="160" width="640" height="53.3" fill="#ffffff" />
    <rect y="266.7" width="640" height="53.3" fill="#ffffff" />
    <rect y="373.3" width="640" height="53.3" fill="#ffffff" />
    <rect width="213.3" height="266.7" fill="#0d5eaf" />
    <rect x="80" width="53.3" height="266.7" fill="#ffffff" />
    <rect y="106.7" width="213.3" height="53.3" fill="#ffffff" />
  </svg>
)

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  compact = false,
  className = '',
}) => {
  const { locale, setLocale, t } = useTranslation()

  const handleSelect = (newLocale: Locale) => {
    if (newLocale !== locale) {
      setLocale(newLocale)
    }
  }

  return (
    <div
      role="group"
      aria-label={t.common.switchLanguage}
      className={`inline-flex items-center p-1 bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-md ${className}`}
    >
      {!compact && (
        <div className="flex items-center gap-1.5 px-2.5 text-xs font-medium text-slate-400 select-none">
          <Languages className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden sm:inline">Език / Γλώσσα:</span>
        </div>
      )}

      {/* Бутон за Български език 🇧🇬 */}
      <button
        type="button"
        onClick={() => handleSelect('bg')}
        aria-label="Превключи на Български език"
        aria-pressed={locale === 'bg'}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
          locale === 'bg'
            ? 'bg-linear-to-r from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/20 scale-102'
            : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
        }`}
      >
        <BgFlag />
        <span>Български</span>
      </button>

      {/* Бутон за Гръцки език 🇬🇷 */}
      <button
        type="button"
        onClick={() => handleSelect('el')}
        aria-label="Αλλαγή σε Ελληνικά"
        aria-pressed={locale === 'el'}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
          locale === 'el'
            ? 'bg-linear-to-r from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20 scale-102'
            : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
        }`}
      >
        <GrFlag />
        <span>Ελληνικά</span>
      </button>
    </div>
  )
}
