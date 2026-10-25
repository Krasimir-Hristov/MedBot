'use client'

import React, { useState, useRef } from 'react'
import { useTranslation } from '@/features/i18n'
import { compressAndPrepareFile } from '@/features/documents/lib/compression'
import type { DocumentCatalogItem } from '@/features/documents'
import { CloudUpload, Loader2, CheckCircle2 } from 'lucide-react'

interface QuickUploadDropzoneProps {
  onUploadSuccess: (doc: DocumentCatalogItem, patientNoteCreated?: boolean) => void
}

export const QuickUploadDropzone: React.FC<QuickUploadDropzoneProps> = ({
  onUploadSuccess,
}) => {
  const { t } = useTranslation()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || isUploading) return
    const file = files[0]
    if (!file) return

    try {
      setIsUploading(true)
      setSuccessNotice(false)
      setUploadStatus('Компресиране на файла...')

      const prepared = await compressAndPrepareFile(file)

      setUploadStatus('AI OCR, Векторизация и Превод (Gemini + DeepSeek)...')

      const response = await fetch('/api/doctor/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: prepared.fileBase64,
          mimeType: prepared.mimeType,
          fileName: prepared.fileName,
          autoCreatePatientNote: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Неуспешна обработка на документа.')
      }

      const data = await response.json()
      if (data.success && data.document) {
        onUploadSuccess(data.document, data.patientNoteCreated)
        setSuccessNotice(true)
        setTimeout(() => setSuccessNotice(false), 4000)
      }
    } catch (err) {
      console.error('Upload failed:', err)
      alert(err instanceof Error ? err.message : 'Грешка при качване на документа.')
    } finally {
      setIsUploading(false)
      setUploadStatus(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div
        role="button"
        tabIndex={0}
        aria-label={t.doctor.upload.dropTitle}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isUploading) {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border border-dashed rounded-xl p-3 transition-colors text-center cursor-pointer flex flex-col items-center justify-center ${
          isDragging
            ? 'bg-sky-50 border-sky-400'
            : isUploading
            ? 'bg-slate-50 border-slate-300 cursor-wait'
            : successNotice
            ? 'bg-emerald-50 border-emerald-300'
            : 'bg-slate-50 hover:bg-slate-100 border-slate-300'
        }`}
      >
        {isUploading ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-800">
            <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
            <span>{uploadStatus || t.doctor.upload.uploading}</span>
          </div>
        ) : successNotice ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{t.doctor.upload.success}</span>
          </div>
        ) : (
          <>
            <CloudUpload className="w-4 h-4 text-sky-700 mb-1" />
            <span className="text-xs font-medium text-slate-800 line-clamp-1">
              {t.doctor.upload.dropTitle}
            </span>
            <span className="text-[11px] text-slate-600 mt-0.5">
              {t.doctor.upload.dropSubtitle}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
