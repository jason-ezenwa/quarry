import type { UIMessage } from 'ai'
import { useEffect, useRef } from 'react'
import { AgentMessage, AgentTurn, MessageMarkdown, UserMessage } from '@/components/session/message'
import { OutputCardList } from '@/components/session/output-card'
import { SessionThread, SessionThreadEnd } from '@/components/session/session-chat'
import { Button } from '@/components/ui/button'
import { Callout, CalloutActions, CalloutContent, CalloutTitle } from '@/components/ui/callout'
import { messageBlocks, messageDocuments, messageText } from '../../session-parts'
import { CHAT_ERRORS, RETRYABLE_CHAT_ERRORS } from '../chat.constants'
import type { ChatErrorCode, DocumentCardProps } from '../chat.types'
import { AgentSteps } from './agent-steps'
import { DocumentCard } from '../../documents/components/document-card'

function AgentReply({ message, live, activeDocumentId, onOpenDocument }: DocumentCardProps & { message: UIMessage; live: boolean }) {
  const documents = messageDocuments(message)

  return (
    <AgentTurn>
      {messageBlocks(message, live).map((block) =>
        block.kind === 'steps' ? (
          <AgentSteps key={block.key} steps={block.steps} />
        ) : (
          <AgentMessage key={block.key}>
            <MessageMarkdown>{block.text}</MessageMarkdown>
          </AgentMessage>
        ),
      )}
      {documents.length > 0 ? (
        <OutputCardList>
          {documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              active={document.id === activeDocumentId}
              onOpen={() => onOpenDocument(document)}
            />
          ))}
        </OutputCardList>
      ) : null}
    </AgentTurn>
  )
}

function TurnError({ error, onRetry }: { error: ChatErrorCode; onRetry: () => void }) {
  return (
    <Callout tone={error === 'stopped' ? 'review' : 'danger'}>
      <CalloutContent>
        <CalloutTitle>{CHAT_ERRORS[error]}</CalloutTitle>
      </CalloutContent>
      {RETRYABLE_CHAT_ERRORS.has(error) ? (
        <CalloutActions>
          <Button size="sm" onClick={onRetry}>
            Retry
          </Button>
        </CalloutActions>
      ) : null}
    </Callout>
  )
}

// The conversation. Each reply shows its tool steps, its text and a card for every document it saved.
export function ApplicationThread({
  messages,
  working,
  error,
  activeDocumentId,
  onOpenDocument,
  onRetry,
}: DocumentCardProps & {
  messages: UIMessage[]
  // A reply is on its way, here or from a turn started elsewhere.
  working: boolean
  error: ChatErrorCode | null
  onRetry: () => void
}) {
  const end = useRef<HTMLDivElement>(null)
  const waitingForReply = working && messages.at(-1)?.role !== 'assistant'

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [messages, waitingForReply])

  return (
    <SessionThread>
      {messages.map((message, index) =>
        message.role === 'user' ? (
          <UserMessage key={message.id}>{messageText(message)}</UserMessage>
        ) : (
          <AgentReply
            key={message.id}
            message={message}
            live={working && index === messages.length - 1}
            activeDocumentId={activeDocumentId}
            onOpenDocument={onOpenDocument}
          />
        ),
      )}
      {waitingForReply ? <AgentSteps steps={[]} working /> : null}
      {error ? <TurnError error={error} onRetry={onRetry} /> : null}
      <SessionThreadEnd ref={end} />
    </SessionThread>
  )
}
