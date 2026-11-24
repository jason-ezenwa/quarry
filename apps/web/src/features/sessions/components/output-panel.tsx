import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import { DOCUMENT_KINDS, type DocumentKind, type SessionJob } from '@quarry/contracts'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isDocumentKind } from '../session-parts'
import { fitScoreQueryOptions } from '../sessions-api'
import { DOCUMENT_KIND_DISPLAY, EMPTY_TAB_COPY } from '../sessions.constants'
import type { OpenDocument } from '../sessions.types'
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

function DocumentSheet({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-117.5 rounded-xs bg-sheet px-5.5 py-6.5 shadow-sheet md:px-9.5 md:py-9">{children}</div>
  )
}

function FitScoreDocument({ sessionId, documentId, job }: { sessionId: string; documentId: string; job: SessionJob }) {
  const { data, isError } = useQuery(fitScoreQueryOptions(sessionId, documentId))

  if (isError) return <p className="text-small text-muted-foreground">We couldn't load this fit report.</p>
  if (!data) {
    return (
      <div aria-label="Loading fit report" className="flex flex-col gap-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return <FitReport report={data} job={job} />
}

function EmptyTab({ kind }: { kind: DocumentKind }) {
  return <p className="px-1 pt-2 text-small text-muted-foreground">{EMPTY_TAB_COPY[kind]}</p>
}

// The documents beside the chat: one tab per kind, each showing one document.
export function OutputPanel({ sessionId, job, tab, documents, onTabChange, onClose, fill = false }: OutputPanelProps) {
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
      {DOCUMENT_KINDS.map((kind) => {
        const document = documents[kind]
        return (
          <TabsContent key={kind} value={kind} className="min-h-0 overflow-y-auto px-3 pt-1 pb-7 md:px-7">
            {document ? (
              <div className="flex justify-center">
                <DocumentSheet>
                  {document.kind === 'fit-score' ? (
                    <FitScoreDocument sessionId={sessionId} documentId={document.id} job={job} />
                  ) : (
                    <p className="text-small text-muted-foreground">This document opens here in a coming update.</p>
                  )}
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
