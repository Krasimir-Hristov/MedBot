'use client'

import React, { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslation } from '@/features/i18n'
import type { DocumentListItem } from '@/features/documents'
import { deleteDocumentAction } from '../actions'
import { interpolate } from '../lib/format'
import { ModalShell } from './modal-shell'

interface DeleteDocumentModalProps {
  document: DocumentListItem
  onClose: () => void
  onDeleted: (id: number) => void
}

export const DeleteDocumentModal: React.FC<DeleteDocumentModalProps> = ({
  document,
  onClose,
  onDeleted,
}) => {
  const { t } = useTranslation()
  const d = t.admin.deleteDialog

  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleConfirm = async () => {
    setIsDeleting(true)
    setErrorMessage(null)

    try {
      const result = await deleteDocumentAction(document.id)
      if (!result.success) {
        setErrorMessage(result.error)
        return
      }
      onDeleted(document.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete document:', error)
      setErrorMessage(d.error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <ModalShell
      title={d.title}
      closeLabel={t.common.cancel}
      onClose={onClose}
      widthClass="max-w-md"
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            {interpolate(d.desc, { title: document.titleBg })}
          </p>
        </div>

        {errorMessage && (
          <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {errorMessage}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            aria-label={t.common.cancel}
            className="h-9 cursor-pointer rounded-md border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleConfirm}
            aria-label={d.confirm}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-rose-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
          >
            {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {isDeleting ? d.deleting : d.confirm}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
