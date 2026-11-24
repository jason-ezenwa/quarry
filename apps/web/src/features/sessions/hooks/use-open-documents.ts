import { DOCUMENT_KINDS, type DocumentKind } from '@quarry/contracts'
import type { UIMessage } from 'ai'
import { useState } from 'react'
import { latestDocuments } from '../session-parts'
import type { DocumentAnnouncement, OpenDocument } from '../sessions.types'

// The panel's tab and the document each tab shows. A document opened from a card stays
// until a newer one of its kind arrives; otherwise each tab shows the newest of its kind.
export function useOpenDocuments(messages: UIMessage[]) {
  const [tab, setTab] = useState<DocumentKind>('fit-score')
  const [pinned, setPinned] = useState<{ document: OpenDocument; newestWhenOpened: string | undefined } | null>(null)

  const latest = latestDocuments(messages)
  const documents: Partial<Record<DocumentKind, OpenDocument>> = Object.fromEntries(
    DOCUMENT_KINDS.map((kind) => {
      const keepPinned = pinned?.document.kind === kind && latest[kind]?.id === pinned.newestWhenOpened
      return [kind, keepPinned ? pinned.document : latest[kind]]
    }),
  )

  function open({ kind, id, name }: DocumentAnnouncement) {
    setPinned({ document: { kind, id, name }, newestWhenOpened: latest[kind]?.id })
    setTab(kind)
  }

  function changeTab(next: DocumentKind) {
    setTab(next)
    setPinned(null)
  }

  return { tab, documents, open, changeTab }
}
