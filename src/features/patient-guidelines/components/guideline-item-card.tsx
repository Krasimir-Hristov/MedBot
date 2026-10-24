'use client'

import React, { useState } from 'react'
import { useTranslation } from '@/features/i18n'
import { VoiceMicButton } from '@/features/voice'
import { ClinicalMarkdown } from '@/features/doctor/components/clinical-markdown'
import { Check, X, Trash2, Edit3, Save, RotateCcw, Sparkles, User, Info } from 'lucide-react'
import type { PatientGuidelineItemEntity } from '../types'
import type { GuidelineStatus } from '../constants'

interface GuidelineItemCardProps {
  item: PatientGuidelineItemEntity
  onUpdateText: (id: number, textEl: string) => Promise<void>
  onSetStatus: (id: number, status: GuidelineStatus) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onSelectDocument: (docId: number) => void
}

export const GuidelineItemCard: React.FC<GuidelineItemCardProps> = ({
  item,
  onUpdateText,
  onSetStatus,
  onDelete,
  onSelectDocument,
}) => {
  const { t, locale } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [draftText, setDraftText] = useState(item.textEl)
  const [showRationale, setShowRationale] = useState(false)

  const isApproved = item.status === 'approved'
  const isRejected = item.status === 'rejected'

  const handleSaveEdit = async () => {
    if (!draftText.trim()) return
    await onUpdateText(item.id, draftText.trim())
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setDraftText(item.textEl)
    setIsEditing(false)
  }

  const statusBg = isApproved
    ? 'border-emerald-200 bg-emerald-50/40'
    : isRejected
      ? 'border-slate-200 bg-slate-100/60 opacity-60'
      : 'border-amber-200/80 bg-amber-50/30'

  return (
    <article
      className={`border rounded-xl p-3 shadow-2xs space-y-2 transition-all ${statusBg}`}
    >
      <div className="flex items-center justify-between gap-2 text-[11px] font-mono border-b border-slate-200/60 pb-1.5">
        <div className="flex items-center gap-1.5">
          {item.source === 'ai' ? (
            <span className="inline-flex items-center gap-1 text-sky-700 font-semibold bg-sky-100/70 px-2 py-0.5 rounded-md">
              <Sparkles className="w-3 h-3" />
              <span>{t.doctor.guidelines.sourceAi}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-700 font-semibold bg-slate-200/70 px-2 py-0.5 rounded-md">
              <User className="w-3 h-3" />
              <span>{t.doctor.guidelines.sourceDoctor}</span>
            </span>
          )}

          <span
            className={`px-2 py-0.5 rounded-md font-semibold ${
              isApproved
                ? 'bg-emerald-100 text-emerald-800'
                : isRejected
                  ? 'bg-slate-200 text-slate-600'
                  : 'bg-amber-100 text-amber-800'
            }`}
          >
            {isApproved
              ? t.doctor.guidelines.statusApproved
              : isRejected
                ? t.doctor.guidelines.statusRejected
                : t.doctor.guidelines.statusPending}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Approve button */}
          <button
            type="button"
            onClick={() => onSetStatus(item.id, isApproved ? 'pending' : 'approved')}
            title={t.doctor.guidelines.approve}
            aria-label={t.doctor.guidelines.approve}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              isApproved
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
          </button>

          {/* Reject button */}
          <button
            type="button"
            onClick={() => onSetStatus(item.id, isRejected ? 'pending' : 'rejected')}
            title={t.doctor.guidelines.reject}
            aria-label={t.doctor.guidelines.reject}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              isRejected
                ? 'bg-slate-600 text-white hover:bg-slate-700'
                : 'text-slate-500 hover:text-rose-700 hover:bg-rose-100'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Edit button */}
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              title={t.doctor.guidelines.edit}
              aria-label={t.doctor.guidelines.edit}
              className="p-1 text-slate-500 hover:text-sky-700 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete button */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t.doctor.guidelines.confirmDelete)) {
                onDelete(item.id)
              }
            }}
            title={t.doctor.guidelines.delete}
            aria-label={t.doctor.guidelines.delete}
            className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Text Content */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            rows={3}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            className="w-full text-xs font-sans p-2 bg-white border border-sky-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-900 resize-none"
            aria-label="Редакция на текста на точката"
          />
          <div className="flex items-center justify-between">
            <VoiceMicButton
              lang={locale === 'el' ? 'el-GR' : 'bg-BG'}
              onTranscript={(text) =>
                setDraftText((prev) => (prev ? `${prev} ${text}` : text))
              }
              variant="compact"
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t.doctor.guidelines.cancel}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!draftText.trim()}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-sky-700 text-white rounded-md hover:bg-sky-800 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3 h-3" />
                <span>{t.doctor.guidelines.save}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line">
          {item.textEl}
        </p>
      )}

      {/* Rationale toggle (if available) */}
      {item.rationaleEl && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowRationale((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-sky-700 font-mono cursor-pointer"
          >
            <Info className="w-3 h-3" />
            <span>{t.doctor.guidelines.rationale}</span>
          </button>
          {showRationale && (
            <div className="mt-1.5 p-2 bg-white/80 border border-slate-200 rounded-lg text-xs text-slate-700 font-sans">
              <ClinicalMarkdown
                content={item.rationaleEl}
                onSelectDocument={onSelectDocument}
              />
            </div>
          )}
        </div>
      )}
    </article>
  )
}
