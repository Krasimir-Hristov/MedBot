export interface DossierSummaryItem {
  id: number
  contentEl: string
  documentIds: number[]
  documentCount: number
  truncatedDocCount: number
  model: string
  createdAt: string
}

/** Колко документа са добавени/изтрити след последното обобщение. */
export interface SummaryStaleness {
  newCount: number
  removedCount: number
}

export interface DossierSummaryState {
  summary: DossierSummaryItem | null
  staleness: SummaryStaleness
}
