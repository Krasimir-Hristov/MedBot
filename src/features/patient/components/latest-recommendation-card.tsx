'use client'

import React, { useState } from 'react'
import { useTranslation } from '@/features/i18n'
import { ExternalLink, Paperclip, Sparkles, Utensils, Pill, CalendarCheck, Activity } from 'lucide-react'
import type { DoctorNoteItem } from '@/features/doctor-notes'
import { NoteDetailSheet } from './note-detail-sheet'

interface LatestRecommendationCardProps {
  latestNote: DoctorNoteItem | null
  notesByCategory: {
    diet?: DoctorNoteItem
    exercise?: DoctorNoteItem
    therapy?: DoctorNoteItem
    general?: DoctorNoteItem
  }
  onAskAboutCategory?: (question: string) => void
}

export const LatestRecommendationCard: React.FC<LatestRecommendationCardProps> = ({
  latestNote,
  notesByCategory,
  onAskAboutCategory,
}) => {
  const { t, locale } = useTranslation()
  const [activeSheetNote, setActiveSheetNote] = useState<DoctorNoteItem | null>(null)

  const isGreek = locale === 'el'

  const handleOpenCategory = (type: 'diet' | 'exercise' | 'therapy' | 'visit') => {
    if (type === 'diet') {
      if (notesByCategory.diet) {
        setActiveSheetNote(notesByCategory.diet)
      } else {
        onAskAboutCategory?.(
          isGreek
            ? 'Πόσο νερό να πίνω και τι να τρώω σύμφωνα με τον ιατρό;'
            : 'Какво мога да ям и колко вода да пия според указанията на лекаря?'
        )
      }
    } else if (type === 'exercise') {
      if (notesByCategory.exercise) {
        setActiveSheetNote(notesByCategory.exercise)
      } else {
        onAskAboutCategory?.(
          isGreek
            ? 'Ποιες ασκήσεις επιτρέπονται και τι να προσέχω για την οστεοπόρωση;'
            : 'Какви упражнения са позволени и какво да пазя за остеопорозата?'
        )
      }
    } else if (type === 'therapy') {
      if (notesByCategory.therapy) {
        setActiveSheetNote(notesByCategory.therapy)
      } else {
        onAskAboutCategory?.(
          isGreek
            ? 'Ποια φάρμακα λαμβάνω και σε ποιον πυρετό να επικοινωνήσω με τον ιατρό;'
            : 'Какви лекарства вземам и при каква температура да се обадя на лекаря?'
        )
      }
    } else if (type === 'visit') {
      onAskAboutCategory?.(
        isGreek
          ? 'Πότε είναι το επόμενο ραντεβού και ποιες εξετάσεις χρειάζονται;'
          : 'Кога е следващият преглед и какви изследвания са нужни?'
      )
    }
  }

  if (!latestNote) {
    return (
      <section className="bg-linear-to-br from-emerald-50/80 via-white to-sky-50/40 border border-emerald-200/70 rounded-2xl p-5 shadow-xs text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-emerald-100/90 text-emerald-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
          <span>{t.patient.latestRecommendation}</span>
        </div>
        <p className="text-base text-slate-700 font-medium">
          {t.patient.welcomeDesc}
        </p>
      </section>
    )
  }

  const doctorTitle = latestNote.doctorName || (isGreek ? 'Θεράπων Ογκολόγος' : 'Лекуващ онколог')
  const noteContent = isGreek ? (latestNote.noteEl || latestNote.noteBg) : (latestNote.noteBg || latestNote.noteEl)

  return (
    <>
      <section className="bg-linear-to-br from-emerald-50/90 via-emerald-50/40 to-white border border-emerald-300/60 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-all">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white/90 border border-emerald-200/80 px-3.5 py-1.5 rounded-full shadow-2xs">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
              {t.patient.latestFromDoctor} ({doctorTitle})
            </span>
          </div>

          <span className="text-xs font-semibold text-emerald-800/80 bg-emerald-100/60 px-2.5 py-1 rounded-lg">
            {new Date(latestNote.createdAt).toLocaleDateString(isGreek ? 'el-GR' : 'bg-BG', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'Europe/Sofia',
            })}
          </span>
        </div>

        <p className="text-lg sm:text-xl text-slate-900 font-medium leading-relaxed sm:leading-loose">
          {noteContent}
        </p>

        {latestNote.hasAttachment && (
          <div className="pt-1">
            <a
              href={`/api/notes/${latestNote.id}/file`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-2xs active:scale-95"
            >
              <Paperclip className="w-4 h-4 text-emerald-600" />
              <span>{latestNote.attachmentName || t.patient.openDocument}</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600 ml-1" />
            </a>
          </div>
        )}

        {/* Бързи интерактивни теми */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-emerald-200/60">
          <button
            type="button"
            onClick={() => handleOpenCategory('diet')}
            className="flex items-center gap-1.5 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-emerald-950 px-3.5 py-2 rounded-xl border border-emerald-200/80 text-xs sm:text-sm font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <Utensils className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.patient.diet}</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenCategory('exercise')}
            className="flex items-center gap-1.5 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-emerald-950 px-3.5 py-2 rounded-xl border border-emerald-200/80 text-xs sm:text-sm font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.patient.exercise}</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenCategory('therapy')}
            className="flex items-center gap-1.5 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-emerald-950 px-3.5 py-2 rounded-xl border border-emerald-200/80 text-xs sm:text-sm font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <Pill className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.patient.therapy}</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenCategory('visit')}
            className="flex items-center gap-1.5 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-emerald-950 px-3.5 py-2 rounded-xl border border-emerald-200/80 text-xs sm:text-sm font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.patient.nextVisit}</span>
          </button>
        </div>
      </section>

      {/* Модален лист за детайли */}
      <NoteDetailSheet
        note={activeSheetNote}
        isOpen={Boolean(activeSheetNote)}
        onClose={() => setActiveSheetNote(null)}
        onAskAboutNote={onAskAboutCategory}
      />
    </>
  )
}
