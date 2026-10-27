'use client'

import React, { useEffect, useRef } from 'react'
import { useTranslation } from '@/features/i18n'
import { X, Loader2, Sparkles, Send } from 'lucide-react'
import type { CategoryPreviewItem } from '../types'

interface PublishPreviewModalProps {
  isOpen: boolean
  items: CategoryPreviewItem[] | null
  isPublishing: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export const PublishPreviewModal: React.FC<PublishPreviewModalProps> = ({
  isOpen,
  items,
  isPublishing,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) {
      dialog.showModal()
    }
  }, [])

  if (!isOpen || !items) return null

  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!isPublishing) {
      onClose()
    }
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current && !isPublishing) {
      onClose()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 m-auto z-50 p-4 max-w-2xl w-full bg-transparent backdrop:bg-slate-900/60 backdrop:backdrop-blur-xs motion-safe:animate-in motion-safe:fade-in duration-200 outline-none"
    >
      <div className="bg-white rounded-3xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <header className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-sky-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-600 text-white rounded-xl shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="preview-modal-title" className="text-sm sm:text-base font-bold text-slate-900">
                {t.doctor.guidelines.previewTitle}
              </h2>
              <p className="text-xs text-slate-500">
                {t.doctor.guidelines.previewDesc}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            aria-label={t.doctor.guidelines.cancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {items.map((cat) => (
            <article
              key={cat.category}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-sky-800 uppercase tracking-wide font-mono">
                  {cat.titleBg}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {cat.titleEl}
                </span>
              </div>

              {/* Bulgarian translation (for patient) */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">
                  🇧🇬 Текст за пациента (Български)
                </span>
                <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                  {cat.noteBg}
                </p>
              </div>

              {/* Greek approved original */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  🇬🇷 Εγκεκριμένα σημεία (Ελληνικά)
                </span>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                  {cat.noteEl}
                </p>
              </div>
            </article>
          ))}
        </div>

        {/* Footer */}
        <footer className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            {t.doctor.guidelines.cancel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isPublishing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.doctor.guidelines.sending}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{t.doctor.guidelines.confirmSend}</span>
              </>
            )}
          </button>
        </footer>
      </div>
    </dialog>
  )
}
