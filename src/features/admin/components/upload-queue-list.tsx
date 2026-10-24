'use client'

import React from 'react'
import {
  CircleAlert,
  CircleCheck,
  FileImage,
  LoaderCircle,
  RotateCw,
  X,
} from 'lucide-react'
import { useTranslation } from '@/features/i18n'
import { formatBytes } from '../lib/format'
import type { UploadErrorCode, UploadQueueItem, UploadStage } from '../types'

interface UploadQueueListProps {
  items: UploadQueueItem[]
  onRetry: (id: string) => void
  onRemove: (id: string) => void
}

const STAGE_BADGE_STYLES: Record<UploadStage, string> = {
  queued: 'bg-slate-100 text-slate-600 border-slate-200',
  compressing: 'bg-amber-50 text-amber-700 border-amber-200',
  analyzing: 'bg-sky-50 text-sky-700 border-sky-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
}

export const UploadQueueList: React.FC<UploadQueueListProps> = ({ items, onRetry, onRemove }) => {
  const { t } = useTranslation()
  const u = t.admin.upload

  const stageLabels: Record<UploadStage, string> = {
    queued: u.stageQueued,
    compressing: u.stageCompressing,
    analyzing: u.stageAnalyzing,
    done: u.stageDone,
    error: u.stageError,
  }

  const errorLabels: Record<UploadErrorCode, string> = {
    unsupported: u.errorUnsupported,
    too_large: u.errorTooLarge,
    too_many: u.errorTooMany,
    compress: u.errorCompress,
    network: u.errorNetwork,
    server: u.errorServer,
  }

  const getErrorText = (item: UploadQueueItem): string => {
    if (item.errorMessage) {
      return item.errorMessage
    }
    return item.errorCode ? errorLabels[item.errorCode] : u.errorServer
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const isBusy = item.stage === 'compressing' || item.stage === 'analyzing'
        const canRetry = item.stage === 'error' && item.errorCode !== 'unsupported' && item.errorCode !== 'too_large' && item.errorCode !== 'too_many'

        return (
          <li
            key={item.id}
            className={`flex flex-col gap-1.5 rounded-md border bg-white p-2.5 ${
              isBusy ? 'border-sky-300' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileImage className="h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
                <span className="truncate text-xs font-semibold text-slate-900">{item.fileName}</span>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-clinical-mono text-[10px] font-semibold ${STAGE_BADGE_STYLES[item.stage]}`}
              >
                {isBusy && <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden="true" />}
                {item.stage === 'done' && <CircleCheck className="h-3 w-3" aria-hidden="true" />}
                {item.stage === 'error' && <CircleAlert className="h-3 w-3" aria-hidden="true" />}
                {stageLabels[item.stage]}
              </span>
            </div>

            {item.stage === 'compressing' && (
              <div
                role="progressbar"
                aria-label={u.stageCompressing}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={item.progress}
                className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
              >
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            )}

            {item.stage === 'analyzing' && (
              <div
                role="progressbar"
                aria-label={u.stageAnalyzing}
                className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
              >
                <div className="h-full w-full animate-pulse rounded-full bg-sky-500" />
              </div>
            )}

            {item.stage === 'error' && (
              <p role="alert" className="text-xs text-rose-700">
                {getErrorText(item)}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 font-clinical-mono text-[10px] text-slate-500">
              <span>
                {u.originalSize}: {formatBytes(item.originalSize)}
                {item.compressedSize !== undefined && ` → ${formatBytes(item.compressedSize)}`}
              </span>
              <span className="flex items-center gap-1">
                {canRetry && (
                  <button
                    type="button"
                    onClick={() => onRetry(item.id)}
                    aria-label={u.retryAria}
                    className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 font-semibold text-sky-700 transition-colors hover:bg-sky-50"
                  >
                    <RotateCw className="h-3 w-3" aria-hidden="true" />
                    {u.retry}
                  </button>
                )}
                {!isBusy && (
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    aria-label={u.removeAria}
                    className="cursor-pointer rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
