'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from '@/features/i18n'
import {
  HelpCircle,
  ChevronDown,
  Microscope,
  FileText,
  Clock,
  Zap,
  Scan,
  HeartPulse,
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

  const isGreek = locale === 'el'

  // 7-те ключови изисквания за медицинска документация и анализи от становището на д-р Анастасиос Вагионас (19.10.2026 г.)
  const items = [
    {
      id: 'biopsy-her2',
      icon: Microscope,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      titleEl: 'Αρχική Βιοψία & HER2 ISH (15.10.2025)',
      titleBg: 'Първоначална биопсия и HER2 ISH (15.10.2025 г.)',
      descEl: 'Έκθεση 15.10.2025: ER 100%, HER2 2+ ISH(+), Ki-67 8%',
      descBg: 'Оригинално хистологично заключение и потвърждение на HER2 статус',
      promptTextEl:
        'Εντόπισε και ανάλυσε την αρχική βιοψία της 15.10.2025 και το αποτέλεσμα HER2 ISH/FISH (ER, PR, HER2, Ki-67). Παράθεσε τα ακριβή έγγραφα του φακέλου με συνδέσμους [📄 ...](/api/doc/ID).',
      promptTextBg:
        'Намери и анализирай оригиналната биопсия от 15.10.2025 г. и резултата от HER2 ISH/FISH изследването. Посочи точните документи от досието с цитати [📄 ...](/api/doc/ID).',
    },
    {
      id: 'surgery-histology',
      icon: FileText,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      titleEl: 'Χειρουργικό Πρακτικό & Μετεγχειρητική Ιστολογία (27.03.2026)',
      titleBg: 'Оперативен протокол и следоперативна хистология (27.03.2026 г.)',
      descEl: 'Ριζική μαστεκτομή, μασχαλιαία εκτομή & ypT2N1aM0 (απώλεια HER2)',
      descBg: 'Оперативен протокол от мастектомията, остатъчен тумор и лимфни възли',
      promptTextEl:
        'Βρες το χειρουργικό πρακτικό της 27.03.2026 (ριζική μαστεκτομή, λεμφαδενικός καθαρισμός) και την οριστική μετεγχειρητική έκθεση (ypT2N1aM0, ER 98%, HER2 score 0, Ki-67 40%). Παράθεσε συνδέσμους στα σχετικά έγγραφα.',
      promptTextBg:
        'Намери оперативния протокол от операцията на 27.03.2026 г. и окончателното хистологично заключение след операцията (стадий ypT2N1aM0, ER 98%, HER2 score 0, Ki-67 40%). Посочи връзки към документите.',
    },
    {
      id: 'chemo-protocols',
      icon: Clock,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      titleEl: 'Πρωτόκολλα Χημειοθεραπείας (NACT & Επικουρική)',
      titleBg: 'Протоколи от неоадювантна и адювантна химиотерапия',
      descEl: '4 κύκλοι Docetaxel+Phesgo & 3 κύκλοι επικουρικής χημειοθεραπείας',
      descBg: 'Всички проведени цикли с медикаменти, дозировки и дати',
      promptTextEl:
        'Εντόπισε όλα τα πρωτόκολλα και εξιτήρια χημειοθεραπείας: τους 4 κύκλους προεγχειρητικής (Docetaxel + Phesgo) και τους 3 κύκλους επικουρικής (ΑΧΤ), με αναγραφή φαρμάκων, δόσεων και ημερομηνιών. Παράθεσε τα σχετικά έγγραφα.',
      promptTextBg:
        'Извади подробните протоколи от проведената неоадювантна (Docetaxel + Phesgo) и адювантна химиотерапия, включително приложени медикаменти, дози и дати. Цитирай документите.',
    },
    {
      id: 'radiation-therapy',
      icon: Zap,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      titleEl: 'Τεκμηρίωση Ακτινοθεραπείας (Πεδία & Δόσεις)',
      titleBg: 'Документация от проведена лъчетерапия (дози и полета)',
      descEl: 'Πεδία ακτινοβόλησης, συνολική δόση (Gy) και περίοδος θεραπείας',
      descBg: 'Епикриза от лъчетерапия с облъчвани анатомични зони и дозировка',
      promptTextEl:
        'Εντόπισε τα έγγραφα και τα εξιτήρια της ακτινοθεραπείας: ποια ήταν τα πεδία ακτινοβόλησης, η συνολική δόση και η περίοδος θεραπείας; Παράθεσε συνδέσμους στα σχετικά έγγραφα.',
      promptTextBg:
        'Намери документацията от проведената следоперативна лъчетерапия с информация за облъчваните анатомични области, общата доза и периода на лечение. Посочи документите.',
    },
    {
      id: 'imaging-pet-ct',
      icon: Scan,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      titleEl: 'Απεικονίσεις: PET/CT (23.07.2026) & MRI Μαστών',
      titleBg: 'Образни изследвания: PET/CT (23.07.2026 г.) и ЯМР',
      descEl: 'Αρχικό PET/CT, μαγνητική μαστών και έλεγχος για υποτροπή',
      descBg: 'Сравнение на образните изследвания и изключване на рецидив или метастази',
      promptTextEl:
        'Συγκέντρωσε όλα τα απεικονιστικά ευρήματα του φακέλου: το αρχικό PET/CT (12/2025), τη μαγνητική μαστών (03/2026) και το μετεγχειρητικό PET/CT της 23.07.2026. Υπάρχουν ενδείξεις υποτροπής ή μεταστάσεων; Παράθεσε τα σχετικά έγγραφα.',
      promptTextBg:
        'Обобщи резултатите от образните изследвания в досието: PET/CT от 23.07.2026 г., MRI на млечни жлези и предходни изследвания. Има ли данни за рецидив? Цитирай документите.',
    },
    {
      id: 'cardio-markers',
      icon: HeartPulse,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      titleEl: 'Καρδιολογικός Έλεγχος (LVEF / QTc) & CA 15-3',
      titleBg: 'Кардиологична оценка (LVEF, QTc) и CA 15-3',
      descEl: 'Κλάσμα εξώθησης LVEF για αντι-HER2, QTc για ribociclib & δείκτης',
      descBg: 'Ехокардиография за фракция на изтласкване, ЕКГ и туморни маркери',
      promptTextEl:
        'Εντόπισε τα καρδιολογικά ευρήματα (υπερηχοκαρδιογράφημα LVEF ενόψει αντι-HER2 αγωγής, ΗΚΓ/QTc λόγω ribociclib) και τη διαχρονική πορεία του καρκινικού δείκτη CA 15-3. Παράθεσε τα σχετικά έγγραφα.',
      promptTextBg:
        'Намери данните за кардиологична оценка (ехокардиография и LVEF фракция на изтласкване, ЕКГ и QTc интервал за ribociclib) и стойностите на туморния маркер CA 15-3. Посочи документите.',
    },
    {
      id: 'current-therapy-tdm1',
      icon: Stethoscope,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      titleEl: 'Τρέχουσα Αγωγή (Ribociclib) & Πρόταση T-DM1',
      titleBg: 'Текущо лечение (Ribociclib) и основание за T-DM1',
      descEl: 'Ενδοκρινική αγωγή (letrozole+ribociclib) & μελέτη KATHERINE',
      descBg: 'Възможност за преминаване към T-DM1 след загуба на HER2',
      promptTextEl:
        'Ανάλυσε την τρέχουσα αγωγή (letrozole + ribociclib 400mg) και τα καταγεγραμμένα κλινικά δεδομένα σχετικά με την πρόταση για T-DM1 (trastuzumab emtansine) βάσει της μελέτης KATHERINE και της απώλειας HER2. Παράθεσε τα σχετικά έγγραφα.',
      promptTextBg:
        'Анализирай текущото лечение с letrozole + ribociclib и клиничните основания от становището на д-р Вагионас за преоценка към T-DM1 (trastuzumab emtansine) след установената загуба на HER2 експресия. Цитирай документите.',
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

  const buttonLabel = isGreek ? 'Απαιτήσεις Ιατρού' : 'Изисквания на лекаря'
  const headerTitle = isGreek
    ? 'ΑΠΑΙΤΟΥΜΕΝΑ ΕΓΓΡΑΦΑ (ΔΡ. ΒΑΓΙΩΝΑΣ)'
    : 'ИЗИСКВАНИ ДОКУМЕНТИ (Д-Р ВАГИОНАС)'
  const headerSubtitle = isGreek
    ? '7 κλινικά σημεία ελέγχου βάσει του πορίσματος 19.10.2026'
    : '7 клинични изисквания от становището от 19.10.2026 г.'
  const badgeLabel = isGreek ? '7 απαιτήσεις' : '7 изисквания'

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
        <span className="font-medium">{buttonLabel}</span>
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
          className="absolute right-0 mt-2 w-[340px] sm:w-[480px] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-800 font-mono">
                {headerTitle}
              </p>
              <p className="text-[10px] text-slate-500">
                {headerSubtitle}
              </p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
              {badgeLabel}
            </span>
          </div>

          {/* List of Questions */}
          <div className="space-y-1 max-h-[440px] overflow-y-auto pt-1">
            {items.map((item) => {
              const Icon = item.icon
              const title = isGreek ? item.titleEl : item.titleBg
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
                    <p className="text-xs font-bold text-slate-900 group-hover:text-sky-950 leading-snug">
                      {title}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
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
