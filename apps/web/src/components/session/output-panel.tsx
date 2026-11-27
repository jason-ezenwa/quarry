import { SidebarSimpleIcon } from '@phosphor-icons/react/dist/csr/SidebarSimple'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

// A session's outputs: one tab each, every tab showing one output.
function OutputPanel({ className, ...props }: ComponentProps<typeof Tabs>) {
  return <Tabs data-slot="output-panel" className={cn('flex min-h-0 flex-1 flex-col gap-0', className)} {...props} />
}

// The row holding the tabs and any panel actions.
function OutputPanelBar({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="output-panel-bar"
      className={cn('flex h-13 shrink-0 items-center gap-2.5 px-4 md:pr-2.5 md:pl-3.5', className)}
      {...props}
    />
  )
}

// fill stretches the tabs across the width, as on phones.
function OutputPanelTabs(props: ComponentProps<typeof TabsList>) {
  return <TabsList data-slot="output-panel-tabs" {...props} />
}

function OutputPanelTab(props: ComponentProps<typeof TabsTrigger>) {
  return <TabsTrigger data-slot="output-panel-tab" {...props} />
}

// Opens the outputs from the page header: the panel beside the chat, or the sheet over the page on phones.
function OutputPanelOpen(props: Omit<ComponentProps<typeof Button>, 'children'>) {
  return (
    <Button data-slot="output-panel-open" variant="ghost" size="icon" aria-label="Open panel" {...props}>
      <SidebarSimpleIcon aria-hidden="true" />
    </Button>
  )
}

function OutputPanelClose({ className, ...props }: Omit<ComponentProps<typeof Button>, 'children'>) {
  return (
    <Button
      data-slot="output-panel-close"
      variant="ghost"
      size="icon-sm"
      aria-label="Close panel"
      className={cn('ml-auto', className)}
      {...props}
    >
      <XIcon aria-hidden="true" />
    </Button>
  )
}

// Under the tabs: the shown output's name, then its actions.
function OutputPanelToolbar({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="output-panel-toolbar"
      className={cn('flex min-h-control-sm shrink-0 items-center gap-1.5 px-4 pb-2 md:pr-2.5 md:pl-3.5', className)}
      {...props}
    />
  )
}

function OutputPanelName({ className, ...props }: ComponentProps<'span'>) {
  return <span data-slot="output-panel-name" className={cn('mr-auto min-w-0 truncate text-label text-muted-foreground', className)} {...props} />
}

function OutputPanelContent({ className, ...props }: ComponentProps<typeof TabsContent>) {
  return <TabsContent data-slot="output-panel-content" className={cn('min-h-0 overflow-y-auto px-3 pt-1 pb-7 md:px-7', className)} {...props} />
}

// The output drawn as a page that fills its tab, so it grows with the panel.
function OutputPanelPage({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div className="flex justify-center">
      <div
        data-slot="output-panel-page"
        className={cn('w-full rounded-xs bg-sheet px-5.5 py-6.5 shadow-sheet md:px-9.5 md:py-9', className)}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

// A line of text in place of an output: before there is one, or when it can't load.
function OutputPanelMessage({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot="output-panel-message" className={cn('text-small text-muted-foreground', className)} {...props} />
}

// While an output loads. Name what loads in aria-label.
function OutputPanelLoading({ className, ...props }: Omit<ComponentProps<'div'>, 'children'>) {
  return (
    <div data-slot="output-panel-loading" className={cn('flex flex-col gap-4', className)} {...props}>
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

export {
  OutputPanel,
  OutputPanelBar,
  OutputPanelTabs,
  OutputPanelTab,
  OutputPanelOpen,
  OutputPanelClose,
  OutputPanelToolbar,
  OutputPanelName,
  OutputPanelContent,
  OutputPanelPage,
  OutputPanelMessage,
  OutputPanelLoading,
}
