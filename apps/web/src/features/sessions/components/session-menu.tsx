import { ArchiveIcon } from '@phosphor-icons/react/dist/csr/Archive'
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise'
import { DotsThreeIcon } from '@phosphor-icons/react/dist/csr/DotsThree'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useSetArchived } from '../hooks/use-sessions'

// The header's More menu. Archiving keeps everything and never gives back a monthly slot.
export function SessionMenu({ sessionId, archived }: { sessionId: string; archived: boolean }) {
  const setArchived = useSetArchived(sessionId)

  function toggle() {
    setArchived.mutate(!archived, {
      onError: () => toast.error(archived ? "We couldn't unarchive this application." : "We couldn't archive this application."),
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="More" disabled={setArchived.isPending}>
          <DotsThreeIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={toggle}>
          {archived ? <ArrowCounterClockwiseIcon aria-hidden="true" /> : <ArchiveIcon aria-hidden="true" />}
          {archived ? 'Unarchive' : 'Archive'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
