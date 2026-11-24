import { Chat, useChat } from '@ai-sdk/react'
import { isOneOf, SESSION_ERROR_CODES, type SessionDetail } from '@quarry/contracts'
import { useQueryClient } from '@tanstack/react-query'
import { APICallError, DefaultChatTransport, type UIMessage } from 'ai'
import { useEffect, useMemo, useRef, useState } from 'react'
import { asUIMessages, hasUnansweredMessage, messageText } from '../session-parts'
import { sessionQueryOptions, turnsUrl } from '../sessions-api'
import { REFUSED_TURN_CODES, SESSION_QUERY_KEYS } from '../sessions.constants'
import type { ChatErrorCode, TurnErrorCode, UnsentDraft } from '../sessions.types'
import { useRefreshSessionLists } from './use-sessions'

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

  const idle = chat.status === 'ready' || chat.status === 'error'
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
  const error = visibleError(code, session.status === 'drafting') ?? (stalled ? 'failed' : null)

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
      void chat.sendMessage({ text })
    },
    // Reruns the stored unanswered message without resending it.
    retry: () => regenerate(),
  }
}
