/// <reference types="node" />
import { File as NodeFile } from 'node:buffer'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { queryClient } from '../../lib/query-client'
import { server } from './server'
import { resetViewport } from './viewport'

// Node's own File, since fetch is Node's: from Node 24 it refuses jsdom's File
// in a FormData body, so a handler can't read an upload.
globalThis.File = NodeFile as unknown as typeof File

const unhandledRequests: string[] = []

// MSW only logs an unhandled request and rejects the fetch, which a component
// can swallow, so record them and fail the test instead.
beforeAll(() => {
  server.listen({
    onUnhandledRequest(request) {
      unhandledRequests.push(`${request.method} ${request.url}`)
    },
  })
})

afterEach(() => {
  // Runs before the shared cleanup, so unmount first: a mounted page would refetch against reset handlers.
  cleanup()
  server.resetHandlers()
  queryClient.clear()
  resetViewport()

  const requests = unhandledRequests.splice(0)
  if (requests.length > 0) {
    throw new Error(
      `Requests with no MSW handler:\n${requests.join('\n')}\nAdd a handler in handlers.ts or with server.use(...).`,
    )
  }
})

afterAll(() => {
  server.close()
})
