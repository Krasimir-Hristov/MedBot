'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from '@/features/i18n'
import type { ChatSession } from '@/lib/db/schema'
import { MessageSquare, Edit2, Trash2, Check, X, Plus } from 'lucide-react'

interface PatientSessionsDrawerProps {
  isOpen: boolean
  sessions: ChatSession[]
  activeSessionId?: string
  onClose: () => void
  onSelectSession: (sessionId: string) => void
  onNewSession: () => void
  onRenameSession: (sessionId: string, newTitle: string) => Promise<void>
  onDeleteSession: (sessionId: string) => Promise<void>
}

export const PatientSessionsDrawer: React.FC<PatientSessionsDrawerProps> = ({
  isOpen,
  sessions,
  activeSessionId,
  onClose,
  onSelectSession,
  onNewSession,
  onRenameSession,
  onDeleteSession,
}) => {
  const { t } = useTranslation()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleStartEdit = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(session.sessionId)
    setEditTitle(session.title)
  }

  const handleSaveEdit = async (sessionId: string) => {
    if (editTitle.trim()) {
      await onRenameSession(sessionId, editTitle.trim())
    }
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(t.patient.deleteSessionConfirm)) {
      await onDeleteSession(sessionId)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.patient.history}
      className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex animate-in fade-in duration-150"
    >
      <div className="w-80 max-w-[85%] bg-white h-full border-r border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200 z-10">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-600" />
            <h3 className="font-semibold text-sm text-slate-900">
              {t.patient.history}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.patient.close}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action: New Conversation */}
        <div className="p-3 border-b border-slate-100">
          <button
            type="button"
            onClick={() => {
              onNewSession()
              onClose()
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs active:scale-98"
          >
            <Plus className="w-4 h-4 text-sky-600" />
            <span>{t.patient.newConversation}</span>
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              {t.patient.emptyHistory}
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.sessionId === activeSessionId
              const isEditing = editingId === s.sessionId

              return (
                <div
                  key={s.sessionId}
                  className={`group relative flex items-center justify-between p-1.5 rounded-xl text-xs transition-colors ${
                    isActive
                      ? 'bg-sky-50 border border-sky-200 font-semibold text-sky-900'
                      : 'hover:bg-slate-50 border border-transparent text-slate-700'
                  }`}
                >
                  {isEditing ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleSaveEdit(s.sessionId)
                      }}
                      className="flex items-center gap-1 w-full p-1"
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        autoFocus
                      />
                      <button
                        type="submit"
                        aria-label="Запази"
                        className="p-1 hover:bg-slate-200 rounded text-emerald-600 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        aria-label="Отказ"
                        className="p-1 hover:bg-slate-200 rounded text-slate-400 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSession(s.sessionId)
                          onClose()
                        }}
                        className="flex-1 flex flex-col text-left truncate p-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                      >
                        <span className="truncate font-medium">{s.title || t.patient.newConversation}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {new Date(s.updatedAt).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </button>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity pr-1">
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(s, e)}
                          aria-label="Преименувай"
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(s.sessionId, e)}
                          aria-label="Изтрий"
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
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
      <button
        type="button"
        aria-label={t.patient.close}
        tabIndex={-1}
        onClick={onClose}
        className="flex-1 cursor-default bg-transparent border-0"
      />
    </div>
  )
}
