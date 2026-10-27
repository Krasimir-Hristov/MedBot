'use client'

import React, { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from '@/features/i18n'
import type { DocumentListItem } from '@/features/documents'
import { useUploadQueue } from '../hooks/use-upload-queue'
import { AdminHeader } from './admin-header'
import { AdminMetricsStrip } from './admin-metrics-strip'
import { DocumentsRegistryCard } from './documents-registry-card'
import { UploadDropzoneCard } from './upload-dropzone-card'

const DocumentPreviewModal = dynamic(
  () => import('./document-preview-modal').then((mod) => mod.DocumentPreviewModal),
  { ssr: false }
)

const DocumentEditModal = dynamic(
  () => import('./document-edit-modal').then((mod) => mod.DocumentEditModal),
  { ssr: false }
)

const DeleteDocumentModal = dynamic(
  () => import('./delete-document-modal').then((mod) => mod.DeleteDocumentModal),
  { ssr: false }
)

export interface AdminDashboardProps {
  initialDocuments: DocumentListItem[]
  hasLoadError?: boolean
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialDocuments,
  hasLoadError = false,
}) => {
  const { t } = useTranslation()
  const [documents, setDocuments] = useState<DocumentListItem[]>(initialDocuments)
  const [loadError, setLoadError] = useState<boolean>(hasLoadError)

  const [previewDoc, setPreviewDoc] = useState<DocumentListItem | null>(null)
  const [editingDoc, setEditingDoc] = useState<DocumentListItem | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<DocumentListItem | null>(null)

  // Самовъзстановяване (Client-side self-healing):
  // При студен старт на базата данни или временен SSR срив, клиентски опитваме да извлечем списъка
  useEffect(() => {
    if (loadError || documents.length === 0) {
      let isMounted = true
      fetch('/api/doctor/documents')
        .then((res) => (res.ok ? res.json() : null))
        .then((data: unknown) => {
          if (!isMounted) return
          if (
            typeof data === 'object' &&
            data !== null &&
            'documents' in data &&
            Array.isArray(data.documents) &&
            data.documents.length > 0
          ) {
            setDocuments(data.documents as DocumentListItem[])
            setLoadError(false)
          }
        })
        .catch(() => {})

      return () => {
        isMounted = false
      }
    }
  }, [loadError, documents.length])

  const handleDocumentCreated = useCallback((newDoc: DocumentListItem) => {
    setDocuments((previous) => {
      const filtered = previous.filter((doc) => doc.id !== newDoc.id)
      return [newDoc, ...filtered]
    })
  }, [])

  const handleDocumentSaved = useCallback((updated: DocumentListItem) => {
    setDocuments((previous) =>
      previous.map((doc) => (doc.id === updated.id ? updated : doc))
    )
    setEditingDoc(null)
  }, [])

  const handleDocumentDeleted = useCallback((id: number) => {
    setDocuments((previous) => previous.filter((doc) => doc.id !== id))
    setDeletingDoc(null)
  }, [])

  const queue = useUploadQueue({
    onDocumentCreated: handleDocumentCreated,
    existingDocuments: documents,
  })

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9ff] text-slate-900">
      <AdminHeader />

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-5 px-4 py-5 sm:px-6">
        {loadError && (
          <aside
            role="alert"
            className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold">{t.admin.loadErrorTitle}</h2>
                <p className="mt-0.5 text-xs text-amber-700">{t.admin.loadErrorDesc}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              aria-label={t.common.refresh}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              {t.common.refresh}
            </button>
          </aside>
        )}

        <AdminMetricsStrip documents={documents} />

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <UploadDropzoneCard
              items={queue.items}
              onAddFiles={queue.addFiles}
              onRetry={queue.retryItem}
              onRemove={queue.removeItem}
              onClearFinished={queue.clearFinished}
            />
          </div>

          <div className="lg:col-span-8">
            <DocumentsRegistryCard
              documents={documents}
              onPreview={setPreviewDoc}
              onEdit={setEditingDoc}
              onDelete={setDeletingDoc}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500">
        {t.common.footerCopyright}
      </footer>

      {previewDoc && (
        <DocumentPreviewModal
          key={previewDoc.id}
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {editingDoc && (
        <DocumentEditModal
          key={editingDoc.id}
          document={editingDoc}
          onClose={() => setEditingDoc(null)}
          onSaved={handleDocumentSaved}
        />
      )}

      {deletingDoc && (
        <DeleteDocumentModal
          key={deletingDoc.id}
          document={deletingDoc}
          onClose={() => setDeletingDoc(null)}
          onDeleted={handleDocumentDeleted}
        />
      )}
    </div>
  )
}
