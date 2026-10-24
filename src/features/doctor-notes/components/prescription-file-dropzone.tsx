'use client'

import React from 'react'
import { FileUp, Paperclip, X } from 'lucide-react'

interface PrescriptionFileDropzoneProps {
  selectedFile: File | null
  onFileSelect: (file: File | null) => void
  disabled?: boolean
}

export const PrescriptionFileDropzone: React.FC<PrescriptionFileDropzoneProps> = ({
  selectedFile,
  onFileSelect,
  disabled = false,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    onFileSelect(file)
  }

  return (
    <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-4 text-center bg-slate-900/40 transition-all">
      <input
        type="file"
        id="prescription-file-input"
        disabled={disabled}
        accept=".pdf,image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      {selectedFile ? (
        <div className="flex items-center justify-between bg-slate-800 p-2.5 rounded-lg">
          <div className="flex items-center gap-2 truncate">
            <Paperclip className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs text-slate-200 truncate">{selectedFile.name}</span>
            <span className="text-[11px] text-slate-400">
              ({(selectedFile.size / 1024).toFixed(0)} KB)
            </span>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onFileSelect(null)}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor="prescription-file-input"
          className="cursor-pointer flex flex-col items-center gap-1.5"
        >
          <FileUp className="w-7 h-7 text-cyan-400/80" />
          <span className="text-xs font-semibold text-slate-200">
            Изберете протокол за терапия, диета или упражнения (PDF или снимка)
          </span>
          <span className="text-[11px] text-slate-500">До 5MB • Автоматичен OCR анализ</span>
        </label>
      )}
    </div>
  )
}
