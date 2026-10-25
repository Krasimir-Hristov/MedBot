'use client'

import React, { useState } from 'react'
import { FileUp, Send, Loader2 } from 'lucide-react'
import { VoiceMicButton } from '@/features/voice'
import { NOTE_CATEGORIES, NOTE_CATEGORY_LABELS_BG, type NoteCategory } from '../constants'
import { createTextDoctorNoteAction } from '../actions'
import { PrescriptionFileDropzone } from './prescription-file-dropzone'

interface DoctorNoteComposerProps {
  onSuccess?: () => void
}

export const DoctorNoteComposer: React.FC<DoctorNoteComposerProps> = ({ onSuccess }) => {
  const [tab, setTab] = useState<'text' | 'file'>('text')
  const [noteText, setNoteText] = useState('')
  const [category, setCategory] = useState<NoteCategory>('general')
  const [doctorName, setDoctorName] = useState('Д-р Георгиу')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleVoiceTranscript = (transcript: string) => {
    setNoteText((prev) => (prev ? `${prev} ${transcript}` : transcript))
  }

  const handleFileSelect = (file: File | null) => {
    if (file && file.size > 5 * 1024 * 1024) {
      setErrorMessage('Файлът надвишава лимита от 5MB.')
      return
    }
    setSelectedFile(file)
    setErrorMessage(null)
  }

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteText.trim()) return

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await createTextDoctorNoteAction({
        noteText,
        category,
        doctorName,
      })

      if (res.success) {
        setNoteText('')
        setSuccessMessage('Препоръката е запазена и преведена успешно!')
        onSuccess?.()
      } else {
        setErrorMessage(res.error || 'Грешка при запис.')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Грешка при запис.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      let fileBase64 = ''
      let mimeType = selectedFile.type

      if (selectedFile.type.startsWith('image/')) {
        const { default: imageCompression } = await import('browser-image-compression')
        const compressed = await imageCompression(selectedFile, {
          maxSizeMB: 0.35,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          fileType: 'image/jpeg',
        })
        fileBase64 = await imageCompression.getDataUrlFromFile(compressed)
        mimeType = 'image/jpeg'
      } else {
        const buffer = await selectedFile.arrayBuffer()
        const base64String = Buffer.from(buffer).toString('base64')
        fileBase64 = `data:${selectedFile.type || 'application/pdf'};base64,${base64String}`
        mimeType = 'application/pdf'
      }

      const res = await fetch('/api/notes/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileBase64,
          mimeType,
          category,
          doctorNote: noteText.trim() || undefined,
          doctorName,
        }),
      })

      const data = (await res.json()) as { error?: string }

      if (res.ok) {
        setSelectedFile(null)
        setNoteText('')
        setSuccessMessage('Файлът е качен, анализиран и преведен успешно!')
        onSuccess?.()
      } else {
        setErrorMessage(data.error || 'Грешка при качване на файла.')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Възникна мрежова грешка при качване.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
      {/* Табове за превключване: Текст / Файл */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('text')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'text'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ✍️ Бележка / Диктовка (EL)
          </button>
          <button
            type="button"
            onClick={() => setTab('file')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'file'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📎 Качване на PDF / Снимка
          </button>
        </div>

        {/* Име на лекаря */}
        <input
          type="text"
          value={doctorName}
          onChange={(e) => setDoctorName(e.target.value)}
          placeholder="Име на лекаря"
          className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-300 w-36 focus:outline-cyan-500"
        />
      </div>

      {/* Категории */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {NOTE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
              category === cat
                ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300'
                : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {NOTE_CATEGORY_LABELS_BG[cat]}
          </button>
        ))}
      </div>

      {tab === 'text' ? (
        <form onSubmit={handleTextSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Въведете или диктувайте препоръка на гръцки (π.χ. Επανέλεγχος σε 3 μήνες...)..."
              disabled={isSubmitting}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
            <div className="absolute right-2.5 bottom-2.5">
              <VoiceMicButton
                lang="el-GR"
                variant="compact"
                onTranscript={handleVoiceTranscript}
                onError={(err) => setErrorMessage(err)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              AI автоматично превежда на достъпен български за пациента
            </span>
            <button
              type="submit"
              disabled={isSubmitting || !noteText.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-xl text-xs transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Обработка...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Публикувай</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleFileSubmit} className="space-y-3">
          <PrescriptionFileDropzone
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            disabled={isSubmitting}
          />

          <textarea
            rows={2}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Допълнителни кратки указания от лекаря (по желание)..."
            disabled={isSubmitting}
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-xl text-xs transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Качване & Анализ...</span>
                </>
              ) : (
                <>
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Качи & Преведи</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Съобщения за статус */}
      {errorMessage && (
        <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
          {successMessage}
        </div>
      )}
    </div>
  )
}
