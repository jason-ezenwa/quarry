import type { DocumentKind } from '@quarry/contracts'
import type { INTERVIEWS_TAB } from '../interviews/interviews.constants'

// What a panel tab shows: its name heads the tab's exports.
export type OpenDocument = { kind: DocumentKind; id: string; name: string }

// The application output panel's tabs: one per document kind, then its interviews.
export type OutputTab = DocumentKind | typeof INTERVIEWS_TAB
