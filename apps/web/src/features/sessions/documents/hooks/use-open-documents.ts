import { DOCUMENT_KINDS, isDocumentKind, type DocumentKind } from '@quarry/contracts'
import type { UIMessage } from 'ai'
import { useState } from 'react'
import { latestDocuments } from '../../session-parts'
import type { DocumentAnnouncement } from '../../sessions.types'
import type { OpenDocument, OutputTab } from '../documents.types'

// The panel's tab and the document each tab shows. A document opened from a card stays
// until a newer one of its kind arrives; otherwise each tab shows the newest of its kind.
export function useOpenDocuments(messages: UIMessage[]) {
  const [tab, setTab] = useState<OutputTab>('fit-score')
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

  // The document the open tab shows; none on the Interviews tab.
  const shown = isDocumentKind(tab) ? documents[tab] : undefined

  function changeTab(next: OutputTab) {
    setTab(next)
    setPinned(null)
  }

  return { tab, documents, shown, open, changeTab }
}
