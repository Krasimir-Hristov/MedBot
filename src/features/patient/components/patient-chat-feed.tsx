'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, CheckCircle2, MessageSquareQuote } from 'lucide-react'
import { useTranslation } from '@/features/i18n'
import type { PatientChatMessage } from '../types'
import { PatientQuickDropdown } from './patient-quick-dropdown'

interface PatientChatFeedProps {
  messages: PatientChatMessage[]
  streamingResponse: string
  isStreaming: boolean
  onQuickQuestion: (text: string) => void
}

export const PatientChatFeed: React.FC<PatientChatFeedProps> = ({
  messages,
  streamingResponse,
  isStreaming,
  onQuickQuestion,
}) => {
  const { t, locale } = useTranslation()
  const isGreek = locale === 'el'

  return (
    <div className="space-y-4">
      {/* Заглавна секция на разговора с вградено падащо меню за въпроси вдясно */}
      <div className="flex items-center justify-between px-1 gap-2 flex-wrap">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <MessageSquareQuote className="w-4 h-4 text-sky-600" />
          <span>{isGreek ? 'Συνομιλία με το MedBot' : 'Разговор с MedBot'}</span>
        </h2>

        {/* Падащо меню с често задавани въпроси встрани */}
        <PatientQuickDropdown
          disabled={isStreaming}
          onSelectQuestion={onQuickQuestion}
        />
      </div>

      {/* Съобщения */}
      {messages.length === 0 && !isStreaming ? (
        <div className="p-6 bg-white border border-slate-200/80 rounded-3xl text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
            <Bot className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {t.patient.welcomeTitle}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-lg mx-auto">
              {t.patient.welcomeDesc}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user'

            if (isUser) {
              return (
                <div key={index} className="flex justify-end">
                  <div className="bg-[#006194] text-white rounded-2xl rounded-tr-xs px-4.5 py-3 max-w-[85%] sm:max-w-[75%] shadow-xs text-base sm:text-lg leading-relaxed font-medium">
                    {msg.content}
                  </div>
                </div>
              )
            }

            return (
              <div key={index} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-linear-to-br from-sky-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-white border border-slate-200/90 text-slate-800 rounded-2xl rounded-tl-xs p-4 sm:p-5 max-w-[92%] sm:max-w-[88%] shadow-xs space-y-3">
                  <div className="prose prose-slate max-w-none text-base sm:text-lg leading-relaxed font-normal text-slate-800 prose-p:my-2 prose-ul:my-2 prose-li:my-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 text-xs text-emerald-700 border-t border-slate-100 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t.patient.verifiedBadge}</span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Стрийминг отговор в реално време */}
          {isStreaming && (
            <div className="flex items-start gap-3 animate-in fade-in duration-150">
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-sky-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                <Bot className="w-5 h-5 animate-pulse" />
              </div>
              <div className="bg-white border border-slate-200/90 text-slate-800 rounded-2xl rounded-tl-xs p-4 sm:p-5 max-w-[92%] sm:max-w-[88%] shadow-xs space-y-3">
                <div className="prose prose-slate max-w-none text-base sm:text-lg leading-relaxed font-normal text-slate-800">
                  {streamingResponse ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingResponse}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-slate-400 italic">{t.patient.thinking}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pt-2 text-xs text-emerald-700 border-t border-slate-100 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t.patient.verifiedBadge}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
