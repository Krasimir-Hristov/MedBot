import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/features/auth/lib/session'
import { getDocumentsList } from '@/features/documents'
import { getChatMessages, getDoctorChatSessions } from '@/features/doctor/lib/chat-dal'
import { getDoctorNotes } from '@/features/doctor/lib/notes-dal'
import { getDossierSummaryState } from '@/features/dossier-summary/dal'
import { listGuidelineItems } from '@/features/patient-guidelines/dal'
import { DoctorPortalShell } from '@/features/doctor'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'MedBot | Πύλη Ιατρού – Clinical RAG Assistant',
  description: 'Δίγλωσσος ιατρικός βοηθός RAG και ογκολογικός φάκελος ασθενούς.',
}

const DoctorPortalSkeleton: React.FC = () => (
  <div className="h-screen w-full flex flex-col bg-slate-50 items-center justify-center text-slate-500">
    <Loader2 className="w-8 h-8 text-sky-600 animate-spin mb-3" />
    <p className="text-xs font-mono font-medium">Φόρτωση ογκολογικού φακέλου (MedBot)...</p>
  </div>
)

const DoctorPortalDataLoader: React.FC = async () => {
  const session = await getSession()
  if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
    redirect('/')
  }

  // Паралелно първоначално извличане от DAL слоя
  const [documents, sessions, notes, summaryState, guidelines] = await Promise.all([
    getDocumentsList(),
    getDoctorChatSessions(),
    getDoctorNotes(),
    getDossierSummaryState(),
    listGuidelineItems(),
  ])

  const initialMessages = sessions[0]
    ? await getChatMessages(sessions[0].sessionId)
    : []

  return (
    <DoctorPortalShell
      initialDocuments={documents}
      initialSessions={sessions}
      initialMessages={initialMessages}
      initialNotes={notes}
      initialSummary={summaryState.summary}
      initialStaleness={summaryState.staleness}
      initialGuidelines={guidelines}
    />
  )
}

const DoctorPortalPage: React.FC = () => {
  return (
    <Suspense fallback={<DoctorPortalSkeleton />}>
      <DoctorPortalDataLoader />
    </Suspense>
  )
}

export default DoctorPortalPage
