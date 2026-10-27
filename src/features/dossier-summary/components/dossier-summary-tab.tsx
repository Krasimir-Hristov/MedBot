'use client'

import React from 'react'
import { useTranslation } from '@/features/i18n'
import { ClinicalMarkdown } from '@/features/doctor/components/clinical-markdown'
import { AlertTriangle, FileStack, Loader2, RefreshCw, Sparkles, UploadCloud } from 'lucide-react'
import { useDossierSummary } from '../hooks/use-dossier-summary'
import type { DossierSummaryItem, SummaryStaleness } from '../types'

interface DossierSummaryTabProps {
  initialSummary: DossierSummaryItem | null
  initialStaleness: SummaryStaleness
  onSelectDocument: (docId: number) => void
  docsCount?: number
}

const fillCount = (template: string, n: number): string => template.replace('{n}', String(n))

export const DossierSummaryTab: React.FC<DossierSummaryTabProps> = ({
  initialSummary,
  initialStaleness,
  onSelectDocument,
  docsCount,
}) => {
  const { t, locale } = useTranslation()
  const { summary, staleness, streamingContent, isGenerating, error, generate } = useDossierSummary({
    initialSummary,
    initialStaleness,
    errorMessage: t.doctor.summary.error,
  })

  const hasNoDocs = docsCount !== undefined && docsCount === 0

  const warnings: string[] = []
  if (staleness && staleness.newCount > 0)
    warnings.push(fillCount(t.doctor.summary.newDocsWarning, staleness.newCount))
  if (staleness && staleness.removedCount > 0)
    warnings.push(fillCount(t.doctor.summary.removedDocsWarning, staleness.removedCount))
  if (summary && summary.truncatedDocCount > 0)
    warnings.push(fillCount(t.doctor.summary.truncatedWarning, summary.truncatedDocCount))

  const rawVisibleContent = isGenerating ? streamingContent : summary?.contentEl || ''
  const hasRenderableContent =
    rawVisibleContent.trim().length > 0 &&
    rawVisibleContent.replace(/[#\s\-_*]/g, '').length > 0
  const visibleContent = hasRenderableContent ? rawVisibleContent : ''

  return (
    <section className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden" aria-label={t.doctor.summary.title}>
      <header className="p-3 sm:p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono truncate">
            {t.doctor.summary.title}
          </h2>
          {summary && (
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              <FileStack className="w-3 h-3" />
              {summary.documentCount} {t.doctor.summary.documentsCount} · {t.doctor.summary.generatedAt}{' '}
              {new Date(summary.createdAt).toLocaleString(locale === 'el' ? 'el-GR' : 'bg-BG')}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={isGenerating || hasNoDocs}
          aria-label={summary ? t.doctor.summary.regenerate : t.doctor.summary.generate}
          title={hasNoDocs ? (locale === 'el' ? 'Δεν υπάρχουν έγγραφα για ανάλυση' : 'Няма качени документи за обобщаване') : undefined}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
        >
          {isGenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : summary ? (
            <RefreshCw className="w-3.5 h-3.5" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>
            {isGenerating
              ? t.doctor.summary.generating
              : hasNoDocs
                ? locale === 'el'
                  ? 'Χωρίς έγγραφα'
                  : 'Няма документи'
                : summary
                  ? t.doctor.summary.regenerate
                  : t.doctor.summary.generate}
          </span>
        </button>
      </header>

      {!isGenerating && warnings.length > 0 && (
        <div role="alert" className="mx-3 sm:mx-4 mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-0.5">
          {warnings.map((w) => (
            <p key={w} className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              {w}
            </p>
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="mx-3 sm:mx-4 mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
          {error}
        </div>
      )}

      <article className="flex-1 overflow-y-auto p-3 sm:p-4">
        {visibleContent ? (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <ClinicalMarkdown content={visibleContent} onSelectDocument={onSelectDocument} />
          </div>
        ) : isGenerating ? (
          <div className="p-8 flex flex-col items-center text-xs text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 text-sky-600 animate-spin" />
            <span>{t.doctor.summary.generating}</span>
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            {hasNoDocs ? (
              <UploadCloud className="w-8 h-8 text-slate-300 mx-auto" />
            ) : (
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
            )}
            <p className="text-sm font-semibold text-slate-700">{t.doctor.summary.emptyTitle}</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {hasNoDocs
                ? locale === 'el'
                  ? 'Δεν υπάρχουν ακόμη έγγραφα στον φάκελο. Σύρετε или ανεβάστε PDF/εικόνες παρακάτω για να ξεκινήσει η ανάλυση.'
                  : 'Все още няма качени документи в досието. Моля, качете PDF или сканирани изследвания в зоната отдолу, за да започне анализът.'
                : t.doctor.summary.emptyDesc}
            </p>
          </div>
        )}
      </article>
    </section>
  )
}
