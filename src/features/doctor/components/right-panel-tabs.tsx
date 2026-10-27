'use client'

import React from 'react'
import { useTranslation } from '@/features/i18n'
import { FileText, FolderKanban, StickyNote, Sparkles, ClipboardList } from 'lucide-react'

export type RightTab = 'summary' | 'viewer' | 'catalog' | 'guidelines' | 'notes'

interface RightPanelTabsProps {
  activeTab: RightTab
  onSelectTab: (tab: RightTab) => void
  docsCount: number
  notesCount?: number
}

export const RightPanelTabs: React.FC<RightPanelTabsProps> = ({
  activeTab,
  onSelectTab,
  docsCount,
  notesCount = 0,
}) => {
  const { t } = useTranslation()

  const tabs: Array<{
    id: RightTab
    label: string
    shortLabel: string
    icon: React.ComponentType<{ className?: string }>
    isSpecial?: boolean
  }> = [
    {
      id: 'summary',
      label: t.doctor.tabs.summary,
      shortLabel: t.doctor.tabs.summary,
      icon: Sparkles,
      isSpecial: true,
    },
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
      id: 'guidelines',
      label: t.doctor.tabs.guidelines,
      shortLabel: t.doctor.tabs.guidelines,
      icon: ClipboardList,
    },
    {
      id: 'notes',
      label: notesCount > 0 ? `${t.doctor.tabs.notes} (${notesCount})` : t.doctor.tabs.notes,
      shortLabel: notesCount > 0 ? `(${notesCount})` : t.doctor.tabs.notes,
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
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              isActive
                ? tab.isSpecial
                  ? 'bg-linear-to-r from-sky-50 to-cyan-50 text-sky-800 border border-sky-300 shadow-2xs font-bold'
                  : 'bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs'
                : tab.isSpecial
                  ? 'text-sky-700 bg-sky-50/50 hover:bg-sky-50 border border-transparent hover:border-sky-200'
                  : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon
              className={`w-3.5 h-3.5 ${
                tab.isSpecial ? 'text-cyan-600 animate-pulse' : ''
              }`}
            />
            <span className="hidden xl:inline">{tab.label}</span>
            <span className="inline xl:hidden">{tab.shortLabel}</span>
          </button>
        )
      })}
    </nav>
  )
}
