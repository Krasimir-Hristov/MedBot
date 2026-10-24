'use client'

import React, { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from '@/features/i18n'
import type { DocumentCategory, DocumentListItem } from '@/features/documents'
import { updateDocumentAction } from '../actions'
import { DOCUMENT_CATEGORIES, getCategoryKey } from '../constants'
import { normalizeCategory } from '../lib/normalize'
import { ModalShell } from './modal-shell'

interface DocumentEditModalProps {
  document: DocumentListItem
  onClose: () => void
  onSaved: (updated: DocumentListItem) => void
}

export const DocumentEditModal: React.FC<DocumentEditModalProps> = ({
  document,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation()
  const e = t.admin.edit

  const [titleBg, setTitleBg] = useState(document.titleBg)
  const [titleEl, setTitleEl] = useState(document.titleEl)
  const [docDate, setDocDate] = useState(document.docDate)
  const [category, setCategory] = useState<DocumentCategory>(normalizeCategory(document.category))
  const [summaryEl, setSummaryEl] = useState(document.summaryEl)
  const [markersInput, setMarkersInput] = useState(document.keyMarkers.join(', '))
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setErrorMessage(null)

    try {
      const keyMarkers = markersInput
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)

      const result = await updateDocumentAction({
        id: document.id,
        titleBg,
        titleEl,
        docDate,
        category,
        summaryEl,
        keyMarkers,
      })

      if (!result.success) {
        setErrorMessage(result.error)
        return
      }

      onSaved(result.data)
      onClose()
    } catch (error) {
      console.error('Failed to save document metadata:', error)
      setErrorMessage(e.error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ModalShell title={e.title} closeLabel={e.close} onClose={onClose} widthClass="max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
            <span>{e.fieldTitleBg}</span>
            <input
              type="text"
              required
              value={titleBg}
              onChange={(ev) => setTitleBg(ev.target.value)}
              aria-label={e.fieldTitleBg}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 focus:border-sky-500 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
            <span>{e.fieldTitleEl}</span>
            <input
              type="text"
              required
              value={titleEl}
              onChange={(ev) => setTitleEl(ev.target.value)}
              aria-label={e.fieldTitleEl}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 focus:border-sky-500 focus:outline-none"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
            <span>{e.fieldDate}</span>
            <input
              type="date"
              required
              value={docDate}
              onChange={(ev) => setDocDate(ev.target.value)}
              aria-label={e.fieldDate}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 font-clinical-mono text-sm font-normal text-slate-900 focus:border-sky-500 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
            <span>{e.fieldCategory}</span>
            <select
              value={category}
              onChange={(ev) => setCategory(normalizeCategory(ev.target.value))}
              aria-label={e.fieldCategory}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 focus:border-sky-500 focus:outline-none"
            >
              {DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t.admin.categories[getCategoryKey(cat)]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
          <div className="flex items-center justify-between">
            <span>{e.fieldMarkers}</span>
            <span className="font-normal text-slate-400">{e.markersHint}</span>
          </div>
          <input
            type="text"
            value={markersInput}
            onChange={(ev) => setMarkersInput(ev.target.value)}
            aria-label={e.fieldMarkers}
            placeholder="ER 95%, PR 80%, HER2 0, Ki-67 18%"
            className="h-9 rounded-md border border-slate-200 bg-white px-3 font-clinical-mono text-xs font-normal text-slate-900 focus:border-sky-500 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
          <span>{e.fieldSummary}</span>
          <textarea
            rows={4}
            required
            value={summaryEl}
            onChange={(ev) => setSummaryEl(ev.target.value)}
            aria-label={e.fieldSummary}
            className="rounded-md border border-slate-200 bg-white p-3 text-xs leading-relaxed font-normal text-slate-900 focus:border-sky-500 focus:outline-none"
          />
        </label>

        <div className="flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs text-sky-800">
          <Sparkles className="h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
          <span>{e.note}</span>
        </div>

        {errorMessage && (
          <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {errorMessage}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            aria-label={t.common.cancel}
            className="h-9 cursor-pointer rounded-md border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            aria-label={e.save}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-sky-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {isSaving ? e.saving : e.save}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
