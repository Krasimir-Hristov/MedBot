'use client'

import { useCallback, useState } from 'react'
import type { DossierSummaryItem, SummaryStaleness } from '../types'

interface UseDossierSummaryArgs {
  initialSummary: DossierSummaryItem | null
  initialStaleness: SummaryStaleness
  errorMessage: string
}

interface UseDossierSummaryResult {
  summary: DossierSummaryItem | null
  staleness: SummaryStaleness | null
  streamingContent: string
  isGenerating: boolean
  error: string | null
  generate: () => Promise<void>
}

interface SummaryEvent {
  type: string
  text?: string
  message?: string
  summary?: DossierSummaryItem
}

const isSummaryEvent = (value: unknown): value is SummaryEvent =>
  typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string'

/**
 * Стартира генериране на обобщение (SSE) и пази състоянието му.
 */
export const useDossierSummary = ({
  initialSummary,
  initialStaleness,
  errorMessage,
}: UseDossierSummaryArgs): UseDossierSummaryResult => {
  const [summary, setSummary] = useState<DossierSummaryItem | null>(initialSummary)
  const [staleness, setStaleness] = useState<SummaryStaleness | null>(initialStaleness)
  const [streamingContent, setStreamingContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    if (isGenerating) return
    setIsGenerating(true)
    setError(null)
    setStreamingContent('')

    try {
      const res = await fetch('/api/doctor/summary', { method: 'POST' })
      if (!res.ok || !res.body) {
        const data: unknown = await res.json().catch(() => null)
        const apiError =
          typeof data === 'object' && data !== null && typeof (data as { error?: unknown }).error === 'string'
            ? (data as { error: string }).error
            : errorMessage
        throw new Error(apiError)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''
      let failed: string | null = null
      let receivedTerminalEvent = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const raw of lines) {
          const line = raw.trim()
          if (!line.startsWith('data: ')) continue
          let payload: unknown
          try {
            payload = JSON.parse(line.slice(6))
          } catch {
            continue
          }
          if (!isSummaryEvent(payload)) continue

          if (payload.type === 'chunk' && payload.text) {
            accumulated += payload.text
            setStreamingContent(accumulated)
          } else if (payload.type === 'done' && payload.summary) {
            receivedTerminalEvent = true
            setSummary(payload.summary)
            setStaleness(null)
            try {
              const stateRes = await fetch('/api/doctor/summary')
              const stateData: unknown = await stateRes.json().catch(() => null)
              if (!stateRes.ok) {
                const apiError =
                  typeof stateData === 'object' &&
                  stateData !== null &&
                  typeof (stateData as { error?: unknown }).error === 'string'
                    ? (stateData as { error: string }).error
                    : errorMessage
                throw new Error(apiError)
              }
              const nextStaleness =
                typeof stateData === 'object' &&
                stateData !== null &&
                typeof (stateData as { staleness?: unknown }).staleness === 'object' &&
                (stateData as { staleness?: unknown }).staleness !== null
                  ? (stateData as { staleness: SummaryStaleness }).staleness
                  : null
              if (
                !nextStaleness ||
                typeof nextStaleness.newCount !== 'number' ||
                typeof nextStaleness.removedCount !== 'number'
              ) {
                throw new Error(errorMessage)
              }
              setStaleness(nextStaleness)
            } catch (stalenessErr) {
              setStaleness(null)
              failed =
                stalenessErr instanceof Error && stalenessErr.message
                  ? stalenessErr.message
                  : errorMessage
            }
          } else if (payload.type === 'error') {
            receivedTerminalEvent = true
            failed = payload.message || errorMessage
          }
        }
      }

      if (!receivedTerminalEvent && !failed) {
        failed = errorMessage
      }

      if (failed) setError(failed)
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : errorMessage
      console.warn('Dossier summary notice:', msg)
      setError(msg)
    } finally {
      setIsGenerating(false)
      setStreamingContent('')
    }
  }, [errorMessage, isGenerating])

  return { summary, staleness, streamingContent, isGenerating, error, generate }
}
