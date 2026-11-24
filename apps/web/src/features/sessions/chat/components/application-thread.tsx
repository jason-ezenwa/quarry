import type { UIMessage } from 'ai'
import { AgentMessage, AgentTurn, MessageMarkdown, UserMessage } from '@/components/session/message'
import { OutputCardList } from '@/components/session/output-card'
import { SessionThread, SessionThreadFollow } from '@/components/session/session-chat'
import { Button } from '@/components/ui/button'
import { Callout, CalloutActions, CalloutContent, CalloutTitle } from '@/components/ui/callout'
import { messageBlocks, messageText, replyIsThinking } from '../../session-parts'
import { CHAT_ERRORS, RETRYABLE_CHAT_ERRORS } from '../chat.constants'
import type { ChatErrorCode, DocumentCardProps } from '../chat.types'
import { AgentSteps, AgentThinking } from './agent-steps'
import { DocumentCard } from '../../documents/components/document-card'

// Blocks in the order they were written: steps, the cards for what they saved, then text. While
// the agent thinks with nothing else moving, a thinking line shows where its next words will land.
function AgentReply({ message, live, activeDocumentId, onOpenDocument }: DocumentCardProps & { message: UIMessage; live: boolean }) {
  return (
    <AgentTurn>
      {messageBlocks(message, live).map((block) => {
        if (block.kind === 'steps') return <AgentSteps key={block.key} steps={block.steps} />

        if (block.kind === 'documents') {
          return (
            <OutputCardList key={block.key}>
              {block.documents.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  active={document.id === activeDocumentId}
                  onOpen={() => onOpenDocument(document)}
                />
              ))}
            </OutputCardList>
          )
        }

        return (
          <AgentMessage key={block.key}>
            <MessageMarkdown>{block.text}</MessageMarkdown>
          </AgentMessage>
        )
      })}
      {replyIsThinking(message, live) ? <AgentThinking /> : null}
    </AgentTurn>
  )
}

function TurnError({ error, onRetry }: { error: ChatErrorCode; onRetry: () => void }) {
  return (
    <Callout tone={error === 'stopped' || error === 'unanswered' ? 'review' : 'danger'}>
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
// Sending a message takes the reader back to the bottom.
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
  const waitingForReply = working && messages.at(-1)?.role !== 'assistant'
  const sentCount = messages.filter((message) => message.role === 'user').length

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
      {waitingForReply ? <AgentThinking /> : null}
      {error ? <TurnError error={error} onRetry={onRetry} /> : null}
      <SessionThreadFollow resetKey={sentCount} />
    </SessionThread>
  )
}
