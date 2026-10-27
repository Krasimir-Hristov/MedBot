'use client'

import React, { useRef, useState } from 'react'
import { CloudUpload, ListChecks } from 'lucide-react'
import { useTranslation } from '@/features/i18n'
import { ACCEPTED_FILE_INPUT } from '../constants'
import { interpolate } from '../lib/format'
import type { UploadQueueItem } from '../types'
import { UploadQueueList } from './upload-queue-list'

interface UploadDropzoneCardProps {
  items: UploadQueueItem[]
  onAddFiles: (files: File[]) => void
  onRetry: (id: string) => void
  onRemove: (id: string) => void
  onClearFinished: () => void
}

export const UploadDropzoneCard: React.FC<UploadDropzoneCardProps> = ({
  items,
  onAddFiles,
  onRetry,
  onRemove,
  onClearFinished,
}) => {
  const { t } = useTranslation()
  const u = t.admin.upload
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const hasFinished = items.some((item) => item.stage === 'done' || item.stage === 'error')

  const handleFiles = (fileList: FileList | null) => {
    if (fileList && fileList.length > 0) {
      onAddFiles(Array.from(fileList))
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  return (
    <section
      aria-label={u.title}
      className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4"
    >
      <header className="border-b border-slate-200 pb-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <CloudUpload className="h-5 w-5 text-sky-600" aria-hidden="true" />
          {u.title}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">{u.subtitle}</p>
      </header>

      <div
        role="button"
        tabIndex={0}
        aria-label={u.dropAria}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`group flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed p-6 text-center transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 ${
          isDragging
            ? 'border-sky-500 bg-sky-50'
            : 'border-slate-300 bg-slate-50/60 hover:border-sky-500 hover:bg-sky-50/60'
        }`}
      >
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-sky-600 shadow-xs transition-transform group-hover:scale-105">
          <CloudUpload className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-slate-900">{u.dropTitle}</p>
        <p className="mt-1 text-xs text-slate-500">{u.dropHint}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          <span className="rounded border border-slate-200 bg-white px-2 py-0.5 font-clinical-mono text-[10px] text-slate-500">
            {u.badgeCompress}
          </span>
          <span className="rounded border border-slate-200 bg-white px-2 py-0.5 font-clinical-mono text-[10px] text-sky-700">
            {u.badgeFormats}
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_INPUT}
          aria-label={u.dropAria}
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            <ListChecks className="h-4 w-4 text-cyan-600" aria-hidden="true" />
            {u.queueTitle}
          </h3>
          <div className="flex items-center gap-2">
            <span className="font-clinical-mono text-[10px] text-slate-500">
              {interpolate(u.queueCount, { count: items.length })}
            </span>
            {hasFinished && (
              <button
                type="button"
                onClick={onClearFinished}
                aria-label={u.clearDone}
                className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] font-semibold text-sky-700 transition-colors hover:bg-sky-50"
              >
                {u.clearDone}
              </button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500">
            {u.queueEmpty}
          </p>
        ) : (
          <UploadQueueList items={items} onRetry={onRetry} onRemove={onRemove} />
        )}
      </div>

      <aside className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <h3 className="mb-1.5 text-xs font-semibold text-sky-700">{u.howTitle}</h3>
        <ol className="list-inside list-decimal space-y-1 text-xs text-slate-600">
          <li>{u.howStep1}</li>
          <li>{u.howStep2}</li>
          <li>{u.howStep3}</li>
        </ol>
      </aside>
    </section>
  )
}
