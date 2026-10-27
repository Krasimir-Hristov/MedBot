'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from '@/features/i18n'
import { HelpCircle, ChevronDown, Utensils, Calendar, AlertTriangle, FileText } from 'lucide-react'

interface PatientQuickDropdownProps {
  onSelectQuestion: (question: string) => void
  disabled?: boolean
}

export const PatientQuickDropdown: React.FC<PatientQuickDropdownProps> = ({
  onSelectQuestion,
  disabled = false,
}) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const questions = [
    {
      id: 'diet-water',
      icon: Utensils,
      color: 'text-emerald-600',
      text: t.patient.quickQuestion1,
    },
    {
      id: 'next-visit',
      icon: Calendar,
      color: 'text-sky-600',
      text: t.patient.quickQuestion2,
    },
    {
      id: 'fever-warning',
      icon: AlertTriangle,
      color: 'text-amber-600',
      text: t.patient.quickQuestion3,
    },
    {
      id: 'histology-stage',
      icon: FileText,
      color: 'text-indigo-600',
      text: t.patient.quickQuestion4,
    },
  ]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (questionText: string) => {
    setIsOpen(false)
    onSelectQuestion(questionText)
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t.patient.quickQuestionsTitle}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 hover:text-sky-800 transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
      >
        <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
        <span>{t.patient.quickQuestionsTitle}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            {t.patient.quickQuestionsTitle}
          </div>

          <div className="space-y-1 max-h-72 overflow-y-auto pt-1">
            {questions.map((q) => {
              const Icon = q.icon
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => handleSelect(q.text)}
                  className="w-full text-left flex items-start gap-3 p-2.5 rounded-xl hover:bg-sky-50 text-xs sm:text-sm text-slate-800 hover:text-sky-950 font-medium transition-colors cursor-pointer group"
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${q.color}`} />
                  <span className="leading-snug flex-1">{q.text}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
