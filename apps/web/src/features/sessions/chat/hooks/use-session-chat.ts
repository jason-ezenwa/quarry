import { Chat, useChat } from '@ai-sdk/react'
import { isOneOf, SESSION_ERROR_CODES, type SessionDetail } from '@quarry/contracts'
import { useQueryClient } from '@tanstack/react-query'
import { APICallError, DefaultChatTransport, type UIMessage } from 'ai'
import { useEffect, useMemo, useRef, useState } from 'react'
import { asUIMessages, hasUnansweredMessage, messageText } from '../../session-parts'
import { sessionQueryOptions, stopTurn, turnsUrl } from '../../sessions-api'
import { SESSION_QUERY_KEYS } from '../../sessions.constants'
import { REFUSED_TURN_CODES } from '../chat.constants'
import type { ChatErrorCode, TurnErrorCode, UnsentDraft } from '../chat.types'
import { useRefreshSessionLists } from '../../hooks/use-sessions'

function errorCode(error: Error | undefined): TurnErrorCode | null {
  if (!error) return null
  if (!APICallError.isInstance(error) || !error.responseBody) return 'failed'

  try {
    const { code } = JSON.parse(error.responseBody) as { code?: unknown }
    return isOneOf(SESSION_ERROR_CODES, code) ? code : 'failed'
  } catch {
    return 'failed'
  }
}

// Archived, at the limit or already answered: the composer and the session query show the real state.
// A turn running elsewhere shows as working; once it has stopped, the refused message is back to send again.
function visibleError(code: TurnErrorCode | null, drafting: boolean): ChatErrorCode | null {
  if (code === 'turn-running') return drafting ? null : 'not-sent'
  if (code === 'primary-resume-not-ready') return 'resume-not-ready'
  return code === 'failed' ? code : null
}

// The server keeps the history, so a turn sends only the new message, or
// nothing when it should answer the stored unanswered one.
function createTransport(sessionId: string) {
  return new DefaultChatTransport<UIMessage>({
    api: turnsUrl(sessionId),
    credentials: 'include',
    prepareSendMessagesRequest: ({ messages, trigger }) => {
      const last = messages.at(-1)
      if (trigger === 'regenerate-message' || !last) return { body: {} }
      return { body: { message: { id: last.id, text: messageText(last) } } }
    },
  })
}

// Seeded from the stored messages; takes in a reply written elsewhere once the session query brings it.
// `fresh`: the session has been fetched since the page opened.
export function useSessionChat(session: SessionDetail, fresh: boolean) {
  const queryClient = useQueryClient()
  const refreshLists = useRefreshSessionLists()

  const [unsent, setUnsent] = useState<UnsentDraft | null>(null)
  // Set while the server drops a stopped reply, then until the next send or retry.
  const [stopState, setStopState] = useState<'stopping' | 'stopped' | null>(null)
  const stored = useMemo(() => new Set(session.messages.map((message) => message.id)), [session.messages])

  // Asks the server, since the chat keeps its handlers from the first render and the cache may lag.
  const isStored = async (messageId: string) => {
    const current = await queryClient.fetchQuery({ ...sessionQueryOptions(session.id), staleTime: 0 })
    return current.messages.some((message) => message.id === messageId)
  }

  const [instance] = useState(() => {
    const created: Chat<UIMessage> = new Chat<UIMessage>({
      id: session.id,
      messages: asUIMessages(session.messages),
      transport: createTransport(session.id),
      // The reply is saved by the time the stream ends, so the session, its title and the lists are current.
      onFinish: () => {
        void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.detail(session.id) })
        void refreshLists()
      },
      // A refused turn never stored the message, so it goes back to the composer.
      onError: async (error) => {
        const code = errorCode(error)
        const last = created.messages.at(-1)
        const refused = code && REFUSED_TURN_CODES.has(code) && last?.role === 'user'

        if (!refused) {
          void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.detail(session.id) })
          return
        }

        if (await isStored(last.id).catch(() => true)) return
        if (created.messages.at(-1)?.id !== last.id) return
        created.messages = created.messages.slice(0, -1)
        setUnsent({ text: messageText(last), key: last.id })
      },
    })

    return created
  })

  const chat = useChat<UIMessage>({ chat: instance })

  const idle = (chat.status === 'ready' || chat.status === 'error') && stopState !== 'stopping'
  const { messages, regenerate, setMessages, clearError } = chat
  const canStart = session.status === 'ready' && !session.archivedAt

  // The message the page answers itself on open, if any; undefined until the first fresh render. Set during render, as React allows.
  const [autoStartId, setAutoStartId] = useState<string | null | undefined>(undefined)

  if (fresh && autoStartId === undefined) {
    setAutoStartId(canStart && hasUnansweredMessage(messages) ? (messages.at(-1)?.id ?? null) : null)
  }

  // The first message is stored with the session; the page answers it once a fresh fetch shows no turn running.
  const checked = useRef(false)

  useEffect(() => {
    if (checked.current || !fresh) return
    checked.current = true
    if (canStart && hasUnansweredMessage(messages)) void regenerate()
  }, [fresh, canStart, messages, regenerate])

  // Takes the stored history when it's at least as far along as the chat, so
  // an idle chat never loses a reply it already shows.
  const synced = useRef(session.messages)

  useEffect(() => {
    if (!idle || session.messages === synced.current) return
    if (session.messages.length < messages.length) return
    synced.current = session.messages
    setMessages(asUIMessages(session.messages))
    clearError()
  }, [idle, session.messages, messages.length, setMessages, clearError])

  const code = errorCode(chat.error)

  // A stored message left unanswered elsewhere can be retried; the one the page answers on open shows its own error.
  const last = messages.at(-1)

  const stalled =
    autoStartId !== undefined && idle && canStart && last?.role === 'user' && last.id !== autoStartId && stored.has(last.id)

  // A reply that landed before the stop reached the server isn't a stopped one.
  const stopped = stopState === 'stopped' && session.messages.at(-1)?.role !== 'assistant'

  const error: ChatErrorCode | null = stopped
    ? 'stopped'
    : (visibleError(code, session.status === 'drafting') ?? (stalled ? 'failed' : null))

  return {
    messages,
    busy: !idle,
    // A turn the server is running that this page didn't start.
    waiting: idle && session.status === 'drafting',
    error,
    // A message the server refused, to put back in the composer.
    unsent,
    send: (text: string) => {
      setUnsent(null)
      setStopState(null)
      // The server kept none of a stopped reply, so the chat drops it too.
      if (stopped && messages.at(-1)?.role === 'assistant') setMessages(messages.slice(0, -1))
      void chat.sendMessage({ text })
    },
    // Reruns the stored unanswered message without resending it.
    retry: () => {
      setStopState(null)
      void regenerate()
    },
    // Only once the reply streams: by then the server has stored the message and can stop its turn.
    canStop: chat.status === 'streaming' && stopState === null,
    stopping: stopState === 'stopping',
    // Ends the stream here and the turn on the server, which keeps none of the reply.
    // If the server can't stop it, the turn runs on and the page waits for its reply.
    stop: async () => {
      const messageId = messages.findLast((message) => message.role === 'user')?.id
      if (!messageId) return
      setStopState('stopping')
      void chat.stop()

      const confirmed = await stopTurn(session.id, messageId).then(
        () => true,
        () => false,
      )

      const askedAt = Date.now()
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.detail(session.id) })
      void refreshLists()

      // A stop whose answer was lost may still have ended the turn: a fresh read with nothing running and no reply means stopped.
      const read = queryClient.getQueryState(sessionQueryOptions(session.id).queryKey)
      const current = read && read.dataUpdatedAt >= askedAt ? read.data : undefined
      const ended = current?.status === 'ready' && current.messages.at(-1)?.role === 'user'
      setStopState(confirmed || ended ? 'stopped' : null)
    },
  }
}
