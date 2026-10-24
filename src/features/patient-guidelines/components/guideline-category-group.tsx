'use client'

import React, { useState } from 'react'
import { useTranslation } from '@/features/i18n'
import { VoiceMicButton } from '@/features/voice'
import { Utensils, Activity, Pill, ShieldAlert, Plus, Loader2 } from 'lucide-react'
import { GuidelineItemCard } from './guideline-item-card'
import type { GuidelineCategory, GuidelineStatus } from '../constants'
import type { PatientGuidelineItemEntity } from '../types'

interface GuidelineCategoryGroupProps {
  category: GuidelineCategory
  items: PatientGuidelineItemEntity[]
  onAddManualItem: (category: GuidelineCategory, textEl: string) => Promise<boolean>
  onUpdateText: (id: number, textEl: string) => Promise<void>
  onSetStatus: (id: number, status: GuidelineStatus) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onSelectDocument: (docId: number) => void
}

const CATEGORY_ICONS: Record<GuidelineCategory, React.ComponentType<{ className?: string }>> = {
  diet: Utensils,
  exercise: Activity,
  therapy: Pill,
  general: ShieldAlert,
}

export const GuidelineCategoryGroup: React.FC<GuidelineCategoryGroupProps> = ({
  category,
  items,
  onAddManualItem,
  onUpdateText,
  onSetStatus,
  onDelete,
  onSelectDocument,
}) => {
  const { t, locale } = useTranslation()
  const [isAdding, setIsAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const Icon = CATEGORY_ICONS[category]
  const title = t.doctor.guidelines.categories[category] || category
  const approvedCount = items.filter((i) => i.status === 'approved').length

  const handleAddSubmit = async () => {
    if (!newText.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const ok = await onAddManualItem(category, newText.trim())
      if (ok) {
        setNewText('')
        setIsAdding(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="bg-white border border-slate-200/90 rounded-2xl p-3.5 space-y-3 shadow-2xs">
      <header className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-sky-50 text-sky-700 rounded-lg">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-mono">
              {title}
            </h3>
            <span className="text-[10px] text-slate-500 font-sans">
              {approvedCount} / {items.length} {t.doctor.guidelines.statusApproved.toLowerCase()}
            </span>
          </div>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 text-xs text-sky-700 hover:text-sky-800 font-semibold px-2 py-1 rounded-md hover:bg-sky-50 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.doctor.guidelines.addPoint}</span>
          </button>
        )}
      </header>

      {/* Add new point form */}
      {isAdding && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <textarea
            rows={2}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={t.doctor.guidelines.addPlaceholder}
            className="w-full text-xs font-sans p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-900 resize-none"
            aria-label={t.doctor.guidelines.addPlaceholder}
          />
          <div className="flex items-center justify-between">
            <VoiceMicButton
              lang={locale === 'el' ? 'el-GR' : 'bg-BG'}
              onTranscript={(spoken) =>
                setNewText((prev) => (prev ? `${prev} ${spoken}` : spoken))
              }
              variant="compact"
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setNewText('')
                  setIsAdding(false)
                }}
                disabled={isSubmitting}
                className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md cursor-pointer"
              >
                {t.doctor.guidelines.cancel}
              </button>
              <button
                type="button"
                onClick={handleAddSubmit}
                disabled={!newText.trim() || isSubmitting}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-sky-700 text-white rounded-md hover:bg-sky-800 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                <span>{t.doctor.guidelines.addPoint}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-2 text-center">
          {t.doctor.guidelines.empty}
        </p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <GuidelineItemCard
              key={item.id}
              item={item}
              onUpdateText={onUpdateText}
              onSetStatus={onSetStatus}
              onDelete={onDelete}
              onSelectDocument={onSelectDocument}
            />
          ))}
        </div>
      )}
    </section>
  )
}
