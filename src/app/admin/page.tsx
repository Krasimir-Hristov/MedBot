import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/features/auth/lib/session'
import { getDocumentsList, type DocumentListItem } from '@/features/documents'
import { AdminDashboard, AdminDashboardSkeleton } from '@/features/admin'

export const metadata: Metadata = {
  title: 'Административен Панел | MedScan RAG',
  description:
    'Медицински административен панел за качване, OCR обработка и векторно индексиране на онкологично досие.',
}

/**
 * Асинхронен сървърен компонент с Defense in Depth проверка на сесията и
 * безопасно извличане на документите от Neon PostgreSQL.
 */
const AdminDashboardLoader: React.FC = async () => {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    redirect('/')
  }

  let documents: DocumentListItem[] = []
  let hasLoadError = false

  try {
    documents = await getDocumentsList()
  } catch (error) {
    console.error('Failed to load documents list for admin dashboard:', error)
    hasLoadError = true
  }

  return <AdminDashboard initialDocuments={documents} hasLoadError={hasLoadError} />
}

const AdminPage: React.FC = () => {
  return (
    <Suspense fallback={<AdminDashboardSkeleton />}>
      <AdminDashboardLoader />
    </Suspense>
  )
}

export default AdminPage
