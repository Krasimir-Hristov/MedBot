'use client'

import React from 'react'
import { useTranslation } from '@/features/i18n'
import { Sparkles, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { GuidelineCategoryGroup } from './guideline-category-group'
import { PublishPreviewModal } from './publish-preview-modal'
import { useGuidelinesBoard } from '../hooks/use-guidelines-board'
import { GUIDELINE_CATEGORIES } from '../constants'
import type { PatientGuidelineItemEntity } from '../types'

interface GuidelinesTabProps {
  initialItems: PatientGuidelineItemEntity[]
  onSelectDocument: (docId: number) => void
  onPublishedSuccess?: () => void
}

export const GuidelinesTab: React.FC<GuidelinesTabProps> = ({
  initialItems,
  onSelectDocument,
  onPublishedSuccess,
}) => {
  const { t } = useTranslation()
  const {
    items,
    isGenerating,
    isPreparingPreview,
    isPublishing,
    previewItems,
    error,
    successMessage,
    approvedCount,
    generateAi,
    addManualItem,
    updateItemText,
    setItemStatus,
    deleteItem,
    openPreview,
    closePreview,
    confirmPublish,
  } = useGuidelinesBoard({
    initialItems,
    errorMessage: t.doctor.guidelines.error,
    successMessageText: t.doctor.guidelines.sent,
    onPublishedSuccess,
  })

  return (
    <section
      className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden"
      aria-label={t.doctor.guidelines.title}
    >
      {/* Top action toolbar */}
      <header className="p-3 sm:p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono truncate">
            {t.doctor.guidelines.title}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate hidden sm:block">
            {t.doctor.guidelines.intro}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* AI generate button */}
          <button
            type="button"
            onClick={generateAi}
            disabled={isGenerating || isPreparingPreview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            )}
            <span>
              {isGenerating
                ? t.doctor.guidelines.generating
                : t.doctor.guidelines.generateAi}
            </span>
          </button>

          {/* Send to patient preview button */}
          <button
            type="button"
            onClick={openPreview}
            disabled={approvedCount === 0 || isGenerating || isPreparingPreview}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {isPreparingPreview ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t.doctor.guidelines.previewLoading}</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>
                  {t.doctor.guidelines.sendToPatient} ({approvedCount})
                </span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Messages */}
      {error && (
        <div role="alert" className="mx-3 sm:mx-4 mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div role="status" className="mx-3 sm:mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 4 Category groups */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {GUIDELINE_CATEGORIES.map((category) => {
          const categoryItems = items.filter((i) => i.category === category)
          return (
            <GuidelineCategoryGroup
              key={category}
              category={category}
              items={categoryItems}
              onAddManualItem={addManualItem}
              onUpdateText={updateItemText}
              onSetStatus={setItemStatus}
              onDelete={deleteItem}
              onSelectDocument={onSelectDocument}
            />
          )
        })}
      </div>

      {/* Preview Modal */}
      <PublishPreviewModal
        isOpen={Boolean(previewItems)}
        items={previewItems}
        isPublishing={isPublishing}
        onClose={closePreview}
        onConfirm={confirmPublish}
      />
    </section>
  )
}
