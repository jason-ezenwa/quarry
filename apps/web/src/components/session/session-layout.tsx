import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

// A session page: the page header over a body that fills the rest of the screen.
function SessionFrame({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="session-frame" className={cn('flex h-svh flex-col md:h-[calc(100svh-1rem)]', className)} {...props} />
}

// The chat, with the outputs beside it on wide screens.
function SessionBody({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="session-body" className={cn('flex min-h-0 flex-1', className)} {...props} />
}

// The outputs beside the chat on wide screens.
function SessionAside({ className, ...props }: ComponentProps<'aside'>) {
  return (
    <aside
      data-slot="session-aside"
      className={cn('flex w-125 shrink-0 flex-col border-l border-border-soft bg-background texture-plaster 2xl:w-140', className)}
      {...props}
    />
  )
}

// The outputs over the page on narrower screens.
function OutputSheet({
  open,
  onOpenChange,
  className,
  ...props
}: ComponentProps<typeof SheetContent> & Pick<ComponentProps<typeof Sheet>, 'open' | 'onOpenChange'>) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="document"
        aria-describedby={undefined}
        className={cn('bg-background texture-plaster', className)}
        {...props}
      />
    </Sheet>
  )
}

function OutputSheetHeader({ className, ...props }: ComponentProps<'header'>) {
  return <header data-slot="output-sheet-header" className={cn('flex h-14 shrink-0 items-center gap-1 px-1.5', className)} {...props} />
}

function OutputSheetClose(props: Omit<ComponentProps<typeof Button>, 'children'>) {
  return (
    <Button data-slot="output-sheet-close" variant="ghost" size="icon-touch" aria-label="Close" {...props}>
      <XIcon aria-hidden="true" />
    </Button>
  )
}

// Balances the close button, keeping the title centred.
function OutputSheetSpacer() {
  return <span data-slot="output-sheet-spacer" className="size-11 shrink-0" />
}

function OutputSheetTitle({ className, ...props }: ComponentProps<typeof SheetTitle>) {
  return <SheetTitle data-slot="output-sheet-title" className={cn('flex-1 truncate text-center', className)} {...props} />
}

export { SessionFrame, SessionBody, SessionAside, OutputSheet, OutputSheetHeader, OutputSheetClose, OutputSheetTitle, OutputSheetSpacer }
