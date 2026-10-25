'use client'

import { useState, useCallback } from 'react'
import type { ChatMessage, ChatSession } from '@/lib/db/schema'
import type { Locale } from '@/features/i18n'

interface UseDoctorChatProps {
  initialSessions: ChatSession[]
  initialMessages: ChatMessage[]
  locale: Locale
  errorMessage: string
}

export const useDoctorChat = ({
  initialSessions,
  initialMessages,
  locale,
  errorMessage,
}: UseDoctorChatProps) => {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions)
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(
    initialSessions[0]?.sessionId
  )
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [isThinking, setIsThinking] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')

  const selectSession = useCallback(async (sessionId: string) => {
    try {
      setActiveSessionId(sessionId)
      const res = await fetch(`/api/doctor/sessions/${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (e) {
      console.error('Failed to load session messages:', e)
    }
  }, [])

  const createNewSession = useCallback(async () => {
    try {
      const res = await fetch('/api/doctor/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Нова консултация' }),
      })
      if (res.ok) {
        const data = await res.json()
        setSessions((prev) => [data.session, ...prev])
        setActiveSessionId(data.session.sessionId)
        setMessages([])
      }
    } catch (e) {
      console.error('Failed to create new session:', e)
    }
  }, [])

  const renameSession = useCallback(async (sessionId: string, title: string) => {
    try {
      const res = await fetch(`/api/doctor/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (res.ok) {
        const data = await res.json()
        setSessions((prev) =>
          prev.map((s) => (s.sessionId === sessionId ? data.session : s))
        )
      }
    } catch (e) {
      console.error('Failed to rename session:', e)
    }
  }, [])

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        const res = await fetch(`/api/doctor/sessions/${sessionId}`, {
          method: 'DELETE',
        })
        if (res.ok) {
          setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId))
          if (activeSessionId === sessionId) {
            setActiveSessionId(undefined)
            setMessages([])
          }
        }
      } catch (e) {
        console.error('Failed to delete session:', e)
      }
    },
    [activeSessionId]
  )

  const sendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isThinking) return

      const userMsg: ChatMessage = {
        id: Date.now(),
        sessionId: activeSessionId || 'temp',
        role: 'user',
        content: messageText,
        citations: [],
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, userMsg])
      setIsThinking(true)
      setStreamingContent('')

      try {
        const res = await fetch('/api/chat/doctor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeSessionId,
            message: messageText,
            locale,
          }),
        })

        if (!res.ok) throw new Error('RAG request failed')
        if (!res.body) throw new Error('No stream body')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const rawLine of lines) {
            const line = rawLine.trim()
            if (!line.startsWith('data: ')) continue
            try {
              const payload = JSON.parse(line.slice(6))
              if (payload.type === 'session' && !activeSessionId) {
                setActiveSessionId(payload.sessionId)
              } else if (payload.type === 'chunk') {
                accumulated += payload.text
                setStreamingContent(accumulated)
              } else if (payload.type === 'done') {
                const assistantMsg: ChatMessage = {
                  id: Date.now() + 1,
                  sessionId: activeSessionId || 'active',
                  role: 'assistant',
                  content: accumulated,
                  citations: payload.citations || [],
                  createdAt: new Date(),
                }
                setMessages((prev) => [...prev, assistantMsg])
                setStreamingContent('')
                setIsThinking(false)
              }
            } catch {
              // Ignore chunk parse error
            }
          }
        }
      } catch (err) {
        console.error('Error in chat stream:', err)
        alert(errorMessage)
      } finally {
        setIsThinking(false)
        setStreamingContent('')
      }
    },
    [activeSessionId, isThinking, locale, errorMessage]
  )

  return {
    sessions,
    activeSessionId,
    messages,
    isThinking,
    streamingContent,
    selectSession,
    createNewSession,
    renameSession,
    deleteSession,
    sendMessage,
  }
}
