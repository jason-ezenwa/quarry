import type {
  AnthropicLanguageModelOptions,
  AnthropicProvider,
} from '@ai-sdk/anthropic';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SessionErrorCode } from '@quarry/contracts';
import {
  convertToModelMessages,
  createIdGenerator,
  isStepCount,
  isToolUIPart,
  pipeUIMessageStreamToResponse,
  readUIMessageStream,
  streamText,
  toUIMessageStream,
  type FinishReason,
  type SystemModelMessage,
  type LanguageModelUsage,
  type UIMessage,
  type UIMessageChunk,
} from 'ai';
import type { ServerResponse } from 'node:http';
import { ANTHROPIC } from '../../ai/ai.constants';
import { errorName } from '../../common/error-name';
import { ProfileService } from '../../profile/profile.service';
import { ResumeService } from '../../resume/resume.service';
import { MessageUsage } from '../message.schema';
import { SessionsService } from '../sessions.service';
import type { ClaimedTurn } from '../sessions.types';
import { isCompactionPart } from '../sessions.utils';
import { AgentToolsFactory } from './agent-tools.factory';
import {
  AGENT_EFFORT,
  AGENT_MAX_STEPS,
  AGENT_MODEL,
  AGENT_SYSTEM_PROMPT,
  CACHED,
  COMPACTION_INSTRUCTIONS,
  COMPACTION_TRIGGER_TOKENS,
  REPLY_FAILED_TEXT,
} from './agent.constants';
import type { RunningTurn, TurnFailure } from './agent.types';
import { profileSystemMessage } from './agent.utils';

const generateMessageId = createIdGenerator({ prefix: 'msg', size: 16 });

// Holds the end of the client's stream until the reply is saved or dropped. A
// drop the stream doesn't already show ends it with an error, not a blank reply.
function closeAfter(
  settled: Promise<TurnFailure | null>,
): TransformStream<UIMessageChunk, UIMessageChunk> {
  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    async flush(controller) {
      const failure = await settled.catch(() => 'empty-reply' as const);

      if (
        failure === 'declined-and-withdrawn' ||
        failure === 'declined-and-kept'
      ) {
        const errorText: SessionErrorCode =
          failure === 'declined-and-kept'
            ? 'first-message-declined'
            : 'reply-declined';
        controller.enqueue({ type: 'error', errorText });
      } else if (failure === 'empty-reply') {
        controller.enqueue({ type: 'error', errorText: REPLY_FAILED_TEXT });
      }
    },
  });
}

// Something the user sees: text other than a compaction summary, or a tool step.
function isAnswerPart(part: UIMessage['parts'][number]): boolean {
  if (isToolUIPart(part)) return true;

  return (
    part.type === 'text' && !isCompactionPart(part) && part.text.trim() !== ''
  );
}

// Logs carry ids, counts and durations only: never profile, resume, job or
// message content.
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  // Keyed by session id. In memory, as the turn lock assumes one instance.
  private readonly running = new Map<string, RunningTurn>();

  constructor(
    @Inject(ANTHROPIC) private readonly anthropic: AnthropicProvider,
    private readonly sessionsService: SessionsService,
    private readonly profileService: ProfileService,
    private readonly resumeService: ResumeService,
    private readonly agentToolsFactory: AgentToolsFactory,
  ) {}

  // Streams the reply to `response` while consuming a copy here, so the
  // reply is saved even if the client goes away. Always releases the lock.
  async runTurn(turn: ClaimedTurn, response: ServerResponse): Promise<void> {
    const context = { userId: turn.userId, sessionId: turn.sessionId };
    const startedAt = Date.now();
    // Once the reply is being saved, that path releases the lock itself.
    let settled: Promise<TurnFailure | null> | undefined;
    const stop = new AbortController();
    let markDone!: () => void;

    const done = new Promise<void>((resolve) => {
      markDone = resolve;
    });

    const running: RunningTurn = { messageId: turn.messageId, stop, done };
    this.running.set(turn.sessionId, running);

    try {
      this.logger.log('Agent turn started', context);

      const history = await this.sessionsService.turnHistory(turn);
      const tools = this.agentToolsFactory.build(context);

      let stopReason: string | undefined;

      const result = streamText({
        model: this.anthropic(AGENT_MODEL),
        instructions: await this.systemMessages(turn.userId),
        messages: await convertToModelMessages(history, { tools }),
        tools,
        toolChoice: 'auto',
        stopWhen: isStepCount(AGENT_MAX_STEPS),
        abortSignal: stop.signal,
        onStepEnd: (step) => {
          stopReason = step.rawFinishReason;
        },
        providerOptions: {
          anthropic: {
            effort: AGENT_EFFORT,
            sendReasoning: true,
            contextManagement: {
              edits: [
                {
                  type: 'compact_20260112',
                  trigger: {
                    type: 'input_tokens',
                    value: COMPACTION_TRIGGER_TOKENS,
                  },
                  instructions: COMPACTION_INSTRUCTIONS,
                },
              ],
            },
          } satisfies AnthropicLanguageModelOptions,
        },
      });

      const [toClient, toServer] = toUIMessageStream({
        stream: result.stream,
        tools,
        originalMessages: history,
        generateMessageId,
        sendReasoning: true,
        // Tool errors are stored exactly as the model saw them, since the
        // history it is sent later must match what it already read.
        redactToolErrors: false,
        onError: (error) => {
          this.logger.error('Agent turn stream failed', {
            ...context,
            error: errorName(error),
          });

          return REPLY_FAILED_TEXT;
        },
      }).tee();

      // Saved and unlocked before the response ends, so the client's next
      // message never finds this turn still running.
      settled = this.saveReply(
        turn,
        result,
        () => stopReason,
        toServer,
        startedAt,
      ).finally(() => this.sessionsService.releaseTurn(turn));

      // A client that disconnects only stops its own copy of the stream.
      await pipeUIMessageStreamToResponse({
        response,
        stream: toClient.pipeThrough(closeAfter(settled)),
      }).catch(() => undefined);

      await settled;
    } catch (error) {
      this.logger.error('Agent turn crashed', {
        ...context,
        error: errorName(error),
        durationMs: Date.now() - startedAt,
      });

      if (!response.headersSent) response.writeHead(500).end();
    } finally {
      if (!settled) await this.sessionsService.releaseTurn(turn);

      if (this.running.get(turn.sessionId) === running) {
        this.running.delete(turn.sessionId);
      }

      markDone();
    }
  }

  // Stops the turn answering `messageId`, if it is running, and waits until
  // its lock is released. Unlike a disconnect, a stop saves none of the reply.
  async stopTurn(
    userId: string,
    sessionId: string,
    messageId: string,
  ): Promise<void> {
    await this.sessionsService.assertOwned(userId, sessionId);

    const running = this.running.get(sessionId);
    if (running?.messageId !== messageId) return;

    this.logger.log('Agent turn stop requested', { userId, sessionId });
    running.stop.abort();
    await running.done;
  }

  // Saves the reply, or drops it whole and says why: a failed one may hold
  // unsigned thinking that breaks later requests. Saved documents stay.
  private async saveReply(
    turn: ClaimedTurn,
    result: {
      totalUsage: PromiseLike<LanguageModelUsage>;
      steps: PromiseLike<unknown[]>;
    },
    // The provider's own reason the last step ended, such as Anthropic's `refusal`.
    stopReason: () => string | undefined,
    stream: ReadableStream<UIMessageChunk>,
    startedAt: number,
  ): Promise<TurnFailure | null> {
    const context = { userId: turn.userId, sessionId: turn.sessionId };
    let turnFailure: TurnFailure | null = null;
    let finishReason: FinishReason | undefined;

    const reply = await this.readReply(
      stream.pipeThrough(
        new TransformStream<UIMessageChunk, UIMessageChunk>({
          transform(chunk, controller) {
            // A stop counts like an error: none of the reply is kept.
            if (chunk.type === 'error') turnFailure = 'stream-error';
            if (chunk.type === 'abort') turnFailure = 'stopped';
            if (chunk.type === 'finish') finishReason = chunk.finishReason;
            controller.enqueue(chunk);
          },
        }),
      ),
    );

    turnFailure ??= await this.unanswered(turn, reply, finishReason);
    const providerStopReason = stopReason();

    if (turnFailure) {
      this.logger.warn('Agent turn not saved', {
        ...context,
        reason: turnFailure,
        finishReason,
        stopReason: providerStopReason,
        durationMs: Date.now() - startedAt,
      });

      return turnFailure;
    }

    if (!reply) return 'empty-reply';

    const usage = this.toUsage(await result.totalUsage);
    await this.sessionsService.appendAssistantMessage(turn, reply, usage);

    if (reply.parts.some(isCompactionPart)) {
      this.logger.log('Session context compacted', context);
    }

    this.logger.log('Agent turn finished', {
      ...context,
      finishReason,
      stopReason: providerStopReason,
      steps: (await result.steps).length,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      durationMs: Date.now() - startedAt,
    });

    return null;
  }

  // Why a finished reply can't be kept. A declined message is taken back (not the
  // first, nor one whose tools already saved something) or later turns fail too.
  private async unanswered(
    turn: ClaimedTurn,
    reply: UIMessage | null,
    finishReason: FinishReason | undefined,
  ): Promise<TurnFailure | null> {
    const ranTools = reply?.parts.some(isToolUIPart) ?? false;

    if (finishReason === 'content-filter' && !ranTools) {
      return (await this.sessionsService.withdrawUserMessage(turn))
        ? 'declined-and-withdrawn'
        : 'declined-and-kept';
    }

    return reply?.parts.some(isAnswerPart) ? null : 'empty-reply';
  }

  // The static prompt, then the profile; each with its own cache marker.
  private async systemMessages(userId: string): Promise<SystemModelMessage[]> {
    const [profile, resume] = await Promise.all([
      this.profileService.findByUserId(userId),
      this.resumeService.findPrimaryContent(userId),
    ]);

    if (!profile || !resume) {
      throw new Error('Profile or parsed primary resume missing');
    }

    return [
      { role: 'system', content: AGENT_SYSTEM_PROMPT, providerOptions: CACHED },
      {
        role: 'system',
        content: profileSystemMessage(profile, resume),
        providerOptions: CACHED,
      },
    ];
  }

  // The last state of the streamed reply, with every part as produced.
  private async readReply(
    stream: ReadableStream<UIMessageChunk>,
  ): Promise<UIMessage | null> {
    let reply: UIMessage | null = null;

    for await (const message of readUIMessageStream({ stream })) {
      reply = message;
    }

    return reply;
  }

  private toUsage(total: LanguageModelUsage): MessageUsage {
    const usage = new MessageUsage();
    usage.model = AGENT_MODEL;
    usage.inputTokens = total.inputTokens ?? 0;
    usage.outputTokens = total.outputTokens ?? 0;
    usage.cacheReadTokens = total.inputTokenDetails.cacheReadTokens ?? 0;
    usage.cacheWriteTokens = total.inputTokenDetails.cacheWriteTokens ?? 0;

    return usage;
  }
}
