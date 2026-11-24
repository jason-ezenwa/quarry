import type { DocumentKind } from '@quarry/contracts'

// What a panel tab shows: its name heads the tab's exports.
export type OpenDocument = { kind: DocumentKind; id: string; name: string }
