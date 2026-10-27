'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DocumentListItem } from '@/features/documents'
import { classifyUploadFile, UPLOAD_LIMITS } from '../constants'
import { prepareMedicalUploadFile } from '../lib/compress-image'
import {
  isUploadApiResponse,
  type UploadErrorCode,
  type UploadQueueItem,
} from '../types'

interface UseUploadQueueOptions {
  onDocumentCreated: (document: DocumentListItem) => void
}

interface UseUploadQueueResult {
  items: UploadQueueItem[]
  addFiles: (files: File[]) => void
  retryItem: (id: string) => void
  removeItem: (id: string) => void
  clearFinished: () => void
}

/**
 * Опашка за качване с контролирана паралелност (`UPLOAD_LIMITS.maxConcurrent`):
 * компресия/подготовка в браузъра -> POST към `/api/admin/upload` (OCR + вектор + запис).
 */
export const useUploadQueue = ({ onDocumentCreated }: UseUploadQueueOptions): UseUploadQueueResult => {
  const [items, setItems] = useState<UploadQueueItem[]>([])

  const filesRef = useRef<Map<string, File>>(new Map())
  const pendingRef = useRef<string[]>([])
  const activeRef = useRef(0)
  const onCreatedRef = useRef(onDocumentCreated)
  const pumpRef = useRef<() => void>(() => {})

  useEffect(() => {
    onCreatedRef.current = onDocumentCreated
  }, [onDocumentCreated])

  const patchItem = useCallback((id: string, patch: Partial<UploadQueueItem>) => {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const failItem = useCallback(
    (id: string, errorCode: UploadErrorCode, errorMessage?: string) => {
      patchItem(id, { stage: 'error', errorCode, errorMessage })
    },
    [patchItem]
  )

  const processFile = useCallback(
    async (id: string, file: File): Promise<void> => {
      patchItem(id, { stage: 'compressing', progress: 0, errorCode: undefined, errorMessage: undefined })

      let dataUrl: string
      try {
        const prepared = await prepareMedicalUploadFile(file, (progress) =>
          patchItem(id, { progress: Math.round(progress) })
        )
        dataUrl = prepared.dataUrl
        patchItem(id, {
          stage: 'analyzing',
          progress: 100,
          compressedSize: prepared.compressedSizeBytes,
        })
      } catch (error) {
        console.error('File preparation/compression failed:', error)
        failItem(id, 'compress')
        return
      }

      try {
        const response = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, fileBase64: dataUrl }),
        })

        const json: unknown = await response.json().catch(() => null)

        if (isUploadApiResponse(json) && json.success) {
          patchItem(id, { stage: 'done', documentId: json.document.id })
          filesRef.current.delete(id)
          onCreatedRef.current(json.document)
          return
        }

        const serverError = isUploadApiResponse(json) && !json.success ? json.error : undefined
        if (response.status === 413 && !serverError) {
          failItem(id, 'too_large_pdf')
          return
        }

        failItem(id, 'server', serverError)
      } catch (error) {
        console.error('Upload request failed:', error)
        failItem(id, 'network')
      }
    },
    [patchItem, failItem]
  )

  const pump = useCallback(() => {
    while (activeRef.current < UPLOAD_LIMITS.maxConcurrent && pendingRef.current.length > 0) {
      const id = pendingRef.current.shift()
      const file = id ? filesRef.current.get(id) : undefined
      if (!id || !file) {
        continue
      }

      activeRef.current += 1
      void processFile(id, file).finally(() => {
        activeRef.current -= 1
        pumpRef.current()
      })
    }
  }, [processFile])

  useEffect(() => {
    pumpRef.current = pump
  }, [pump])

  const addFiles = useCallback(
    (files: File[]) => {
      const accepted = files.slice(0, UPLOAD_LIMITS.maxFiles)
      const overflow = files.length - accepted.length

      const newItems: UploadQueueItem[] = accepted.map((file) => {
        const id = crypto.randomUUID()
        const base: UploadQueueItem = {
          id,
          fileName: file.name,
          originalSize: file.size,
          stage: 'queued',
          progress: 0,
        }

        const kind = classifyUploadFile(file)
        if (!kind) {
          return { ...base, stage: 'error', errorCode: 'unsupported' }
        }
        if (kind === 'pdf' && file.size > UPLOAD_LIMITS.maxPdfBytes) {
          return { ...base, stage: 'error', errorCode: 'too_large_pdf' }
        }
        if (kind === 'image' && file.size > UPLOAD_LIMITS.maxFileBytes) {
          return { ...base, stage: 'error', errorCode: 'too_large' }
        }

        filesRef.current.set(id, file)
        pendingRef.current.push(id)
        return base
      })

      if (overflow > 0) {
        newItems.push({
          id: crypto.randomUUID(),
          fileName: `+${overflow}`,
          originalSize: 0,
          stage: 'error',
          progress: 0,
          errorCode: 'too_many',
        })
      }

      setItems((previous) => [...newItems, ...previous])
      pump()
    },
    [pump]
  )

  const retryItem = useCallback(
    (id: string) => {
      if (!filesRef.current.has(id)) {
        return
      }
      patchItem(id, { stage: 'queued', progress: 0, errorCode: undefined, errorMessage: undefined })
      pendingRef.current.push(id)
      pump()
    },
    [patchItem, pump]
  )

  const removeItem = useCallback((id: string) => {
    filesRef.current.delete(id)
    pendingRef.current = pendingRef.current.filter((pendingId) => pendingId !== id)
    setItems((previous) => previous.filter((item) => item.id !== id))
  }, [])

  const clearFinished = useCallback(() => {
    setItems((previous) => {
      previous
        .filter((item) => item.stage === 'done' || item.stage === 'error')
        .forEach((item) => filesRef.current.delete(item.id))
      return previous.filter((item) => item.stage !== 'done' && item.stage !== 'error')
    })
  }, [])

  return { items, addFiles, retryItem, removeItem, clearFinished }
}
