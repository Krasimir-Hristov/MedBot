'use client'

import React from 'react'
import { BrainCircuit, FolderOpen, Microscope, Scan, type LucideIcon } from 'lucide-react'
import { useTranslation } from '@/features/i18n'
import type { DocumentListItem } from '@/features/documents'
import { getCategoryKey } from '../constants'
import { interpolate } from '../lib/format'

interface AdminMetricsStripProps {
  documents: DocumentListItem[]
}

interface MetricCardProps {
  label: string
  value: React.ReactNode
  unit?: string
  hint: string
  icon: LucideIcon
  badge?: React.ReactNode
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, unit, hint, icon: Icon, badge }) => (
  <article className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <h3 className="font-clinical-mono text-[10px] font-medium tracking-wider text-slate-500 uppercase">
          {label}
        </h3>
        {badge}
      </div>
      <p className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </p>
      <p className="truncate text-xs text-slate-500">{hint}</p>
    </div>
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-sky-600">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </div>
  </article>
)

export const AdminMetricsStrip: React.FC<AdminMetricsStripProps> = ({ documents }) => {
  const { t } = useTranslation()
  const m = t.admin.metrics

  const total = documents.length
  const vectorized = documents.filter((doc) => doc.isVectorized).length
  const pathology = documents.filter((doc) => {
    const key = getCategoryKey(doc.category)
    return key === 'histology' || key === 'epicrisis'
  }).length
  const imaging = documents.filter((doc) => getCategoryKey(doc.category) === 'imaging').length

  const indexStatus =
    total === 0 ? m.indexEmpty : vectorized === total ? m.indexActive : m.indexPartial
  const indexHealthy = total > 0 && vectorized === total

  return (
    <section aria-label={t.admin.title} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard label={m.total} value={total} unit={m.totalUnit} hint={m.totalHint} icon={FolderOpen} />
      <MetricCard
        label={m.pathology}
        value={pathology}
        unit={m.pathologyUnit}
        hint={m.pathologyHint}
        icon={Microscope}
      />
      <MetricCard label={m.imaging} value={imaging} unit={m.imagingUnit} hint={m.imagingHint} icon={Scan} />
      <MetricCard
        label={m.index}
        value={<span className="font-clinical-mono text-xl">pgvector 1536d</span>}
        hint={interpolate(m.indexHint, { vectorized, total })}
        icon={BrainCircuit}
        badge={
          <span
            className={`inline-flex items-center gap-1 font-clinical-mono text-[10px] font-semibold uppercase ${
              indexHealthy ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${indexHealthy ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`}
              aria-hidden="true"
            />
            {indexStatus}
          </span>
        }
      />
    </section>
  )
}
