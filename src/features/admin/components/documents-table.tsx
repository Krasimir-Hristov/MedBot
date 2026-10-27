'use client'

import React from 'react'
import { AlertCircle, CheckCircle2, Eye, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from '@/features/i18n'
import type { DocumentListItem } from '@/features/documents'
import { CATEGORY_BADGE_STYLES, getCategoryKey } from '../constants'

interface DocumentsTableProps {
  documents: DocumentListItem[]
  onPreview: (doc: DocumentListItem) => void
  onEdit: (doc: DocumentListItem) => void
  onDelete: (doc: DocumentListItem) => void
}

const MAX_VISIBLE_MARKERS = 3

export const DocumentsTable: React.FC<DocumentsTableProps> = ({
  documents,
  onPreview,
  onEdit,
  onDelete,
}) => {
  const { t, locale } = useTranslation()
  const r = t.admin.registry
  const isGreek = locale === 'el'

  const renderMarkers = (markers: string[]) => {
    if (markers.length === 0) {
      return <span className="font-clinical-mono text-xs text-slate-400">—</span>
    }

    const visible = markers.slice(0, MAX_VISIBLE_MARKERS)
    const remaining = markers.length - visible.length

    return (
      <div className="flex flex-wrap items-center gap-1">
        {visible.map((marker, idx) => (
          <span
            key={`${marker}-${idx}`}
            className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-clinical-mono text-[11px] text-slate-700"
          >
            {marker}
          </span>
        ))}
        {remaining > 0 && (
          <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 font-clinical-mono text-[10px] font-semibold text-sky-700">
            +{remaining}
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Desktop таблица */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-y border-slate-200 bg-slate-50/80 font-clinical-mono text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              <th scope="col" className="px-4 py-2.5">
                {r.colDate}
              </th>
              <th scope="col" className="px-4 py-2.5">
                {r.colDocument}
              </th>
              <th scope="col" className="px-4 py-2.5">
                {r.colCategory}
              </th>
              <th scope="col" className="px-4 py-2.5">
                {r.colMarkers}
              </th>
              <th scope="col" className="px-4 py-2.5">
                {r.colStatus}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                {r.colActions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {documents.map((doc) => {
              const catKey = getCategoryKey(doc.category)
              const catLabel = t.admin.categories[catKey]
              const primaryTitle = isGreek ? doc.titleEl : doc.titleBg
              const secondaryTitle = isGreek ? doc.titleBg : doc.titleEl

              return (
                <tr key={doc.id} className="group transition-colors hover:bg-sky-50/40">
                  <td className="px-4 py-3 align-top font-clinical-mono text-xs whitespace-nowrap text-slate-600">
                    {doc.docDate}
                  </td>
                  <td className="max-w-xs px-4 py-3 align-top">
                    <button
                      type="button"
                      onClick={() => onPreview(doc)}
                      aria-label={`${r.preview}: ${primaryTitle}`}
                      className="flex cursor-pointer flex-col text-left focus-visible:outline-2 focus-visible:outline-sky-600"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="line-clamp-1 font-semibold text-slate-900 transition-colors group-hover:text-sky-700">
                          {primaryTitle}
                        </span>
                        {doc.mimeType === 'application/pdf' && (
                          <span className="shrink-0 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 font-clinical-mono text-[9px] font-bold text-rose-700">
                            PDF
                          </span>
                        )}
                      </span>
                      <span className="line-clamp-1 text-xs italic text-slate-500">{secondaryTitle}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3 align-top whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${CATEGORY_BADGE_STYLES[catKey]}`}
                    >
                      {catLabel}
                    </span>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 align-top">{renderMarkers(doc.keyMarkers)}</td>
                  <td className="px-4 py-3 align-top whitespace-nowrap">
                    {doc.isVectorized ? (
                      <span
                        title={r.vectorized}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-clinical-mono text-[10px] font-semibold text-emerald-700"
                      >
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        1536d
                      </span>
                    ) : (
                      <span
                        title={r.notVectorized}
                        className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 font-clinical-mono text-[10px] font-semibold text-amber-700"
                      >
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        {r.notVectorized}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onPreview(doc)}
                        aria-label={`${r.preview}: ${primaryTitle}`}
                        title={r.preview}
                        className="cursor-pointer rounded-md p-1.5 text-slate-500 transition-colors hover:bg-sky-50 hover:text-sky-700"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(doc)}
                        aria-label={`${r.edit}: ${primaryTitle}`}
                        title={r.edit}
                        className="cursor-pointer rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(doc)}
                        aria-label={`${r.remove}: ${primaryTitle}`}
                        title={r.remove}
                        className="cursor-pointer rounded-md p-1.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Мобилен списък от карти */}
      <div className="divide-y divide-slate-200 md:hidden">
        {documents.map((doc) => {
          const catKey = getCategoryKey(doc.category)
          const catLabel = t.admin.categories[catKey]
          const primaryTitle = isGreek ? doc.titleEl : doc.titleBg
          const secondaryTitle = isGreek ? doc.titleBg : doc.titleEl

          return (
            <article key={doc.id} className="flex flex-col gap-2.5 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-clinical-mono text-xs text-slate-500">{doc.docDate}</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${CATEGORY_BADGE_STYLES[catKey]}`}
                  >
                    {catLabel}
                  </span>
                  <span
                    title={doc.isVectorized ? r.vectorized : r.notVectorized}
                    className={`h-2 w-2 rounded-full ${doc.isVectorized ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    aria-hidden="true"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => onPreview(doc)}
                aria-label={`${r.preview}: ${primaryTitle}`}
                className="flex cursor-pointer flex-col text-left"
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-900">{primaryTitle}</span>
                  {doc.mimeType === 'application/pdf' && (
                    <span className="shrink-0 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 font-clinical-mono text-[9px] font-bold text-rose-700">
                      PDF
                    </span>
                  )}
                </span>
                <span className="text-xs italic text-slate-500">{secondaryTitle}</span>
              </button>

              {doc.keyMarkers.length > 0 && <div>{renderMarkers(doc.keyMarkers)}</div>}

              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => onPreview(doc)}
                  aria-label={`${r.preview}: ${primaryTitle}`}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  {r.preview}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(doc)}
                  aria-label={`${r.edit}: ${primaryTitle}`}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  {r.edit}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(doc)}
                  aria-label={`${r.remove}: ${primaryTitle}`}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
