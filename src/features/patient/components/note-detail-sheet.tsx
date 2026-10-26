'use client'

import React from 'react'
import { X, ExternalLink, MessageSquare, Paperclip, Calendar, User } from 'lucide-react'
import { useTranslation } from '@/features/i18n'
import type { DoctorNoteItem } from '@/features/doctor-notes'
import {
  NOTE_CATEGORY_LABELS_BG,
  NOTE_CATEGORY_LABELS_EL,
  type NoteCategory,
} from '@/features/doctor-notes/constants'

interface NoteDetailSheetProps {
  note: DoctorNoteItem | null
  isOpen: boolean
  onClose: () => void
  onAskAboutNote?: (question: string) => void
}

export const NoteDetailSheet: React.FC<NoteDetailSheetProps> = ({
  note,
  isOpen,
  onClose,
  onAskAboutNote,
}) => {
  const { t, locale } = useTranslation()

  if (!isOpen || !note) return null

  const isGreek = locale === 'el'
  const categoryLabels = isGreek ? NOTE_CATEGORY_LABELS_EL : NOTE_CATEGORY_LABELS_BG
  const categoryLabel = categoryLabels[note.category as NoteCategory] || note.category
  const noteTitle = isGreek
    ? note.titleEl || note.titleBg || 'Οδηγία ιατρού'
    : note.titleBg || note.titleEl || 'Препоръка от лекаря'
  const noteContent = isGreek
    ? note.noteEl || note.noteBg
    : note.noteBg || note.noteEl
  const doctorName = note.doctorName || (isGreek ? 'Θεράπων Ογκολόγος' : 'Д-р Специалист')

  const handleAsk = () => {
    const topic = noteTitle || categoryLabel
    const question = isGreek
      ? `Τι ακριβώς πρέπει να κάνω σύμφωνα με ${topic};`
      : `Какво точно трябва да направя според ${topic}?`
    onAskAboutNote?.(question)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto space-y-4"
        role="dialog"
        aria-modal="true"
        aria-label={noteTitle}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {categoryLabel}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(note.createdAt).toLocaleDateString(isGreek ? 'el-GR' : 'bg-BG', {
                day: 'numeric',
                month: 'long',
                timeZone: 'Europe/Sofia',
              })}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.patient.close}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {noteTitle}
          </h3>
          <p className="text-xs text-slate-500 flex items-center gap-1 mb-4">
            <User className="w-3.5 h-3.5" />
            {doctorName}
          </p>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-slate-800 text-base sm:text-lg leading-relaxed whitespace-pre-line font-medium">
            {noteContent}
          </div>
        </div>

        {note.hasAttachment && (
          <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-sky-800 text-sm font-semibold truncate mr-2">
              <Paperclip className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="truncate">{note.attachmentName || (isGreek ? 'Πρωτότυπο έγγραφο' : 'Оригинален документ')}</span>
            </div>
            <a
              href={`/api/notes/${note.id}/file`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <span>{isGreek ? 'Προβολή' : 'Преглед'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={handleAsk}
            className="flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{t.patient.askAboutNote}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-all cursor-pointer"
          >
            {t.patient.close}
          </button>
        </div>
      </div>
    </div>
  )
}
