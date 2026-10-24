'use client'

import React, { useState, useMemo } from 'react'
import { useTranslation } from '@/features/i18n'
import type { DocumentCatalogItem } from '@/features/documents'
import { Search, Calendar, Tag, CheckCircle2 } from 'lucide-react'

interface DocumentsCatalogTabProps {
  documents: DocumentCatalogItem[]
  selectedDocId?: number
  onSelectDocument: (docId: number) => void
}

export const DocumentsCatalogTab: React.FC<DocumentsCatalogTabProps> = ({
  documents,
  selectedDocId,
  onSelectDocument,
}) => {
  const { t, locale } = useTranslation()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = useMemo(() => {
    const set = new Set<string>()
    documents.forEach((d) => {
      if (d.category) set.add(d.category)
    })
    return ['all', ...Array.from(set)]
  }, [documents])

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const title = locale === 'el' ? doc.titleEl : doc.titleBg
      const matchesSearch =
        !search.trim() ||
        title.toLowerCase().includes(search.toLowerCase()) ||
        doc.summaryEl.toLowerCase().includes(search.toLowerCase()) ||
        doc.docDate.includes(search) ||
        doc.keyMarkers.some((m) => m.toLowerCase().includes(search.toLowerCase()))

      const matchesCategory =
        selectedCategory === 'all' || doc.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [documents, search, selectedCategory, locale])

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Search and Filters */}
      <div className="p-3 bg-white border-b border-slate-200 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.doctor.catalog.searchPlaceholder}
            aria-label={t.doctor.catalog.searchPlaceholder}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-slate-400"
          />
        </div>

        {/* Category chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-sky-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? t.doctor.catalog.allCategories : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredDocs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {t.doctor.catalog.emptySearch}
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isSelected = doc.id === selectedDocId
            const title = locale === 'el' ? doc.titleEl : doc.titleBg

            return (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50/80 border-sky-300 shadow-xs ring-1 ring-sky-300'
                    : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{doc.docDate}</span>
                    <span className="text-slate-300">•</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px]">
                      {doc.category}
                    </span>
                  </div>
                  {doc.isVectorized && (
                    <span title="Векторизиран в RAG">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </span>
                  )}
                </div>

                <h4 className="text-xs font-semibold text-slate-900 mb-1 leading-snug line-clamp-1">
                  {title}
                </h4>

                <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2 mb-2 font-serif">
                  {doc.summaryEl}
                </p>

                {doc.keyMarkers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    {doc.keyMarkers.slice(0, 3).map((m, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 text-[10px] font-mono border border-sky-100"
                      >
                        <Tag className="w-2.5 h-2.5 text-sky-500" />
                        <span className="truncate max-w-[120px]">{m}</span>
                      </span>
                    ))}
                    {doc.keyMarkers.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        +{doc.keyMarkers.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
