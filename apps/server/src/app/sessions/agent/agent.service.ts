import type {
  AnthropicLanguageModelOptions,
  AnthropicProvider,
} from '@ai-sdk/anthropic';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  convertToModelMessages,
  createIdGenerator,
  isStepCount,
  pipeUIMessageStreamToResponse,
  readUIMessageStream,
  streamText,
  toUIMessageStream,
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
  COMPACTION_INSTRUCTIONS,
  COMPACTION_TRIGGER_TOKENS,
} from './agent.constants';
import { profileSystemMessage } from './agent.utils';

const CACHED = { anthropic: { cacheControl: { type: 'ephemeral' } } } as const;

// A running turn: aborting it cancels the call to Claude; `done` settles
// once the turn has released its lock.
type RunningTurn = {
  messageId: string;
  stop: AbortController;
  done: Promise<void>;
};

const generateMessageId = createIdGenerator({ prefix: 'msg', size: 16 });

// Holds the end of a stream until `done` settles.
function closeAfter<T>(done: Promise<unknown>): TransformStream<T, T> {
  return new TransformStream<T, T>({
    async flush() {
      await done.catch(() => undefined);
    },
  });
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
    let settled: Promise<void> | undefined;
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

      const result = streamText({
        model: this.anthropic(AGENT_MODEL),
        instructions: await this.systemMessages(turn.userId),
        messages: await convertToModelMessages(history, { tools }),
        tools,
        toolChoice: 'auto',
        stopWhen: isStepCount(AGENT_MAX_STEPS),
        abortSignal: stop.signal,
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

          return 'Something went wrong writing this reply. Try again.';
        },
      }).tee();

      // Saved and unlocked before the response ends, so the client's next
      // message never finds this turn still running.
      settled = this.saveReply(turn, result, toServer, startedAt).finally(() =>
        this.sessionsService.releaseTurn(turn),
      );

      // A client that disconnects only stops its own copy of the stream.
      await pipeUIMessageStreamToResponse({
        response,
        stream: toClient.pipeThrough(closeAfter<UIMessageChunk>(settled)),
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

  private async saveReply(
    turn: ClaimedTurn,
    result: {
      totalUsage: PromiseLike<LanguageModelUsage>;
      steps: PromiseLike<unknown[]>;
    },
    stream: ReadableStream<UIMessageChunk>,
    startedAt: number,
  ): Promise<void> {
    const context = { userId: turn.userId, sessionId: turn.sessionId };
    let failed: 'stream-error' | 'stopped' | null = null;

    const reply = await this.readReply(
      stream.pipeThrough(
        new TransformStream<UIMessageChunk, UIMessageChunk>({
          transform(chunk, controller) {
            // A stop counts like an error: none of the reply is kept.
            if (chunk.type === 'error') failed = 'stream-error';
            if (chunk.type === 'abort') failed = 'stopped';
            controller.enqueue(chunk);
          },
        }),
      ),
    );

    // A failed reply may hold unsigned thinking that breaks later requests,
    // so it is dropped. Documents its tools saved stay, unannounced.
    if (failed || !reply) {
      this.logger.warn('Agent turn not saved', {
        ...context,
        reason: failed ?? 'empty-reply',
        durationMs: Date.now() - startedAt,
      });

      return;
    }

    const usage = this.toUsage(await result.totalUsage);
    await this.sessionsService.appendAssistantMessage(turn, reply, usage);

    if (reply.parts.some(isCompactionPart)) {
      this.logger.log('Session context compacted', context);
    }

    this.logger.log('Agent turn finished', {
      ...context,
      steps: (await result.steps).length,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      durationMs: Date.now() - startedAt,
    });
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

    return reply && reply.parts.length > 0 ? reply : null;
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
