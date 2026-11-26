import type { UIMessage } from 'ai'
import type { ReactNode } from 'react'
import { AgentMessage, AgentTurn, MessageMarkdown, UserMessage } from '@/components/session/message'
import { SessionThread, SessionThreadFollow } from '@/components/session/session-chat'
import { messageBlocks, messageText, replyIsThinking } from '../../session-parts'
import type { ChatErrorCode } from '../../chat/chat.types'
import { AgentSteps, AgentThinking } from '../../chat/components/agent-steps'
import { TurnError } from '../../chat/components/application-thread'
import { InterviewQuestion } from './interview-question'

// Interviews save no documents, so there are no cards.
function InterviewReply({ message, live, currentQuestionId }: { message: UIMessage; live: boolean; currentQuestionId: string | null }) {
  return (
    <AgentTurn>
      {messageBlocks(message, live).map((block) => {
        switch (block.kind) {
          case 'steps':
            return <AgentSteps key={block.key} steps={block.steps} />
          case 'question':
            return (
              <InterviewQuestion key={block.key} number={block.number} current={block.id === currentQuestionId}>
                {block.question}
              </InterviewQuestion>
            )
          case 'text':
            return (
              <AgentMessage key={block.key}>
                <MessageMarkdown>{block.text}</MessageMarkdown>
              </AgentMessage>
            )
          case 'documents':
            return null
        }
      })}
      {replyIsThinking(message, live) ? <AgentThinking /> : null}
    </AgentTurn>
  )
}

// `currentQuestionId` is drawn larger; null once ended.
// Children follow the last message, such as why ending failed.
export function InterviewThread({
  messages,
  working,
  error,
  currentQuestionId,
  onRetry,
  children,
}: {
  messages: UIMessage[]
  working: boolean
  error: ChatErrorCode | null
  currentQuestionId: string | null
  onRetry: () => void
  children?: ReactNode
}) {
  const waitingForReply = working && messages.at(-1)?.role !== 'assistant'
  const sentCount = messages.filter((message) => message.role === 'user').length

  return (
    <SessionThread>
      {messages.map((message, index) =>
        message.role === 'user' ? (
          <UserMessage key={message.id}>{messageText(message)}</UserMessage>
        ) : (
          <InterviewReply
            key={message.id}
            message={message}
            live={working && index === messages.length - 1}
            currentQuestionId={currentQuestionId}
          />
        ),
      )}
      {waitingForReply ? <AgentThinking /> : null}
      {error ? <TurnError error={error} onRetry={onRetry} /> : null}
      {children}
      <SessionThreadFollow resetKey={sentCount} />
    </SessionThread>
  )
}
