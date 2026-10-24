'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { useTranslation } from '@/features/i18n'
import type { DocumentCatalogItem } from '@/features/documents'
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  FileText,
} from 'lucide-react'

interface DocumentViewerProps {
  document: DocumentCatalogItem | null
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ document }) => {
  const { t, locale } = useTranslation()
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })

  if (!document) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/50">
        <FileText className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-xs sm:text-sm max-w-xs">{t.doctor.viewer.noDocumentSelected}</p>
      </div>
    )
  }

  const docTitle = locale === 'el' ? document.titleEl : document.titleBg
  const isPdf = document.mimeType === 'application/pdf'
  const docUrl = `/api/doc/${document.id}`

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5))
  const handleReset = () => {
    setScale(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPdf) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden select-none">
      {/* Top control bar */}
      <div className="h-11 px-3 sm:px-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 text-xs">
        <div className="truncate mr-2">
          <span className="font-semibold text-slate-900 font-mono truncate">{docTitle}</span>
          <span className="text-[10px] text-slate-400 ml-2 font-mono">({document.docDate})</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isPdf && (
            <>
              <button
                type="button"
                onClick={handleZoomOut}
                title={t.doctor.viewer.zoomOut}
                aria-label={t.doctor.viewer.zoomOut}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleReset}
                title={t.doctor.viewer.resetZoom}
                aria-label={t.doctor.viewer.resetZoom}
                className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-[10px] text-slate-700 hover:bg-slate-200 transition-colors"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                title={t.doctor.viewer.zoomIn}
                aria-label={t.doctor.viewer.zoomIn}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleRotate}
                title={t.doctor.viewer.rotate}
                aria-label={t.doctor.viewer.rotate}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={t.doctor.viewer.openFull}
            aria-label={t.doctor.viewer.openFull}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors ml-1"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Center canvas */}
      <div
        className="flex-1 overflow-hidden relative flex items-center justify-center p-4 bg-slate-200/50 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isPdf ? (
          <object
            data={docUrl}
            type="application/pdf"
            className="w-full h-full rounded-lg shadow-md border border-slate-300"
          >
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <p className="text-xs text-slate-600 mb-2">
                Браузърът не може да зареди PDF вградено.
              </p>
              <a
                href={docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-sky-700 underline"
              >
                Отвори PDF в нов таб
              </a>
            </div>
          </object>
        ) : (
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
            className="relative max-w-full max-h-full flex items-center justify-center shadow-lg rounded-lg bg-white overflow-hidden"
          >
            <Image
              src={docUrl}
              alt={docTitle}
              width={1200}
              height={1600}
              unoptimized
              className="max-h-[75vh] w-auto object-contain rounded"
              draggable={false}
              priority
            />
          </div>
        )}
      </div>
    </div>
  )
}
