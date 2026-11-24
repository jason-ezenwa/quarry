import {
  DOCUMENT_KINDS,
  isDocumentKind,
  isExportableKind,
  type DocumentKind,
  type ExportableKind,
  type SessionJob,
} from '@quarry/contracts'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ResumeDocument } from '@/components/resume/resume-document'
import {
  OutputPanel,
  OutputPanelBar,
  OutputPanelContent,
  OutputPanelLoading,
  OutputPanelMessage,
  OutputPanelName,
  OutputPanelPage,
  OutputPanelTab,
  OutputPanelTabs,
  OutputPanelToolbar,
} from '@/components/session/output-panel'
import { documentQueryOptions } from '../../sessions-api'
import { DOCUMENT_KIND_DISPLAY, EMPTY_TAB_COPY } from '../documents.constants'
import type { OpenDocument } from '../documents.types'
import { CoverLetter } from './cover-letter'
import { ExportButtons } from './export-buttons'
import { FitReport } from './fit-report'

function isExportable(document: OpenDocument): document is OpenDocument & { kind: ExportableKind } {
  return isExportableKind(document.kind)
}

// Fetched by id when it opens; the response's kind picks how it is drawn.
function DocumentContent({ sessionId, document, job }: { sessionId: string; document: OpenDocument; job: SessionJob }) {
  const { data, isError } = useQuery(documentQueryOptions(sessionId, document.kind, document.id))
  const label = DOCUMENT_KIND_DISPLAY[document.kind].label.toLowerCase()

  if (isError) return <OutputPanelMessage>{`We couldn't load this ${label}.`}</OutputPanelMessage>
  if (!data) return <OutputPanelLoading aria-label={`Loading ${label}`} />

  switch (data.kind) {
    case 'fit-score':
      return <FitReport report={data} job={job} />
    case 'resume':
      return <ResumeDocument variant="inset" resume={data.resume} aria-label={`Resume: ${data.name}`} />
    case 'cover-letter':
      return <CoverLetter letter={data} />
  }
}

// The shown document's name and its downloads, under the tabs. Left out when the document couldn't load.
function ExportToolbar({ sessionId, document }: { sessionId: string; document: OpenDocument & { kind: ExportableKind } }) {
  const { isError } = useQuery(documentQueryOptions(sessionId, document.kind, document.id))
  if (isError) return null

  return (
    <OutputPanelToolbar>
      <OutputPanelName>{document.name}</OutputPanelName>
      <ExportButtons sessionId={sessionId} kind={document.kind} documentId={document.id} />
    </OutputPanelToolbar>
  )
}

// The documents a session saved: one tab per kind, each showing one document. The children
// fill the bar: a tab list, and any actions beside it.
export function DocumentPanel({
  sessionId,
  job,
  tab,
  documents,
  onTabChange,
  children,
}: {
  sessionId: string
  job: SessionJob
  tab: DocumentKind
  // The document each tab shows: the one opened from a card, else the newest of its kind.
  documents: Partial<Record<DocumentKind, OpenDocument>>
  onTabChange: (tab: DocumentKind) => void
  children: ReactNode
}) {
  const shown = documents[tab]

  return (
    <OutputPanel
      value={tab}
      onValueChange={(value) => {
        if (isDocumentKind(value)) onTabChange(value)
      }}
    >
      <OutputPanelBar>{children}</OutputPanelBar>
      {shown && isExportable(shown) ? (
        <ExportToolbar key={`${shown.kind}/${shown.id}`} sessionId={sessionId} document={shown} />
      ) : null}
      {DOCUMENT_KINDS.map((kind) => {
        const document = documents[kind]

        return (
          <OutputPanelContent key={kind} value={kind}>
            {document ? (
              <OutputPanelPage>
                <DocumentContent sessionId={sessionId} document={document} job={job} />
              </OutputPanelPage>
            ) : (
              <OutputPanelMessage className="px-1 pt-2">{EMPTY_TAB_COPY[kind]}</OutputPanelMessage>
            )}
          </OutputPanelContent>
        )
      })}
    </OutputPanel>
  )
}

// One tab per kind, each with its icon, for the panel beside the chat.
export function DocumentTabs() {
  return (
    <OutputPanelTabs aria-label="Outputs">
      {DOCUMENT_KINDS.map((kind) => {
        const { label, icon: KindIcon } = DOCUMENT_KIND_DISPLAY[kind]

        return (
          <OutputPanelTab key={kind} value={kind}>
            <KindIcon aria-hidden="true" />
            {label}
          </OutputPanelTab>
        )
      })}
    </OutputPanelTabs>
  )
}

// The tabs across the width with no icons, for phones.
export function DocumentTabsFullWidth() {
  return (
    <OutputPanelTabs fill aria-label="Outputs">
      {DOCUMENT_KINDS.map((kind) => (
        <OutputPanelTab key={kind} value={kind}>
          {DOCUMENT_KIND_DISPLAY[kind].label}
        </OutputPanelTab>
      ))}
    </OutputPanelTabs>
  )
}
