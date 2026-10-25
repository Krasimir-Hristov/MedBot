'use client'

import React, { useState } from 'react'
import { useTranslation } from '@/features/i18n'
import type { ChatSession } from '@/lib/db/schema'
import { MessageSquare, Edit2, Trash2, Check, X } from 'lucide-react'

interface ChatSessionsDrawerProps {
  isOpen: boolean
  sessions: ChatSession[]
  activeSessionId?: string
  onClose: () => void
  onSelectSession: (sessionId: string) => void
  onRenameSession: (sessionId: string, newTitle: string) => Promise<void>
  onDeleteSession: (sessionId: string) => Promise<void>
}

export const ChatSessionsDrawer: React.FC<ChatSessionsDrawerProps> = ({
  isOpen,
  sessions,
  activeSessionId,
  onClose,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
}) => {
  const { t } = useTranslation()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  if (!isOpen) return null

  const handleStartEdit = (session: ChatSession) => {
    setEditingId(session.sessionId)
    setEditTitle(session.title)
  }

  const handleSaveEdit = async (sessionId: string) => {
    if (editTitle.trim()) {
      await onRenameSession(sessionId, editTitle.trim())
    }
    setEditingId(null)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.doctor.chat.sessionsHistory}
      className="absolute inset-0 z-30 bg-slate-900/20 backdrop-blur-xs flex"
    >
      <div className="w-80 max-w-[85%] bg-white h-full border-r border-slate-200 shadow-xl flex flex-col animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-600" />
            <h3 className="font-semibold text-sm text-slate-900">
              {t.doctor.chat.sessionsHistory}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Затвори панела"
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              Няма предишни разговори
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.sessionId === activeSessionId
              const isEditing = editingId === s.sessionId

              return (
                <div
                  key={s.sessionId}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${
                    isActive
                      ? 'bg-sky-50 border border-sky-200 font-semibold text-sky-900'
                      : 'hover:bg-slate-50 border border-transparent text-slate-700'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1 w-full">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(s.sessionId)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        aria-label="Запази"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                        aria-label="Отказ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSession(s.sessionId)
                          onClose()
                        }}
                        className="flex-1 text-left truncate mr-2"
                      >
                        <p className="truncate">{s.title}</p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(s.updatedAt).toLocaleDateString()}
                        </span>
                      </button>

                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(s)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded"
                          aria-label={t.doctor.chat.renameSession}
                          title={t.doctor.chat.renameSession}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Сигурни ли сте, че искате да изтриете този разговор?')) {
                              void onDeleteSession(s.sessionId)
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          aria-label={t.doctor.chat.deleteSession}
                          title={t.doctor.chat.deleteSession}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  )
}
