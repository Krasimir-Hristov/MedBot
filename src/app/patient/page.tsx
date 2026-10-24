import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { requireRoles } from '@/features/auth/lib/role-guard'
import { PatientPortalShell } from '@/features/patient'
import { getPatientPortalData } from '@/features/patient/dal'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Здравен портал за пациента | MedBot',
  description: 'Личен медицински асистент и препоръки от лекуващия онколог.',
}

const PatientPortalSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#f8f9ff] flex flex-col items-center justify-center p-6 space-y-4 text-sky-800">
    <Loader2 className="w-10 h-10 animate-spin text-sky-600" />
    <p className="text-base font-semibold">Зареждане на здравния портал...</p>
  </div>
)

const PatientContent: React.FC = async () => {
  // 1. Проверка на ролята (Defense in Depth)
  await requireRoles(['patient', 'admin'] as const)

  // 2. Зареждане на данни от Neon
  const portalData = await getPatientPortalData()

  return <PatientPortalShell initialData={portalData} />
}

const PatientPage: React.FC = () => {
  return (
    <Suspense fallback={<PatientPortalSkeleton />}>
      <PatientContent />
    </Suspense>
  )
}

export default PatientPage
