import { XIcon } from '@phosphor-icons/react/dist/csr/X'
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { documentQueryOptions } from '../sessions-api'
import { DOCUMENT_KIND_DISPLAY, EMPTY_TAB_COPY } from '../sessions.constants'
import type { OpenDocument } from '../sessions.types'
import { CoverLetter } from './cover-letter'
import { ExportButtons } from './export-buttons'
import { FitReport } from './fit-report'

type OutputPanelProps = {
  sessionId: string
  job: SessionJob
  tab: DocumentKind
  // The document each tab shows: the one opened from a card, else the newest of its kind.
  documents: Partial<Record<DocumentKind, OpenDocument>>
  onTabChange: (tab: DocumentKind) => void
  onClose: () => void
  // Phones show the tabs across the width.
  fill?: boolean
}

function isExportable(document: OpenDocument): document is OpenDocument & { kind: ExportableKind } {
  return isExportableKind(document.kind)
}

function DocumentSheet({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-117.5 rounded-xs bg-sheet px-5.5 py-6.5 shadow-sheet md:px-9.5 md:py-9">{children}</div>
  )
}

// Fetched by id when it opens; the response's kind picks how it is drawn.
function DocumentContent({ sessionId, document, job }: { sessionId: string; document: OpenDocument; job: SessionJob }) {
  const { data, isError } = useQuery(documentQueryOptions(sessionId, document.kind, document.id))
  const label = DOCUMENT_KIND_DISPLAY[document.kind].label.toLowerCase()

  if (isError) return <p className="text-small text-muted-foreground">{`We couldn't load this ${label}.`}</p>
  if (!data) {
    return (
      <div aria-label={`Loading ${label}`} className="flex flex-col gap-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

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
function ExportRow({ sessionId, document }: { sessionId: string; document: OpenDocument & { kind: ExportableKind } }) {
  const { isError } = useQuery(documentQueryOptions(sessionId, document.kind, document.id))
  if (isError) return null

  return (
    <div className="flex shrink-0 items-center gap-1.5 px-4 pb-2 md:pr-2.5 md:pl-3.5">
      <span className="mr-auto min-w-0 truncate text-label text-muted-foreground">{document.name}</span>
      <ExportButtons sessionId={sessionId} kind={document.kind} documentId={document.id} />
    </div>
  )
}

function EmptyTab({ kind }: { kind: DocumentKind }) {
  return <p className="px-1 pt-2 text-small text-muted-foreground">{EMPTY_TAB_COPY[kind]}</p>
}

// The documents beside the chat: one tab per kind, each showing one document.
export function OutputPanel({ sessionId, job, tab, documents, onTabChange, onClose, fill = false }: OutputPanelProps) {
  const shown = documents[tab]

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (isDocumentKind(value)) onTabChange(value)
      }}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <div className="flex h-13 shrink-0 items-center gap-2.5 px-4 md:pr-2.5 md:pl-3.5">
        <TabsList fill={fill} aria-label="Outputs">
          {DOCUMENT_KINDS.map((kind) => {
            const { label, icon: KindIcon } = DOCUMENT_KIND_DISPLAY[kind]
            return (
              <TabsTrigger key={kind} value={kind}>
                {fill ? null : <KindIcon aria-hidden="true" />}
                {label}
              </TabsTrigger>
            )
          })}
        </TabsList>
        {fill ? null : (
          <Button variant="ghost" size="icon-sm" aria-label="Close panel" className="ml-auto" onClick={onClose}>
            <XIcon aria-hidden="true" />
          </Button>
        )}
      </div>
      {shown && isExportable(shown) ? (
        <ExportRow key={`${shown.kind}/${shown.id}`} sessionId={sessionId} document={shown} />
      ) : null}
      {DOCUMENT_KINDS.map((kind) => {
        const document = documents[kind]
        return (
          <TabsContent key={kind} value={kind} className="min-h-0 overflow-y-auto px-3 pt-1 pb-7 md:px-7">
            {document ? (
              <div className="flex justify-center">
                <DocumentSheet>
                  <DocumentContent sessionId={sessionId} document={document} job={job} />
                </DocumentSheet>
              </div>
            ) : (
              <EmptyTab kind={kind} />
            )}
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
