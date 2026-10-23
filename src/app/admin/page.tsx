import React from 'react'
import type { Metadata } from 'next'
import { logoutAction } from '@/features/auth'
import { LogOut, ShieldAlert } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Административен панел | MedScan RAG',
}

const AdminPortalPage: React.FC = () => {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col">
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Административен панел (Admin)</h1>
            <p className="text-xs text-slate-400">Управление и качване на сканирани документи</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Изход от системата"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-colors cursor-pointer text-slate-300 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            <span>Изход</span>
          </button>
        </form>
      </header>

      <div className="flex-1 flex items-center justify-center">
        <div className="p-8 bg-slate-800/50 border border-slate-700/60 rounded-3xl max-w-lg text-center">
          <h2 className="text-lg font-semibold text-teal-400 mb-2">Стъпка 1 е готова! 🎉</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Успешно се автентицирахте с Администраторския ПИН код през защитен `jose` JWT токен.
            В Стъпка 2 тук ще се намира интерфейсът за качване и семантичен анализ на документи.
          </p>
        </div>
      </div>
    </main>
  )
}

export default AdminPortalPage
