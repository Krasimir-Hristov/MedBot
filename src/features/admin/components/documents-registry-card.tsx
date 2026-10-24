'use client'

import React, { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileStack,
  Search,
  X,
} from 'lucide-react'
import { useTranslation } from '@/features/i18n'
import type { DocumentListItem } from '@/features/documents'
import { DOCUMENTS_PAGE_SIZE, getCategoryKey, type CategoryKey } from '../constants'
import { interpolate } from '../lib/format'
import { DocumentsTable } from './documents-table'

interface DocumentsRegistryCardProps {
  documents: DocumentListItem[]
  onPreview: (doc: DocumentListItem) => void
  onEdit: (doc: DocumentListItem) => void
  onDelete: (doc: DocumentListItem) => void
}

type FilterKey = 'all' | CategoryKey

const FILTER_KEYS: readonly FilterKey[] = [
  'all',
  'histology',
  'imaging',
  'markers',
  'epicrisis',
  'laboratory',
  'other',
]

export const DocumentsRegistryCard: React.FC<DocumentsRegistryCardProps> = ({
  documents,
  onPreview,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation()
  const r = t.admin.registry

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<FilterKey>('all')
  const [page, setPage] = useState(1)

  const categoryCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = {
      all: documents.length,
      histology: 0,
      imaging: 0,
      markers: 0,
      epicrisis: 0,
      laboratory: 0,
      other: 0,
    }
    for (const doc of documents) {
      counts[getCategoryKey(doc.category)] += 1
    }
    return counts
  }, [documents])

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return documents.filter((doc) => {
      if (activeCategory !== 'all' && getCategoryKey(doc.category) !== activeCategory) {
        return false
      }
      if (!query) {
        return true
      }
      const haystack = [
        doc.titleBg,
        doc.titleEl,
        doc.docDate,
        doc.category,
        doc.summaryEl,
        ...doc.keyMarkers,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [documents, activeCategory, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filtered.length / DOCUMENTS_PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * DOCUMENTS_PAGE_SIZE
  const paginated = filtered.slice(startIndex, startIndex + DOCUMENTS_PAGE_SIZE)

  const handleExportJson = () => {
    const exportPayload = JSON.stringify(documents, null, 2)
    const blob = new Blob([exportPayload], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `medscan-documents-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section
      aria-label={r.title}
      className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white"
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-sky-600" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-900">{r.title}</h2>
          <span className="font-clinical-mono text-xs text-slate-500">
            {interpolate(r.count, { count: documents.length })}
          </span>
        </div>

        <button
          type="button"
          onClick={handleExportJson}
          disabled={documents.length === 0}
          aria-label={r.exportAria}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
          {r.exportJson}
        </button>
      </header>

      {/* Toolbar: Search + Category Pills */}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setPage(1)
            }}
            placeholder={r.searchPlaceholder}
            aria-label={r.searchAria}
            className="h-9 w-full rounded-md border border-slate-200 bg-white pr-9 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setPage(1)
              }}
              aria-label={t.common.cancel}
              className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <nav aria-label={r.filterAria} className="flex flex-wrap items-center gap-1.5">
          {FILTER_KEYS.map((key) => {
            const isActive = activeCategory === key
            const label = key === 'all' ? r.filterAll : t.admin.categories[key]
            const count = categoryCounts[key]

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveCategory(key)
                  setPage(1)
                }}
                aria-label={`${label} (${count})`}
                aria-pressed={isActive}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-sky-600 bg-sky-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`rounded px-1 font-clinical-mono text-[10px] ${
                    isActive ? 'bg-sky-700 text-sky-100' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sky-600">
            <FileStack className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">{r.emptyTitle}</h3>
          <p className="max-w-md text-xs text-slate-500">{r.emptyDesc}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-slate-500">{r.noResults}</div>
      ) : (
        <DocumentsTable
          documents={paginated}
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}

      {/* Pagination Footer */}
      {filtered.length > 0 && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-600">
          <span>
            {interpolate(r.showing, {
              from: startIndex + 1,
              to: Math.min(startIndex + DOCUMENTS_PAGE_SIZE, filtered.length),
              total: filtered.length,
            })}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label={r.prev}
              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded border border-slate-200 bg-white px-2 font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {r.prev}
            </button>
            <span className="px-2 font-clinical-mono text-[11px] text-slate-600">
              {interpolate(r.pageLabel, { page: safePage })} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              aria-label={r.next}
              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded border border-slate-200 bg-white px-2 font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {r.next}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </footer>
      )}
    </section>
  )
}
