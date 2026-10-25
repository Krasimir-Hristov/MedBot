'use client'

import React from 'react'
import type { DocumentCatalogItem } from '@/features/documents'
import { DocumentViewer } from './document-viewer'
import { X } from 'lucide-react'

interface MobileDocumentSheetProps {
  isOpen: boolean
  document: DocumentCatalogItem | null
  onClose: () => void
}

export const MobileDocumentSheet: React.FC<MobileDocumentSheetProps> = ({
  isOpen,
  document,
  onClose,
}) => {
  if (!isOpen || !document) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Преглед на документ"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-t-2xl h-[88vh] w-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="h-10 px-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
            Преглед на медицински скан
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Затвори прегледа"
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewer */}
        <div className="flex-1 overflow-hidden">
          <DocumentViewer key={document.id} document={document} />
        </div>
      </div>
    </div>
  )
}
