'use client'

import React from 'react'
import { GripVertical } from 'lucide-react'

interface PanelSplitterProps {
  isDragging: boolean
  splitRatio: number
  minRatio?: number
  maxRatio?: number
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
  onDoubleClick: () => void
  onStepRatio: (deltaPercent: number) => void
}

export const PanelSplitter: React.FC<PanelSplitterProps> = ({
  isDragging,
  splitRatio,
  minRatio = 25,
  maxRatio = 75,
  onPointerDown,
  onDoubleClick,
  onStepRatio,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      onStepRatio(-2)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      onStepRatio(2)
    } else if (e.key === 'Home') {
      e.preventDefault()
      onStepRatio(minRatio - splitRatio)
    } else if (e.key === 'End') {
      e.preventDefault()
      onStepRatio(maxRatio - splitRatio)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onDoubleClick()
    }
  }

  return (
    <>
      {/* Плъзгач между левия и десния панел (само за Desktop / lg+) */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Преоразмеряване на чата и документите"
        aria-valuenow={Math.round(splitRatio)}
        aria-valuemin={minRatio}
        aria-valuemax={maxRatio}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        onKeyDown={handleKeyDown}
        title="Плъзнете наляво/надясно за преоразмеряване • Двойно кликване за 42/58%"
        className={`hidden lg:flex items-center justify-center relative w-1.5 shrink-0 z-20 cursor-col-resize select-none transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
          isDragging
            ? 'bg-sky-500 shadow-sm'
            : 'bg-slate-200 hover:bg-sky-400 active:bg-sky-500'
        }`}
      >
        {/* Разширена зона за лесно хващане с мишка (12px ширина) */}
        <div className="absolute inset-y-0 -left-1.5 -right-1.5" />

        {/* Индикатор за хващане в центъра */}
        <div
          className={`w-3.5 h-7 rounded-sm flex items-center justify-center transition-all ${
            isDragging
              ? 'bg-sky-600 text-white shadow-xs scale-110'
              : 'bg-slate-300 text-slate-600 group-hover:bg-sky-500 group-hover:text-white shadow-2xs'
          }`}
        >
          <GripVertical className="w-2.5 h-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Прозрачен защитен овърлей по време на влачене: предотвратява изпускане на събития върху iframes/PDFs */}
      {isDragging && (
        <div
          className="fixed inset-0 z-50 cursor-col-resize select-none"
          style={{ userSelect: 'none' }}
        />
      )}
    </>
  )
}
