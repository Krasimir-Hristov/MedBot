'use client'

import { useCallback, useState } from 'react'
import type { CategoryPreviewItem, PatientGuidelineItemEntity } from '../types'
import type { GuidelineCategory, GuidelineStatus } from '../constants'
import {
  addManualGuidelineAction,
  deleteGuidelineAction,
  updateGuidelineAction,
} from '../actions'

interface UseGuidelinesBoardArgs {
  initialItems: PatientGuidelineItemEntity[]
  errorMessage: string
  onPublishedSuccess?: () => void
}

export const useGuidelinesBoard = ({
  initialItems,
  errorMessage,
  onPublishedSuccess,
}: UseGuidelinesBoardArgs) => {
  const [items, setItems] = useState<PatientGuidelineItemEntity[]>(initialItems)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPreparingPreview, setIsPreparingPreview] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [previewItems, setPreviewItems] = useState<CategoryPreviewItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccessMessage(null)
  }, [])

  const generateAi = useCallback(async () => {
    if (isGenerating) return
    setIsGenerating(true)
    clearMessages()
    try {
      const res = await fetch('/api/doctor/guidelines/generate', { method: 'POST' })
      const data: unknown = await res.json()
      if (!res.ok) {
        const msg =
          typeof data === 'object' && data !== null && typeof (data as { error?: unknown }).error === 'string'
            ? (data as { error: string }).error
            : errorMessage
        throw new Error(msg)
      }
      if (
        typeof data === 'object' &&
        data !== null &&
        Array.isArray((data as { items?: unknown }).items)
      ) {
        setItems((data as { items: PatientGuidelineItemEntity[] }).items)
      }
    } catch (err) {
      console.error('Failed to generate AI guidelines:', err)
      setError(err instanceof Error ? err.message : errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }, [clearMessages, errorMessage, isGenerating])

  const addManualItem = useCallback(
    async (category: GuidelineCategory, textEl: string) => {
      clearMessages()
      const res = await addManualGuidelineAction({ category, textEl })
      if (!res.success || !res.data) {
        setError(res.error || errorMessage)
        return false
      }
      setItems((prev) => [res.data as PatientGuidelineItemEntity, ...prev])
      return true
    },
    [clearMessages, errorMessage]
  )

  const updateItemText = useCallback(
    async (id: number, textEl: string) => {
      clearMessages()
      // Optimistic update
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, textEl } : item)))
      const res = await updateGuidelineAction({ id, textEl })
      if (!res.success) {
        setError(res.error || errorMessage)
      }
    },
    [clearMessages, errorMessage]
  )

  const setItemStatus = useCallback(
    async (id: number, status: GuidelineStatus) => {
      clearMessages()
      // Optimistic update
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
      const res = await updateGuidelineAction({ id, status })
      if (!res.success) {
        setError(res.error || errorMessage)
      }
    },
    [clearMessages, errorMessage]
  )

  const deleteItem = useCallback(
    async (id: number) => {
      clearMessages()
      const previous = items
      setItems((prev) => prev.filter((item) => item.id !== id))
      const res = await deleteGuidelineAction(id)
      if (!res.success) {
        setItems(previous)
        setError(res.error || errorMessage)
      }
    },
    [clearMessages, errorMessage, items]
  )

  const openPreview = useCallback(async () => {
    clearMessages()
    const approvedCount = items.filter((i) => i.status === 'approved').length
    if (approvedCount === 0) {
      return
    }

    setIsPreparingPreview(true)
    try {
      const res = await fetch('/api/doctor/guidelines/preview', { method: 'POST' })
      const data: unknown = await res.json()
      if (!res.ok) {
        const msg =
          typeof data === 'object' && data !== null && typeof (data as { error?: unknown }).error === 'string'
            ? (data as { error: string }).error
            : errorMessage
        throw new Error(msg)
      }
      const preview = (data as { previewItems: CategoryPreviewItem[] }).previewItems
      setPreviewItems(preview)
    } catch (err) {
      console.error('Failed to prepare preview:', err)
      setError(err instanceof Error ? err.message : errorMessage)
    } finally {
      setIsPreparingPreview(false)
    }
  }, [clearMessages, errorMessage, items])

  const closePreview = useCallback(() => {
    setPreviewItems(null)
  }, [])

  const confirmPublish = useCallback(async () => {
    if (!previewItems || previewItems.length === 0) return
    setIsPublishing(true)
    clearMessages()

    try {
      const res = await fetch('/api/doctor/guidelines/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: previewItems }),
      })
      const data: unknown = await res.json()
      if (!res.ok) {
        const msg =
          typeof data === 'object' && data !== null && typeof (data as { error?: unknown }).error === 'string'
            ? (data as { error: string }).error
            : errorMessage
        throw new Error(msg)
      }

      const publishedIds = new Set(previewItems.flatMap((p) => p.approvedItemIds))
      const nowIso = new Date().toISOString()
      setItems((prev) =>
        prev.map((item) =>
          publishedIds.has(item.id) ? { ...item, publishedAt: nowIso } : item
        )
      )

      setPreviewItems(null)
      setSuccessMessage('Успешно публикувахте насоките за пациента!')
      onPublishedSuccess?.()
    } catch (err) {
      console.error('Failed to publish guidelines:', err)
      setError(err instanceof Error ? err.message : errorMessage)
    } finally {
      setIsPublishing(false)
    }
  }, [clearMessages, errorMessage, onPublishedSuccess, previewItems])

  const approvedCount = items.filter((i) => i.status === 'approved').length

  return {
    items,
    isGenerating,
    isPreparingPreview,
    isPublishing,
    previewItems,
    error,
    successMessage,
    approvedCount,
    generateAi,
    addManualItem,
    updateItemText,
    setItemStatus,
    deleteItem,
    openPreview,
    closePreview,
    confirmPublish,
    clearMessages,
  }
}
