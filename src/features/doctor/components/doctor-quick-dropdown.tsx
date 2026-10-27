'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from '@/features/i18n'
import {
  HelpCircle,
  ChevronDown,
  Clock,
  Microscope,
  Scan,
  Activity,
  Stethoscope,
} from 'lucide-react'

interface DoctorQuickDropdownProps {
  onSelectPrompt: (prompt: string) => void
  disabled?: boolean
}

export const DoctorQuickDropdown: React.FC<DoctorQuickDropdownProps> = ({
  onSelectPrompt,
  disabled = false,
}) => {
  const { t, locale } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const items = [
    {
      id: 'timeline',
      icon: Clock,
      color: 'text-sky-600 bg-sky-50 border-sky-200',
      titleEl: 'Πλήρες Ογκολογικό Χρονολόγιο',
      titleBg: 'Пълна онкологична хронология',
      descEl: 'Όλες οι ημερομηνίες, επεμβάσεις, θεραπείες και απεικονίσεις',
      descBg: 'Всички дати, интервенции, терапии и образи chronologically',
      promptTextEl:
        'Δώσε μου το πλήρες ογκολογικό χρονολόγιο της ασθενούς με όλες τις σημαντικές ημερομηνίες, επεμβάσεις, θεραπείες και απεικονίσεις.',
      promptTextBg:
        'Моля за пълна онкологична хронология на пациентката с всички ключови дати, операции, терапии и образни изследвания.',
    },
    {
      id: 'histology',
      icon: Microscope,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      titleEl: 'Ιστολογία, TNM & Υποδοχείς',
      titleBg: 'Хистология, TNM стадий и биомаркери',
      descEl: 'Ιστολογικός τύπος, grade, ER, PR, HER2, Ki-67 και σταδιοποίηση',
      descBg: 'Тип на тумора, диференциация, хормонален статус и стадий',
      promptTextEl:
        'Ποια είναι τα αναλυτικά ιστολογικά ευρήματα, ο ιστολογικός τύπος, το grade και η έκφраση των υποδοχέων (ER, PR, HER2, Ki-67);',
      promptTextBg:
        'Какви са подробните хистологични находки, хистологичен тип, grade и рецепторен статус (ER, PR, HER2, Ki-67);',
    },
    {
      id: 'imaging',
      icon: Scan,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      titleEl: 'Απεικονιστικές Εξετάσεις',
      titleBg: 'Образна диагностика (CT / MRI / PET)',
      descEl: 'Ευρήματα αξονικών/μαγνητικών και σύγκριση βλαβών διαχρονικά',
      descBg: 'Резултати от образни изследвания и динамика на лезиите (RECIST)',
      promptTextEl:
        'Ποια είναι τα αποτελέσματα των απεικονιστικών εξετάσεων (CT, MRI, PET) και πώς συγκρίνονται οι βλάβες διαχρονικά;',
      promptTextBg:
        'Какви са резултатите от образните изследвания (CT, MRI, PET) и как се променят лезиите във времето;',
    },
    {
      id: 'markers',
      icon: Activity,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      titleEl: 'Καρκινικοί & Αιματολογικοί Δείκτες',
      titleBg: 'Туморни и кръвни маркери',
      descEl: 'Διαχρονική πορεία CA 15-3, CEA και αιματολογικών παραμέτρων',
      descBg: 'Динамика на CA 15-3, CEA и хематологични показатели',
      promptTextEl:
        'Ποια είναι η διαχρονική πορεία των καρκινικών και αιματολογικών δεικτών (CA 15-3, CEA κ.λπ.);',
      promptTextBg:
        'Как се движат във времето туморните и кръвните маркери (CA 15-3, CEA и др.);',
    },
    {
      id: 'therapy',
      icon: Stethoscope,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      titleEl: 'Τρέχουσα Αγωγή & Πλάνο',
      titleBg: 'Текущо лечение и план',
      descEl: 'Φαρμακευτική αγωγή, ιατρικές συστάσεις και προγραμματισμός',
      descBg: 'Настояща терапия, препоръки и следващи стъпки',
      promptTextEl:
        'Ποια είναι η τρέχουσα θεραπευτική αγωγή της ασθενούς, οι καταγεγραμμένες συστάσεις και τα επόμενα βήματα;',
      promptTextBg:
        'Каква е текущата терапия на пациентката, записаните лекарски препоръки и следващите планирани стъпки;',
    },
  ]

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = useCallback(
    (promptText: string) => {
      setIsOpen(false)
      onSelectPrompt(promptText)
    },
    [onSelectPrompt]
  )

  const isGreek = locale === 'el'

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t.doctor.quickPromptsTitle}
        title={t.doctor.quickPromptsSubtitle}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 hover:text-sky-800 transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <HelpCircle className="w-3.5 h-3.5 text-sky-600 shrink-0" />
        <span className="font-medium">
          {isGreek ? 'Γρήγορες Ερωτήσεις' : 'Бързи клинични въпроси'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-[340px] sm:w-[420px] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 font-mono">
                {t.doctor.quickPromptsTitle}
              </p>
              <p className="text-[10px] text-slate-500">
                {t.doctor.quickPromptsSubtitle}
              </p>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              5 θέματα
            </span>
          </div>

          {/* List of Questions */}
          <div className="space-y-1 max-h-[360px] overflow-y-auto pt-1">
            {items.map((item) => {
              const Icon = item.icon
              const primaryTitle = isGreek ? item.titleEl : item.titleBg
              const secondaryTitle = isGreek ? item.titleBg : item.titleEl
              const subtitle = isGreek ? item.descEl : item.descBg
              const promptToSend = isGreek ? item.promptTextEl : item.promptTextBg

              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect(promptToSend)}
                  className="w-full text-left flex items-start gap-3 p-2.5 rounded-xl hover:bg-sky-50 text-slate-800 hover:text-sky-950 transition-colors cursor-pointer group"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${item.color}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-sky-950 truncate">
                        {primaryTitle}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium truncate max-w-[140px]">
                        {secondaryTitle}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug line-clamp-1 mt-0.5">
                      {subtitle}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
