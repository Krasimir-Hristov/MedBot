'use client'

import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalShellProps {
  title: string
  closeLabel: string
  onClose: () => void
  /** Tailwind клас за максималната ширина на панела */
  widthClass?: string
  children: React.ReactNode
}

/**
 * Достъпна модална обвивка: role="dialog", затваряне с Escape/клик извън панела,
 * фокус върху бутона за затваряне при отваряне.
 */
export const ModalShell: React.FC<ModalShellProps> = ({
  title,
  closeLabel,
  onClose,
  widthClass = 'max-w-lg',
  children,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-xs sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-full w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl ${widthClass}`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="truncate text-base font-semibold text-slate-900">{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="cursor-pointer rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </section>
    </div>
  )
}
