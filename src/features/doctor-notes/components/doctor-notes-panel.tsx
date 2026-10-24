'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Stethoscope } from 'lucide-react'
import type { DoctorNoteItem } from '../types'
import { DoctorNoteComposer } from './doctor-note-composer'
import { DoctorNotesList } from './doctor-notes-list'

interface DoctorNotesPanelProps {
  initialNotes: DoctorNoteItem[]
}

export const DoctorNotesPanel: React.FC<DoctorNotesPanelProps> = ({ initialNotes }) => {
  const router = useRouter()
  const notes = initialNotes

  const handleRefresh = () => {
    router.refresh()
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-cyan-500/15 text-cyan-400 rounded-xl">
          <Stethoscope className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100">
            Лекарски бележки и предписания (Σημειώσεις & Οδηγίες)
          </h2>
          <p className="text-xs text-slate-400">
            Въвеждайте терапевтични насоки, диети и гимнастика. AI автоматично ги превежда за пациента.
          </p>
        </div>
      </div>

      {/* Форма за въвеждане / качване */}
      <DoctorNoteComposer onSuccess={handleRefresh} />

      {/* Списък с публикуваните препоръки */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Публикувани препоръки ({notes.length})
        </h3>
        <DoctorNotesList notes={notes} onDeleteSuccess={handleRefresh} />
      </div>
    </section>
  )
}
