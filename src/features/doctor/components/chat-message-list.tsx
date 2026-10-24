'use client'

import React, { useEffect, useRef } from 'react'
import { useTranslation } from '@/features/i18n'
import type { ChatMessage } from '@/lib/db/schema'
import { Brain, Loader2 } from 'lucide-react'
import { ClinicalMarkdown } from './clinical-markdown'

interface ChatMessageListProps {
  messages: ChatMessage[]
  streamingContent?: string
  isThinking?: boolean
  onSelectDocument: (docId: number) => void
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  streamingContent = '',
  isThinking = false,
  onSelectDocument,
}) => {
  const { t } = useTranslation()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, isThinking])

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
      {messages.length === 0 && !streamingContent && !isThinking ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
          <Brain className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-sm max-w-sm">{t.doctor.chat.noMessages}</p>
        </div>
      ) : (
        <>
          {messages.map((msg) => (
            <article
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'user' ? (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 max-w-xl shadow-xs text-sm text-slate-900">
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                <div className="bg-sky-50/60 border border-sky-100/90 rounded-2xl p-5 max-w-2xl shadow-xs text-sm text-slate-900 space-y-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2 font-bold text-sky-800 text-[11px] uppercase tracking-wider font-mono">
                    <Brain className="w-4 h-4 text-sky-600" />
                    <span>{t.doctor.chat.analysisTitle}</span>
                  </div>
                  <ClinicalMarkdown content={msg.content} onSelectDocument={onSelectDocument} />
                </div>
              )}
            </article>
          ))}

          {/* Streaming Assistant Message */}
          {streamingContent && (
            <article className="flex justify-start">
              <div className="bg-sky-50/60 border border-sky-100/90 rounded-2xl p-5 max-w-2xl shadow-xs text-sm text-slate-900 space-y-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 font-bold text-sky-800 text-[11px] uppercase tracking-wider font-mono">
                  <Brain className="w-4 h-4 text-sky-600 animate-pulse" />
                  <span>{t.doctor.chat.analysisTitle}</span>
                </div>
                <ClinicalMarkdown content={streamingContent} onSelectDocument={onSelectDocument} />
              </div>
            </article>
          )}

          {/* Thinking indicator */}
          {isThinking && !streamingContent && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2.5 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 shadow-2xs">
                <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                <span>{t.doctor.chat.thinking}</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </>
      )}
    </div>
  )
}
