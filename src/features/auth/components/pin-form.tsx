'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithPinAction } from '../actions'
import { Lock, Delete, ArrowRight, ShieldCheck, HeartPulse } from 'lucide-react'

export const PinForm: React.FC = () => {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

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
        router.push(result.redirectTo)
        router.refresh()
      } else {
        setError(result.error ?? 'Невалиден ПИН код.')
      }
    })
  }

  const numpadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <section className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 transition-all duration-300">
      {/* Лого и Заглавие */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-linear-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/20 mb-3 animate-pulse">
          <HeartPulse className="w-9 h-9" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          MedScan RAG
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          Сигурен достъп до онкологично досие
        </p>
      </div>

      {/* Поле за въвеждане на ПИН */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label htmlFor="pin-input" className="sr-only">
            ПИН код за достъп
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
              placeholder="••••"
              disabled={isPending}
              aria-label="Въведете ПИН код"
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
                aria-label="Изчисти ПИН кода"
                className="absolute right-4 text-xs font-semibold uppercase text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
              >
                Изчисти
              </button>
            )}
          </div>
        </div>

        {/* Съобщение за грешка */}
        {error && (
          <div
            role="alert"
            className="p-3 text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-900/60 text-center font-medium animate-shake"
          >
            {error}
          </div>
        )}

        {/* Цифрова клавиатура (Numpad) за мобилни устройства */}
        <div className="pt-2 grid grid-cols-3 gap-2 sm:gap-3">
          {numpadDigits.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitClick(digit)}
              disabled={isPending}
              aria-label={`Цифра ${digit}`}
              className="h-14 sm:h-16 text-2xl font-semibold rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center text-slate-800 dark:text-slate-100 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending || pin.length === 0}
            aria-label="Изтрий последната цифра"
            className="h-14 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-xs cursor-pointer disabled:opacity-40"
          >
            <Delete className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => handleDigitClick('0')}
            disabled={isPending}
            aria-label="Цифра 0"
            className="h-14 sm:h-16 text-2xl font-semibold rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center text-slate-800 dark:text-slate-100 shadow-xs cursor-pointer disabled:opacity-50"
          >
            0
          </button>
          <button
            type="submit"
            disabled={isPending || pin.length === 0}
            aria-label="Вход в системата"
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
        <span>Криптирана сесия с автоматично изтичане</span>
      </div>
    </section>
  )
}
