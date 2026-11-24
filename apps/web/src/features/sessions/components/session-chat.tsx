import type { UIMessage } from 'ai'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Callout, CalloutActions, CalloutContent, CalloutTitle } from '@/components/ui/callout'
import { messageBlocks, messageDocuments, messageText } from '../session-parts'
import { CHAT_ERRORS } from '../sessions.constants'
import type { ChatErrorCode, DocumentAnnouncement, UnsentDraft } from '../sessions.types'
import { Composer, type ComposerState } from './composer'
import { Message } from './message'
import { OutputCard } from './output-card'
import { ReplyText } from './reply-text'
import { ToolSteps } from './tool-steps'

type SessionChatProps = {
  messages: UIMessage[]
  // A reply is on its way, here or from a turn started elsewhere.
  working: boolean
  error: ChatErrorCode | null
  composer: ComposerState
  messageLimit: number
  unsent: UnsentDraft | null
  activeDocumentId: string | null
  onOpenDocument: (document: DocumentAnnouncement) => void
  onSend: (text: string) => void
  onRetry: () => void
}

function AssistantMessage({
  message,
  live,
  activeDocumentId,
  onOpenDocument,
}: Pick<SessionChatProps, 'activeDocumentId' | 'onOpenDocument'> & { message: UIMessage; live: boolean }) {
  const documents = messageDocuments(message)

  return (
    <div className="flex flex-col gap-3">
      {messageBlocks(message, live).map((block) =>
        block.kind === 'steps' ? (
          <ToolSteps key={block.key} steps={block.steps} />
        ) : (
          <Message key={block.key} role="assistant">
            <ReplyText text={block.text} />
          </Message>
        ),
      )}
      {documents.length > 0 ? (
        <div className="flex flex-col gap-2">
          {documents.map((document) => (
            <OutputCard
              key={document.id}
              document={document}
              active={document.id === activeDocumentId}
              onOpen={() => onOpenDocument(document)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

// The conversation and the composer. Each reply shows its tool steps, its text and a card for every document it saved.
export function SessionChat({
  messages,
  working,
  error,
  composer,
  messageLimit,
  unsent,
  activeDocumentId,
  onOpenDocument,
  onSend,
  onRetry,
}: SessionChatProps) {
  const end = useRef<HTMLDivElement>(null)
  const waitingForReply = working && messages.at(-1)?.role !== 'assistant'

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [messages, waitingForReply])

  return (
    <section aria-label="Session" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex flex-1 justify-center overflow-y-auto px-4 pt-3 pb-3 md:px-7 md:pt-7">
        <div className="flex w-full max-w-145 flex-col gap-5.5 md:gap-6">
          {messages.map((message, index) =>
            message.role === 'user' ? (
              <Message key={message.id} role="user">
                {messageText(message)}
              </Message>
            ) : (
              <AssistantMessage
                key={message.id}
                message={message}
                live={working && index === messages.length - 1}
                activeDocumentId={activeDocumentId}
                onOpenDocument={onOpenDocument}
              />
            ),
          )}
          {waitingForReply ? <ToolSteps steps={[]} working /> : null}
          {error ? (
            <Callout tone="danger">
              <CalloutContent>
                <CalloutTitle>{CHAT_ERRORS[error]}</CalloutTitle>
              </CalloutContent>
              {error === 'failed' ? (
                <CalloutActions>
                  <Button size="sm" onClick={onRetry}>
                    Retry
                  </Button>
                </CalloutActions>
              ) : null}
            </Callout>
          ) : null}
          <div ref={end} />
        </div>
      </div>
      <div className="flex justify-center px-3 pt-2 pb-4 md:px-7 md:pt-3 md:pb-5">
        <div className="w-full max-w-145">
          <Composer key={unsent?.key} state={composer} messageLimit={messageLimit} draft={unsent?.text} onSend={onSend} />
        </div>
      </div>
    </section>
  )
}
