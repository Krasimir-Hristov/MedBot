import React from 'react'
import type { Metadata } from 'next'
import { PinForm, HomeFooter } from '@/features/auth'

export const metadata: Metadata = {
  title: 'Вход с ПИН | MedScan RAG',
  description: 'Сигурен двуезичен портал за онкологично досие и медицински изследвания.',
}

const HomePage: React.FC = () => {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 selection:bg-teal-500 selection:text-white relative overflow-hidden">
      {/* Декоративни фонови светлини */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Контейнер за формата и футера */}
      <div className="relative z-10 w-full flex flex-col items-center">
        <PinForm />
        <HomeFooter />
      </div>
    </main>
  )
}

export default HomePage
