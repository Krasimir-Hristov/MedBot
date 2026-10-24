'use client'

import React from 'react'
import { useTranslation } from '@/features/i18n'
import { FileText, FolderKanban, StickyNote, Sparkles, ClipboardCheck } from 'lucide-react'

export type RightTab = 'viewer' | 'catalog' | 'notes' | 'summary' | 'guidelines'

interface RightPanelTabsProps {
  activeTab: RightTab
  onSelectTab: (tab: RightTab) => void
  docsCount: number
}

export const RightPanelTabs: React.FC<RightPanelTabsProps> = ({
  activeTab,
  onSelectTab,
  docsCount,
}) => {
  const { t } = useTranslation()

  const tabs: Array<{
    id: RightTab
    label: string
    shortLabel: string
    icon: React.ComponentType<{ className?: string }>
  }> = [
    {
      id: 'viewer',
      label: t.doctor.tabs.viewer,
      shortLabel: t.doctor.tabs.viewer,
      icon: FileText,
    },
    {
      id: 'catalog',
      label: `${t.doctor.tabs.catalog} (${docsCount})`,
      shortLabel: `(${docsCount})`,
      icon: FolderKanban,
    },
    {
      id: 'summary',
      label: t.doctor.tabs.summary,
      shortLabel: t.doctor.tabs.summary,
      icon: Sparkles,
    },
    {
      id: 'guidelines',
      label: t.doctor.tabs.guidelines,
      shortLabel: t.doctor.tabs.guidelines,
      icon: ClipboardCheck,
    },
    {
      id: 'notes',
      label: t.doctor.tabs.notes,
      shortLabel: t.doctor.tabs.notes,
      icon: StickyNote,
    },
  ]

  return (
    <nav
      aria-label="Навигация на досието"
      className="h-11 px-2 sm:px-3 bg-white border-b border-slate-200 flex items-center gap-1 shrink-0 select-none overflow-x-auto scrollbar-none"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            title={tab.label}
            aria-label={tab.label}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              isActive
                ? 'bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{tab.label}</span>
            <span className="inline xl:hidden">{tab.shortLabel}</span>
          </button>
        )
      })}
    </nav>
  )
}
