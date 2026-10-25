'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText } from 'lucide-react'

interface ClinicalMarkdownProps {
  content: string
  /** Извиква се при клик върху цитат `/api/doc/ID`. */
  onSelectDocument: (docId: number) => void
}

/**
 * Markdown с кликаеми цитати към документите (`[📄 Заглавие (Дата)](/api/doc/ID)`).
 * Ползва се от чата, обобщението на досието и обясненията към насоките.
 */
export const ClinicalMarkdown: React.FC<ClinicalMarkdownProps> = ({ content, onSelectDocument }) => {
  const renderLink = (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const href = props.href || ''
    const match = href.match(/\/api\/doc\/(\d+)/)

    if (match && match[1]) {
      const docId = parseInt(match[1], 10)
      return (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onSelectDocument(docId)
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 my-0.5 mx-1 bg-white hover:bg-sky-50 text-sky-800 border border-sky-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors align-middle cursor-pointer"
          title="Преглед на документа в десния панел"
          aria-label="Преглед на документа в десния панел"
        >
          <FileText className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span className="truncate max-w-[220px]">{props.children}</span>
        </button>
      )
    }

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-700 underline hover:text-sky-900"
      >
        {props.children}
      </a>
    )
  }

  return (
    <div className="prose prose-slate prose-sm max-w-none text-slate-800 leading-relaxed font-sans">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: renderLink }}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
