'use client'

import React, { useState, useCallback } from 'react'
import { useTranslation } from '@/features/i18n'
import type { DocumentCatalogItem } from '@/features/documents'
import type { ChatMessage, ChatSession, DoctorNote } from '@/lib/db/schema'
import type { DossierSummaryState } from '@/features/dossier-summary'
import { DossierSummaryTab } from '@/features/dossier-summary'
import type { PatientGuidelineItemEntity } from '@/features/patient-guidelines'
import { GuidelinesTab } from '@/features/patient-guidelines'
import { useDoctorChat } from '../hooks/use-doctor-chat'
import { DoctorHeader } from './doctor-header'
import { QuickPromptsBar } from './quick-prompts-bar'
import { ChatSessionsDrawer } from './chat-sessions-drawer'
import { ChatMessageList } from './chat-message-list'
import { ChatInputBar } from './chat-input-bar'
import { DocumentViewer } from './document-viewer'
import { DocumentsCatalogTab } from './documents-catalog-tab'
import { DoctorNotesTab } from './doctor-notes-tab'
import { QuickUploadDropzone } from './quick-upload-dropzone'
import { MobileDocumentSheet } from './mobile-document-sheet'
import { RightPanelTabs, type RightTab } from './right-panel-tabs'

interface DoctorPortalShellProps {
  initialDocuments: DocumentCatalogItem[]
  initialSessions: ChatSession[]
  initialMessages: ChatMessage[]
  initialNotes: DoctorNote[]
  initialSummaryState?: DossierSummaryState
  initialGuidelines?: PatientGuidelineItemEntity[]
}

export const DoctorPortalShell: React.FC<DoctorPortalShellProps> = ({
  initialDocuments,
  initialSessions,
  initialMessages,
  initialNotes,
  initialSummaryState = { summary: null, staleness: { newCount: 0, removedCount: 0 } },
  initialGuidelines = [],
}) => {
  const { t, locale } = useTranslation()

  // State
  const [documents, setDocuments] = useState<DocumentCatalogItem[]>(initialDocuments)
  const [selectedDocId, setSelectedDocId] = useState<number | undefined>(initialDocuments[0]?.id)
  const [notes, setNotes] = useState<DoctorNote[]>(initialNotes)
  const [summaryState] = useState<DossierSummaryState>(initialSummaryState)
  const [guidelines] = useState<PatientGuidelineItemEntity[]>(initialGuidelines)
  const [rightTab, setRightTab] = useState<RightTab>(
    initialSummaryState.summary ? 'summary' : initialDocuments.length > 0 ? 'viewer' : 'summary'
  )
  const [isSessionsOpen, setIsSessionsOpen] = useState(false)
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)
  const [mobileMode, setMobileMode] = useState<'document' | 'summary'>('document')

  const {
    sessions,
    activeSessionId,
    messages,
    isThinking,
    streamingContent,
    selectSession,
    createNewSession,
    renameSession,
    deleteSession,
    sendMessage,
  } = useDoctorChat({
    initialSessions,
    initialMessages,
    locale,
    errorMessage: t.doctor.chat.error,
  })

  const selectedDocument = documents.find((d) => d.id === selectedDocId) || null

  const handleSelectDocument = useCallback((docId: number) => {
    setSelectedDocId(docId)
    setRightTab('viewer')
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileMode('document')
      setIsMobileSheetOpen(true)
    }
  }, [])

  const handleOpenSummary = useCallback(() => {
    setRightTab('summary')
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileMode('summary')
      setIsMobileSheetOpen(true)
    }
  }, [])

  // Запис на лекарска бележка
  const handleSaveNote = useCallback(async (noteText: string) => {
    const res = await fetch('/api/doctor/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: noteText }),
    })
    if (res.ok) {
      const data = await res.json()
      setNotes((prev) => [data.note, ...prev])
    }
  }, [])

  // Изтриване на лекарска бележка
  const handleDeleteNote = useCallback(async (noteId: number) => {
    const res = await fetch(`/api/doctor/notes?id=${noteId}`, { method: 'DELETE' })
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    }
  }, [])

  // Презареждане на бележките след публикуване на нови насоки
  const handlePublishedSuccess = useCallback(async () => {
    try {
      const notesRes = await fetch('/api/doctor/notes')
      if (notesRes.ok) {
        const notesData = await notesRes.json()
        setNotes(notesData.notes || [])
      }
    } catch (err) {
      console.warn('Could not refresh notes:', err)
    }
  }, [])

  // Успешно качване на документ
  const handleUploadSuccess = useCallback(
    async (newDoc: DocumentCatalogItem, patientNoteCreated?: boolean) => {
      setDocuments((prev) => [newDoc, ...prev])
      setSelectedDocId(newDoc.id)
      setRightTab('viewer')

      if (patientNoteCreated) {
        await handlePublishedSuccess()
      }
    },
    [handlePublishedSuccess]
  )

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden text-slate-900 font-sans antialiased">
      <DoctorHeader totalDocs={documents.length} />

      <main className="flex-1 flex overflow-hidden">
        {/* Лява колона: 60% RAG Чат (Desktop) / 100% (Mobile) */}
        <section className="w-full lg:w-[60%] flex flex-col bg-slate-50 border-r border-slate-200 h-full overflow-hidden relative">
          <QuickPromptsBar
            onSelectPrompt={sendMessage}
            onToggleSessions={() => setIsSessionsOpen((prev) => !prev)}
            onNewSession={createNewSession}
            onOpenSummary={handleOpenSummary}
            disabled={isThinking}
          />

          <ChatMessageList
            messages={messages}
            streamingContent={streamingContent}
            isThinking={isThinking}
            onSelectDocument={handleSelectDocument}
          />

          <ChatInputBar
            onSendMessage={sendMessage}
            disabled={isThinking}
          />

          <ChatSessionsDrawer
            isOpen={isSessionsOpen}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onClose={() => setIsSessionsOpen(false)}
            onSelectSession={selectSession}
            onRenameSession={renameSession}
            onDeleteSession={deleteSession}
          />
        </section>

        {/* Дясна колона: 40% Обобщение / Преглед / Каталог / Насоки / Бележки */}
        <aside className="hidden lg:flex w-[40%] flex-col bg-white h-full overflow-hidden border-l border-slate-200/50">
          <RightPanelTabs
            activeTab={rightTab}
            onSelectTab={setRightTab}
            docsCount={documents.length}
            notesCount={notes.length}
          />

          {/* Tab съдържание */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {rightTab === 'summary' && (
              <DossierSummaryTab
                initialSummary={summaryState.summary}
                initialStaleness={summaryState.staleness}
                docsCount={documents.length}
                onSelectDocument={handleSelectDocument}
              />
            )}
            {rightTab === 'viewer' && (
              <DocumentViewer key={selectedDocument?.id} document={selectedDocument} />
            )}
            {rightTab === 'catalog' && (
              <DocumentsCatalogTab
                documents={documents}
                selectedDocId={selectedDocId}
                onSelectDocument={handleSelectDocument}
              />
            )}
            {rightTab === 'guidelines' && (
              <GuidelinesTab
                initialItems={guidelines}
                onSelectDocument={handleSelectDocument}
                onPublishedSuccess={handlePublishedSuccess}
              />
            )}
            {rightTab === 'notes' && (
              <DoctorNotesTab
                notes={notes}
                onSaveNote={handleSaveNote}
                onDeleteNote={handleDeleteNote}
              />
            )}
          </div>

          {/* Долна Dropzone зона за бързо качване на нови файлове от лекаря */}
          <QuickUploadDropzone onUploadSuccess={handleUploadSuccess} />
        </aside>
      </main>

      {/* Мобилен Sheet за преглед на документи или обобщение без напускане на чата */}
      <MobileDocumentSheet
        isOpen={isMobileSheetOpen}
        document={selectedDocument}
        mode={mobileMode}
        summaryState={summaryState}
        docsCount={documents.length}
        onSelectDocument={handleSelectDocument}
        onClose={() => setIsMobileSheetOpen(false)}
      />
    </div>
  )
}
