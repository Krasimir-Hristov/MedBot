'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface UseResizableSplitOptions {
  defaultRatio?: number
  minRatio?: number
  maxRatio?: number
  storageKey?: string
}

interface UseResizableSplitReturn {
  containerRef: React.RefObject<HTMLDivElement | null>
  splitRatio: number
  isDragging: boolean
  startDragging: (e: React.PointerEvent<HTMLDivElement>) => void
  resetToDefault: () => void
  stepRatio: (deltaPercent: number) => void
}

const DEFAULT_RATIO = 42 // 42% Chat, 58% Documents
const MIN_RATIO = 25
const MAX_RATIO = 75
const STORAGE_KEY = 'medbot_doctor_split_ratio'

export const useResizableSplit = ({
  defaultRatio = DEFAULT_RATIO,
  minRatio = MIN_RATIO,
  maxRatio = MAX_RATIO,
  storageKey = STORAGE_KEY,
}: UseResizableSplitOptions = {}): UseResizableSplitReturn => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [splitRatio, setSplitRatio] = useState<number>(defaultRatio)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  // Инициализация от localStorage при първо зареждане
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem(storageKey)
        if (saved) {
          const parsed = parseFloat(saved)
          if (!Number.isNaN(parsed) && parsed >= minRatio && parsed <= maxRatio) {
            setSplitRatio(parsed)
          }
        }
      }
    } catch {
      // Игнорираме грешки при блокиран localStorage (Private/Incognito)
    }
  }, [minRatio, maxRatio, storageKey])

  // Запазване в localStorage
  const persistRatio = useCallback(
    (value: number) => {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, value.toFixed(1))
        }
      } catch {
        // Игнорираме грешки при блокиран localStorage
      }
    },
    [storageKey]
  )

  // Нулиране към препоръчаното съотношение (42% / 58%)
  const resetToDefault = useCallback(() => {
    setSplitRatio(defaultRatio)
    persistRatio(defaultRatio)
  }, [defaultRatio, persistRatio])

  // Промяна с клавиши
  const stepRatio = useCallback(
    (deltaPercent: number) => {
      setSplitRatio((prev) => {
        const next = Math.min(Math.max(prev + deltaPercent, minRatio), maxRatio)
        persistRatio(next)
        return next
      })
    },
    [minRatio, maxRatio, persistRatio]
  )

  // Започване на влачене с мишка / тъч
  const startDragging = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Работи само с ляв бутон на мишката или тъч
      if (e.button !== 0 && e.pointerType === 'mouse') return

      e.preventDefault()
      setIsDragging(true)

      const container = containerRef.current
      if (!container) return

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        if (rect.width <= 0) return

        const pointerX = moveEvent.clientX - rect.left
        const rawPercent = (pointerX / rect.width) * 100
        const clamped = Math.min(Math.max(rawPercent, minRatio), maxRatio)
        const rounded = Math.round(clamped * 10) / 10

        setSplitRatio(rounded)
      }

      const onPointerUp = (upEvent: PointerEvent) => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('pointercancel', onPointerUp)

        setIsDragging(false)

        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          if (rect.width > 0) {
            const pointerX = upEvent.clientX - rect.left
            const rawPercent = (pointerX / rect.width) * 100
            const clamped = Math.min(Math.max(rawPercent, minRatio), maxRatio)
            const finalRatio = Math.round(clamped * 10) / 10
            setSplitRatio(finalRatio)
            persistRatio(finalRatio)
          }
        }
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
      window.addEventListener('pointercancel', onPointerUp)
    },
    [minRatio, maxRatio, persistRatio]
  )

  return {
    containerRef,
    splitRatio,
    isDragging,
    startDragging,
    resetToDefault,
    stepRatio,
  }
}
