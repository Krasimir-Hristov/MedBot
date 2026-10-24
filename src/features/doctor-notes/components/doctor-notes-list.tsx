'use client'

import React, { useState } from 'react'
import { Trash2, Paperclip, ExternalLink, Calendar, User, Loader2 } from 'lucide-react'
import { NOTE_CATEGORY_LABELS_BG, type NoteCategory } from '../constants'
import type { DoctorNoteItem } from '../types'
import { deleteDoctorNoteAction } from '../actions'

interface DoctorNotesListProps {
  notes: DoctorNoteItem[]
  onDeleteSuccess?: () => void
}

export const DoctorNotesList: React.FC<DoctorNotesListProps> = ({ notes, onDeleteSuccess }) => {
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleDelete = async (noteId: number) => {
    if (!window.confirm('Сигурни ли сте, че искате да изтриете тази препоръка?')) return

    setDeletingId(noteId)
    setErrorMsg(null)

    try {
      const res = await deleteDoctorNoteAction(noteId)
      if (res.success) {
        onDeleteSuccess?.()
      } else {
        setErrorMsg(res.error || 'Грешка при изтриване.')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Грешка при изтриване.')
    } finally {
      setDeletingId(null)
    }
  }

  if (notes.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-400 text-xs">
        Все още няма въведени лекарски бележки или предписания.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {errorMsg && (
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {notes.map((note) => (
        <div
          key={note.id}
          className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 transition-all hover:border-slate-600"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-700/40 pb-2 mb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {NOTE_CATEGORY_LABELS_BG[note.category as NoteCategory] || note.category}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Calendar className="w-3 h-3" />
                {new Date(note.createdAt).toLocaleDateString('bg-BG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <User className="w-3 h-3" />
                {note.doctorName || 'Лекар'}
              </span>
            </div>

            <button
              type="button"
              disabled={deletingId === note.id}
              onClick={() => handleDelete(note.id)}
              aria-label="Изтрий препоръката"
              className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors disabled:opacity-50"
            >
              {deletingId === note.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Превод на български за пациента */}
          <div className="mb-2">
            <p className="text-xs font-semibold text-slate-200 mb-1">
              {note.titleBg || 'Препоръка'}:
            </p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {note.noteBg}
            </p>
          </div>

          {/* Оригинален гръцки текст */}
          {note.noteEl && (
            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800 text-[11px] text-slate-400 mb-2 font-mono">
              <span className="text-cyan-400 font-semibold block mb-0.5">Ελληνικά:</span>
              {note.noteEl}
            </div>
          )}

          {/* Прикачен файл */}
          {note.hasAttachment && (
            <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-cyan-400 truncate">
                <Paperclip className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{note.attachmentName || 'Прикачен медицински файл'}</span>
              </span>
              <a
                href={`/api/notes/${note.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 hover:underline shrink-0"
              >
                <span>Отвори файл</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
