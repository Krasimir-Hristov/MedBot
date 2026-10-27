'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  Loader2,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useTranslation } from '@/features/i18n'
import type { DocumentDetailItem, DocumentListItem } from '@/features/documents'
import { getDocumentDetailAction } from '../actions'
import { CATEGORY_BADGE_STYLES, getCategoryKey } from '../constants'
import { ModalShell } from './modal-shell'

interface DocumentPreviewModalProps {
  document: DocumentListItem
  onClose: () => void
}

type DetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: DocumentDetailItem }

const MIN_ZOOM = 50
const MAX_ZOOM = 250
const ZOOM_STEP = 25

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  onClose,
}) => {
  const { t, locale } = useTranslation()
  const p = t.admin.preview
  const isGreek = locale === 'el'
  const primaryTitle = isGreek ? document.titleEl : document.titleBg
  const secondaryTitle = isGreek ? document.titleBg : document.titleEl

  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [detailState, setDetailState] = useState<DetailState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    const loadDetail = async () => {
      try {
        const result = await getDocumentDetailAction(document.id)
        if (cancelled) {
          return
        }
        if (result.success) {
          setDetailState({ status: 'ready', data: result.data })
        } else {
          setDetailState({ status: 'error', message: result.error })
        }
      } catch (error) {
        console.error('Failed to load document detail:', error)
        if (!cancelled) {
          setDetailState({ status: 'error', message: p.loadError })
        }
      }
    }

    void loadDetail()
    return () => {
      cancelled = true
    }
  }, [document.id, p.loadError])

  const catKey = getCategoryKey(document.category)
  const isPdf = document.mimeType === 'application/pdf'
  const imageUrl = `/api/doc/${document.id}`

  return (
    <ModalShell
      title={`${p.title} — ${primaryTitle}`}
      closeLabel={p.close}
      onClose={onClose}
      widthClass="max-w-5xl"
    >
      <div className="grid grid-cols-1 divide-y divide-slate-200 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
        {/* Лява колона: Скан с мащабиране и ротация или вграден PDF преглед */}
        <div className="flex flex-col bg-slate-900/95 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2 text-slate-200">
            {isPdf ? (
              <span className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-clinical-mono text-xs font-semibold text-rose-300">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                PDF
              </span>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={zoom <= MIN_ZOOM}
                  onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
                  aria-label={p.zoomOut}
                  className="cursor-pointer rounded p-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-40"
                >
                  <ZoomOut className="h-4 w-4" aria-hidden="true" />
                </button>
                <span
                  aria-label={p.zoomLevel}
                  className="min-w-12 text-center font-clinical-mono text-xs text-slate-300"
                >
                  {zoom}%
                </span>
                <button
                  type="button"
                  disabled={zoom >= MAX_ZOOM}
                  onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
                  aria-label={p.zoomIn}
                  className="cursor-pointer rounded p-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-40"
                >
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((deg) => (deg + 90) % 360)}
                  aria-label={p.rotate}
                  className="ml-1 cursor-pointer rounded p-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}

            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={p.openNew}
              className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-sky-300 transition-colors hover:bg-slate-700 hover:text-white"
            >
              {p.openNew}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>

          <div className="flex max-h-[68vh] min-h-[360px] items-start justify-center overflow-auto p-4">
            {isPdf ? (
              <object
                data={imageUrl}
                type="application/pdf"
                aria-label={`${p.imageAlt}: ${primaryTitle}`}
                className="h-[64vh] min-h-[360px] w-full rounded bg-white shadow-lg"
              >
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="text-xs text-slate-600">{p.pdfFallback}</p>
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={p.openNew}
                    className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-700"
                  >
                    {p.openNew}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </object>
            ) : (
              <Image
                src={imageUrl}
                alt={`${p.imageAlt}: ${primaryTitle}`}
                width={1200}
                height={1600}
                unoptimized
                style={{
                  width: `${zoom}%`,
                  height: 'auto',
                  transform: `rotate(${rotation}deg)`,
                }}
                className="max-w-none rounded bg-white shadow-lg transition-transform duration-150"
              />
            )}
          </div>
        </div>

        {/* Дясна колона: Клинични данни, гръцко резюме и OCR текст */}
        <div className="flex max-h-[74vh] flex-col gap-4 overflow-y-auto bg-white p-4 lg:col-span-5">
          <div className="flex flex-col gap-1 border-b border-slate-200 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${CATEGORY_BADGE_STYLES[catKey]}`}
              >
                {t.admin.categories[catKey]}
              </span>
              <span className="font-clinical-mono text-xs text-slate-500">{document.docDate}</span>
            </div>
            <h3 className="mt-1 text-sm font-bold text-slate-900">{primaryTitle}</h3>
            <p className="text-xs italic text-slate-500">{secondaryTitle}</p>
          </div>

          {detailState.status === 'loading' && (
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-sky-600" aria-hidden="true" />
              {p.loading}
            </div>
          )}

          {detailState.status === 'error' && (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {detailState.message || p.loadError}
            </div>
          )}

          {detailState.status === 'ready' && (
            <>
              {detailState.data.criticalAlerts.length > 0 && (
                <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
                  <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-rose-800">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    {p.alerts}
                  </h4>
                  <ul className="list-inside list-disc space-y-0.5 text-xs text-rose-700">
                    {detailState.data.criticalAlerts.map((alert, idx) => (
                      <li key={`${alert}-${idx}`}>{alert}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                <h4 className="mb-2 font-clinical-mono text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                  {p.details}
                </h4>
                <dl className="grid grid-cols-1 gap-1.5">
                  {detailState.data.hospital && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">{p.hospital}:</dt>
                      <dd className="text-right font-medium text-slate-900">
                        {detailState.data.hospital}
                      </dd>
                    </div>
                  )}
                  {detailState.data.doctor && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">{p.doctor}:</dt>
                      <dd className="text-right font-medium text-slate-900">
                        {detailState.data.doctor}
                      </dd>
                    </div>
                  )}
                  {detailState.data.staging && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">{p.staging}:</dt>
                      <dd className="text-right font-clinical-mono font-semibold text-sky-700">
                        {detailState.data.staging}
                      </dd>
                    </div>
                  )}
                  {detailState.data.keyMarkers.length > 0 && (
                    <div className="pt-1">
                      <dt className="mb-1 text-slate-500">{p.markers}:</dt>
                      <dd className="flex flex-wrap gap-1">
                        {detailState.data.keyMarkers.map((marker, idx) => (
                          <span
                            key={`${marker}-${idx}`}
                            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-clinical-mono text-[11px] text-slate-700"
                          >
                            {marker}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h4 className="mb-1 font-clinical-mono text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                  {p.summary}
                </h4>
                <p className="rounded-md border border-sky-100 bg-sky-50/50 p-3 text-xs leading-relaxed text-slate-800">
                  {detailState.data.summaryEl}
                </p>
              </div>

              <div>
                <h4 className="mb-1 font-clinical-mono text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                  {p.ocrText}
                </h4>
                <pre className="max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-clinical-mono text-[11px] leading-relaxed whitespace-pre-wrap text-slate-700">
                  {detailState.data.extractedText}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalShell>
  )
}
