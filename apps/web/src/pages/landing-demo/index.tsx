import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { demoFrames } from '@/features/landing/demo/demo-script'
import { DEMO_SESSION, DEMO_TURNS } from '@/features/landing/demo/demo.constants'
import { createDemoQueryClient } from '@/features/landing/demo/demo-query-client'
import { useDemoChat } from '@/features/landing/demo/hooks/use-demo-chat'
import { SessionScreen } from '@/features/sessions/components/session-view'
import { AppLayout } from '@/layouts/app-layout'

const FRAMES = demoFrames(DEMO_TURNS)

// The real app frame on made-up data, which the landing page shows in a scaled-down frame.
export function LandingDemoLayout() {
  const [client] = useState(createDemoQueryClient)

  return (
    <QueryClientProvider client={client}>
      <AppLayout />
    </QueryClientProvider>
  )
}

// A session page playing a scripted conversation.
export function LandingDemoPage() {
  return <SessionScreen session={DEMO_SESSION} chat={useDemoChat(FRAMES)} />
}
