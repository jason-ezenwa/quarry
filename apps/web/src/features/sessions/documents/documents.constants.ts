import type { DocumentKind, FitDimension, FitLabel } from '@quarry/contracts'
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/csr/EnvelopeSimple'
import { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText'
import { GaugeIcon } from '@phosphor-icons/react/dist/csr/Gauge'
import type { IconComponent } from '@/components/session/session.types'

// The three kinds are the only document list the web app keeps: each picks a
// card's look, the panel tab and the route that fetches it.
export const DOCUMENT_KIND_DISPLAY: Record<DocumentKind, { label: string; icon: IconComponent }> = {
  'fit-score': { label: 'Fit report', icon: GaugeIcon },
  resume: { label: 'Resume', icon: FileTextIcon },
  'cover-letter': { label: 'Cover letter', icon: EnvelopeSimpleIcon },
}

export const FIT_LABEL_TEXT: Record<FitLabel, string> = {
  'strong-fit': 'Strong fit',
  'good-fit': 'Good fit',
  'weak-fit': 'Weak fit',
}

export const FIT_DIMENSION_NAMES: Record<FitDimension, string> = {
  requirements: 'Requirements',
  skills: 'Skills',
  seniority: 'Seniority',
  domain: 'Domain',
}

// What each panel tab says before it has a document.
export const EMPTY_TAB_COPY: Record<DocumentKind, string> = {
  'fit-score': 'Your fit report shows here once it is scored.',
  resume: 'Ask for a tailored resume and it shows here.',
  'cover-letter': 'Ask for a cover letter and it shows here.',
}

export const EXPORT_FAILED_MESSAGE = "We couldn't download it. Try again."
