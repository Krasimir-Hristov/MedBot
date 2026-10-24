'use client'

import React, { useState, useTransition } from 'react'
import { loginWithPinAction } from '../actions'
import { Lock, Delete, ArrowRight, ShieldCheck, HeartPulse } from 'lucide-react'
import { useTranslation, LanguageSwitcher } from '@/features/i18n'
import { AuthErrorCode } from '../types'

export const PinForm: React.FC = () => {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { t } = useTranslation()

  const handleDigitClick = (digit: string) => {
    if (pin.length < 10) {
      setPin((prev) => prev + digit)
      setError(null)
    }
  }

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1))
    setError(null)
  }

  const handleClear = () => {
    setPin('')
    setError(null)
  }

  const getErrorMessageByCode = (code?: AuthErrorCode): string => {
    switch (code) {
      case 'INVALID_PIN':
        return t.auth.errorInvalidPin
      case 'VALIDATION_ERROR':
        return t.auth.errorFormat
      case 'RATE_LIMITED':
        return t.auth.errorRateLimited
      case 'SERVER_ERROR':
      default:
        return t.auth.errorGeneric
    }
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    if (!pin.trim() || isPending) {
      return
    }

    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.append('pin', pin)

      const result = await loginWithPinAction(formData)
      if (result.success && result.redirectTo) {
        window.location.replace(result.redirectTo)
      } else {
        // Превеждаме машинночетимия код на грешка според текущия език
        setError(getErrorMessageByCode(result.errorCode))
      }
    })
  }

  const numpadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <section className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 transition-all duration-300">
      {/* Превключвател на езици 🇧🇬 / 🇬🇷 най-отгоре */}
      <div className="flex justify-end mb-4">
        <LanguageSwitcher compact={false} />
      </div>

      {/* Лого и Заглавие */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-linear-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/20 mb-3 animate-pulse">
          <HeartPulse className="w-9 h-9" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t.auth.pinTitle}
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          {t.auth.pinSubtitle}
        </p>
      </div>

      {/* Поле за въвеждане на ПИН */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label htmlFor="pin-input" className="sr-only">
            {t.auth.pinInputAria}
          </label>
          <div className="relative flex items-center">
            <input
              id="pin-input"
              type="password"
              inputMode="numeric"
              maxLength={12}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value)
                setError(null)
              }}
              placeholder={t.auth.pinPlaceholder}
              disabled={isPending}
              aria-label={t.auth.pinInputAria}
              className="w-full text-center text-3xl sm:text-4xl tracking-widest font-mono py-3.5 px-12 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 transition-all"
            />
            <div className="absolute left-4 pointer-events-none text-slate-400">
              <Lock className="w-5 h-5" />
            </div>
            {pin.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isPending}
                aria-label={t.auth.clear}
                className="absolute right-4 text-xs font-semibold uppercase text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
              >
                {t.auth.clear}
              </button>
            )}
          </div>
        </div>

        {/* Съобщение за грешка */}
        {error && (
          <div
            role="alert"
            className="p-3 text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-900/60 text-center font-medium"
          >
            {error}
          </div>
        )}

        {/* Цифрова клавиатура (Numpad) */}
        <div className="pt-2 grid grid-cols-3 gap-2 sm:gap-3">
          {numpadDigits.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitClick(digit)}
              disabled={isPending}
              aria-label={`${t.auth.digitAria} ${digit}`}
              className="h-14 sm:h-16 text-2xl font-semibold rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center text-slate-800 dark:text-slate-100 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending || pin.length === 0}
            aria-label={t.auth.deleteAria}
            className="h-14 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-xs cursor-pointer disabled:opacity-40"
          >
            <Delete className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => handleDigitClick('0')}
            disabled={isPending}
            aria-label={`${t.auth.digitAria} 0`}
            className="h-14 sm:h-16 text-2xl font-semibold rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center text-slate-800 dark:text-slate-100 shadow-xs cursor-pointer disabled:opacity-50"
          >
            0
          </button>
          <button
            type="submit"
            disabled={isPending || pin.length === 0}
            aria-label={t.auth.submitAria}
            className="h-14 sm:h-16 rounded-2xl bg-linear-to-r from-teal-600 to-cyan-600 text-white font-bold hover:opacity-95 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-teal-500/25 cursor-pointer disabled:opacity-40"
          >
            {isPending ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-7 h-7" />
            )}
          </button>
        </div>
      </form>

      {/* Информационна бележка за сигурност */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-teal-500" />
        <span>{t.auth.secureSessionNotice}</span>
      </div>
    </section>
  )
}
