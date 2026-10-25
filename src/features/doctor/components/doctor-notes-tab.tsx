'use client'

import React, { useState } from 'react'
import { useTranslation } from '@/features/i18n'
import type { DoctorNote } from '@/lib/db/schema'
import { VoiceMicButton } from '@/features/voice'
import { Trash2, Loader2, Sparkles, UserCheck, Paperclip, ExternalLink } from 'lucide-react'

interface DoctorNotesTabProps {
  notes: DoctorNote[]
  onSaveNote: (noteText: string) => Promise<void>
  onDeleteNote: (noteId: number) => Promise<void>
}

export const DoctorNotesTab: React.FC<DoctorNotesTabProps> = ({
  notes,
  onSaveNote,
  onDeleteNote,
}) => {
  const { t, locale } = useTranslation()
  const [noteText, setNoteText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleSave = async () => {
    if (!noteText.trim() || isSaving) return
    try {
      setIsSaving(true)
      await onSaveNote(noteText.trim())
      setNoteText('')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (noteId: number) => {
    if (!window.confirm('Сигурни ли сте, че искате да изтриете тази бележка?')) return
    try {
      setDeletingId(noteId)
      await onDeleteNote(noteId)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Input Section */}
      <div className="p-3 sm:p-4 bg-white border-b border-slate-200 space-y-2.5">
        <div className="relative bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all">
          <textarea
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={t.doctor.notes.inputPlaceholder}
            aria-label={t.doctor.notes.inputPlaceholder}
            className="w-full bg-transparent border-0 text-xs text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-400 resize-none font-sans"
          />

          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 mt-1">
            <VoiceMicButton
              lang={locale === 'el' ? 'el-GR' : 'bg-BG'}
              onTranscript={(spokenText) => {
                setNoteText((prev) => (prev ? `${prev} ${spokenText}` : spokenText))
              }}
              variant="compact"
            />

            <button
              type="button"
              onClick={handleSave}
              disabled={!noteText.trim() || isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.doctor.notes.saving}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t.doctor.notes.saveNote}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
          {t.doctor.notes.savedNotesTitle} ({notes.length})
        </h3>

        {notes.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {t.doctor.notes.noNotes}
          </div>
        ) : (
          notes.map((note) => (
            <article
              key={note.id}
              className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2 relative group"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono border-b border-slate-100 pb-1.5">
                <span className="flex items-center gap-1 text-sky-800 font-semibold">
                  <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                  {note.doctorName || 'Д-р Специалист'}
                </span>
                <div className="flex items-center gap-2">
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    disabled={deletingId === note.id}
                    title={t.doctor.notes.deleteNote}
                    aria-label={t.doctor.notes.deleteNote}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                  >
                    {deletingId === note.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Greek Original */}
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  {t.doctor.notes.greekOriginal}
                </span>
                <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                  {note.noteEl}
                </p>
              </div>

              {/* Bulgarian Patient Translation */}
              <div className="bg-sky-50/60 border border-sky-100 rounded-lg p-2.5">
                <span className="text-[10px] font-bold uppercase text-sky-700 tracking-wider">
                  {t.doctor.notes.bulgarianTranslation}
                </span>
                <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans mt-0.5">
                  {note.noteBg}
                </p>
              </div>

              {/* Attached file link */}
              {note.attachmentName && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600 truncate mr-2">
                    <Paperclip className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span className="truncate">{note.attachmentName}</span>
                  </span>
                  <a
                    href={`/api/notes/${note.id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sky-600 hover:text-sky-800 font-semibold shrink-0"
                  >
                    <span>Отвори</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  )
}
