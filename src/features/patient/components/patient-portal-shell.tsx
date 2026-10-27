'use client'

import React, { useRef, useState, useEffect } from 'react'
import { useTranslation } from '@/features/i18n'
import type { ChatSession } from '@/lib/db/schema'
import type { PatientChatMessage, PatientPortalData } from '../types'
import { PatientHeader } from './patient-header'
import { LatestRecommendationCard } from './latest-recommendation-card'
import { PatientChatFeed } from './patient-chat-feed'
import { PatientComposerBar } from './patient-composer-bar'
import { PatientSessionsDrawer } from './patient-sessions-drawer'

interface PatientPortalShellProps {
  initialData: PatientPortalData
}

export const PatientPortalShell: React.FC<PatientPortalShellProps> = ({ initialData }) => {
  const { t, locale } = useTranslation()
  const [sessions, setSessions] = useState<ChatSession[]>(initialData.sessions)
  const [activeSessionId, setActiveSessionId] = useState<string>(initialData.activeSessionId)
  const [messages, setMessages] = useState<PatientChatMessage[]>(initialData.messages)
  const [streamingResponse, setStreamingResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const activeSessionIdRef = useRef(activeSessionId)
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId
  }, [activeSessionId])

  const handleSelectSession = async (sessionId: string) => {
    if (isStreaming || sessionId === activeSessionId) return
    try {
      const res = await fetch(`/api/patient/sessions/${sessionId}`)
      if (res.ok) {
        const data = (await res.json()) as { messages?: PatientChatMessage[] }
        setActiveSessionId(sessionId)
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Failed to load session messages:', err)
    }
  }

  const handleCreateNewSession = async () => {
    if (isStreaming) return
    try {
      const res = await fetch('/api/patient/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: locale === 'el' ? 'Νέα συνομιλία' : 'Нов разговор',
        }),
      })
      if (res.ok) {
        const data = (await res.json()) as { session: ChatSession }
        setSessions((prev) => [data.session, ...prev])
        setActiveSessionId(data.session.sessionId)
        setMessages([])
      }
    } catch (err) {
      console.error('Failed to create new patient session:', err)
    }
  }

  const handleRenameSession = async (sessionId: string, title: string) => {
    try {
      const res = await fetch(`/api/patient/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (res.ok) {
        const data = (await res.json()) as { session: ChatSession }
        setSessions((prev) =>
          prev.map((s) => (s.sessionId === sessionId ? data.session : s))
        )
      }
    } catch (err) {
      console.error('Failed to rename session:', err)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (isStreaming && sessionId === activeSessionId) return
    try {
      const res = await fetch(`/api/patient/sessions/${sessionId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId))
        if (activeSessionId === sessionId) {
          const remaining = sessions.filter((s) => s.sessionId !== sessionId)
          if (remaining.length > 0) {
            handleSelectSession(remaining[0].sessionId)
          } else {
            handleCreateNewSession()
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isStreaming) return

    const targetSessionId = activeSessionId
    const newMessages: PatientChatMessage[] = [
      ...messages,
      { role: 'user', content: userText.trim() },
    ]
    setMessages(newMessages)
    setIsStreaming(true)
    setStreamingResponse('')

    try {
      const response = await fetch('/api/chat/patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText.trim(),
          sessionId: targetSessionId,
          locale,
        }),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string }
        throw new Error(errorData.error || 'Грешка при свързване с асистента.')
      }

      if (!response.body) {
        throw new Error('Няма получен отговор.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullAssistantText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullAssistantText += chunk
        if (activeSessionIdRef.current === targetSessionId) {
          setStreamingResponse(fullAssistantText)
        }
      }

      if (activeSessionIdRef.current === targetSessionId) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: fullAssistantText.trim() },
        ])
      }
    } catch (err) {
      console.error('Chat error:', err)
      const errorMsg =
        err instanceof Error ? err.message : 'Възникна временна грешка.'
      if (activeSessionIdRef.current === targetSessionId) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `${locale === 'el' ? 'Σφάλμα σύνδεσης:' : 'Затруднение при връзката:'} ${errorMsg}.`,
          },
        ])
      }
    } finally {
      if (activeSessionIdRef.current === targetSessionId) {
        setStreamingResponse('')
      }
      setIsStreaming(false)
    }
  }

  const { stats, latestNote, notesByCategory } = initialData

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Горен бар */}
      <PatientHeader
        onToggleHistory={() => setIsDrawerOpen(true)}
        onNewConversation={handleCreateNewSession}
      />

      {/* Чекмедже за история на разговорите */}
      <PatientSessionsDrawer
        isOpen={isDrawerOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onClose={() => setIsDrawerOpen(false)}
        onSelectSession={handleSelectSession}
        onNewSession={handleCreateNewSession}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* Основно съдържание */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-32 space-y-5">
        {/* Главна карта с последната лекарска препоръка */}
        <LatestRecommendationCard
          latestNote={latestNote}
          notesByCategory={notesByCategory}
          onAskAboutCategory={handleSendMessage}
        />

        {/* Информационна лента с реални данни от досието */}
        {stats.totalDocuments > 0 && (
          <div className="bg-white/90 border border-slate-200/80 rounded-2xl px-4 py-3 flex items-center justify-between text-xs sm:text-sm text-slate-700 font-medium shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>
                {t.patient.dossierTitle} <strong>{stats.totalDocuments} {t.patient.dossierDocuments}</strong>
              </span>
            </div>
            {stats.latestDocumentDate && (
              <span className="text-slate-500 text-xs bg-slate-100 px-2.5 py-1 rounded-lg">
                {t.patient.dossierDate} {stats.latestDocumentDate}
              </span>
            )}
          </div>
        )}

        {/* Чат разговор с падащо меню за въпроси */}
        <PatientChatFeed
          messages={messages}
          streamingResponse={streamingResponse}
          isStreaming={isStreaming}
          onQuickQuestion={handleSendMessage}
        />
      </main>

      {/* Долен панел с компактен вход (точно като при доктора) */}
      <PatientComposerBar
        disabled={isStreaming}
        onSendMessage={handleSendMessage}
      />
    </div>
  )
}
