import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/csr/DownloadSimple'
import { EXPORT_FORMATS, type ExportableKind, type ExportFormat } from '@quarry/contracts'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadExport } from '../sessions-api'
import { DOCUMENT_KIND_DISPLAY, EXPORT_FAILED_MESSAGE } from '../sessions.constants'

// PDF and DOCX downloads of the document a tab shows, rendered by the server from the saved copy.
export function ExportButtons({
  sessionId,
  kind,
  documentId,
}: {
  sessionId: string
  kind: ExportableKind
  documentId: string
}) {
  const download = useMutation({
    mutationFn: (format: ExportFormat) => downloadExport(sessionId, kind, documentId, format),
    onError: () => toast.error(EXPORT_FAILED_MESSAGE),
  })

  const label = DOCUMENT_KIND_DISPLAY[kind].label.toLowerCase()

  return (
    <>
      {EXPORT_FORMATS.map((format) => (
        <Button
          key={format}
          size="sm"
          loading={download.isPending && download.variables === format}
          disabled={download.isPending}
          aria-label={`Download ${label} as ${format.toUpperCase()}`}
          onClick={() => download.mutate(format)}
        >
          <DownloadSimpleIcon data-icon="inline-start" aria-hidden="true" />
          {format.toUpperCase()}
        </Button>
      ))}
    </>
  )
}
