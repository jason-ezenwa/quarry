import type { Resume } from '@quarry/contracts';
import { delay, http, HttpResponse } from 'msw';
import { ANTHROPIC_BASE_URL } from '../../src/app/ai/ai.constants';
import { RESUME_PARSE_MODEL } from '../../src/app/resume/parser/parser.constants';
import { AGENT_MODEL } from '../../src/app/sessions/agent/agent.constants';

export const ANTHROPIC_MESSAGES_URL = `${ANTHROPIC_BASE_URL}/messages`;

export type AnthropicReply =
  | {
      kind: 'resume';
      resume: Resume;
      inputTokens?: number;
      outputTokens?: number;
    }
  // Well-formed structured output that doesn't match the resume schema.
  | { kind: 'object'; value: object }
  // Plain text instead of structured output, such as broken JSON.
  | { kind: 'text'; text: string }
  | { kind: 'refusal' }
  | { kind: 'error'; status: number }
  // A streamed reply, as an agent turn asks for.
  | {
      kind: 'stream';
      blocks: StreamedBlock[];
      stopReason?: 'end_turn' | 'tool_use';
      usage?: StreamedUsage;
      // Holds the stream open after the first block until it settles.
      pauseAfterFirstBlock?: Promise<void>;
    };

export type StreamedBlock =
  | { type: 'thinking'; thinking: string; signature: string }
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: object }
  | { type: 'compaction'; content: string; signature: string };

export type StreamedUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
};

// A block of a message the app sent back, as the Messages API takes it.
export type SentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string; signature: string }
  | { type: 'compaction'; content: string; signature?: string }
  | { type: 'tool_use'; id: string; name: string; input: object }
  | { type: 'tool_result'; tool_use_id: string; content: unknown }
  | {
      type: 'document';
      source: { type: string; media_type: string; data: string };
    };

// What the app sent to the Messages API. Only the parts tests read are typed.
export type MessagesRequest = {
  model: string;
  max_tokens: number;
  stream?: boolean;
  system?: { type: 'text'; text: string; cache_control?: object }[];
  tools?: { name: string }[];
  tool_choice?: { type: string };
  output_config?: { format?: { type: string }; effort?: string };
  thinking?: { type: string };
  context_management?: {
    edits: { type: string; trigger?: object; instructions?: string }[];
  };
  messages: { role: string; content: SentBlock[] }[];
};

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: object };

const DEFAULT_USAGE = { input_tokens: 1200, output_tokens: 400 };

// The provider asks for structured output either natively or, for larger
// schemas, through a forced tool named `json`; replies answer in kind.
const JSON_TOOL = 'json';

// Replies are used in order. With none queued a request is held open, so a
// parse a test doesn't care about stays `parsing`.
export class FakeAnthropicApi {
  readonly requests: MessagesRequest[] = [];
  readonly betas: string[][] = [];
  private replies: AnthropicReply[] = [];

  readonly handler = http.post(ANTHROPIC_MESSAGES_URL, async ({ request }) => {
    const body = (await request.json()) as MessagesRequest;
    this.requests.push(body);
    this.betas.push(request.headers.get('anthropic-beta')?.split(',') ?? []);

    const reply = this.replies.shift();
    if (!reply) return delay('infinite') as Promise<never>;

    return this.respond(reply, body);
  });

  reply(...replies: AnthropicReply[]): void {
    this.replies.push(...replies);
  }

  reset(): void {
    this.requests.length = 0;
    this.betas.length = 0;
    this.replies = [];
  }

  private respond(reply: AnthropicReply, request: MessagesRequest): Response {
    switch (reply.kind) {
      case 'error':
        return HttpResponse.json(
          {
            type: 'error',
            error: { type: 'api_error', message: 'Internal server error' },
          },
          { status: reply.status },
        );
      case 'refusal':
        return message([], 'refusal');
      case 'text':
        return message([{ type: 'text', text: reply.text }], 'end_turn');
      case 'object':
        return structured(reply.value, request);
      case 'resume':
        return structured(reply.resume, request, {
          input_tokens: reply.inputTokens ?? DEFAULT_USAGE.input_tokens,
          output_tokens: reply.outputTokens ?? DEFAULT_USAGE.output_tokens,
        });
      case 'stream':
        return streamed(reply);
    }
  }
}

// Server-sent events in the Messages API's streaming format.
function streamed({
  blocks,
  stopReason = 'end_turn',
  usage = DEFAULT_USAGE,
  pauseAfterFirstBlock,
}: Extract<AnthropicReply, { kind: 'stream' }>): Response {
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: object) =>
        controller.enqueue(
          encoder.encode(
            `event: ${event}\ndata: ${JSON.stringify({ type: event, ...data })}\n\n`,
          ),
        );

      send('message_start', {
        message: {
          id: 'msg_test',
          type: 'message',
          role: 'assistant',
          model: AGENT_MODEL,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: {
            input_tokens: usage.input_tokens,
            output_tokens: 1,
            cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
            cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
          },
        },
      });

      for (const [index, block] of blocks.entries()) {
        for (const [event, data] of blockEvents(block, index)) {
          send(event, data);
        }

        if (index === 0 && pauseAfterFirstBlock) await pauseAfterFirstBlock;
      }

      send('message_delta', {
        delta: { stop_reason: stopReason, stop_sequence: null },
        usage: { output_tokens: usage.output_tokens },
      });
      send('message_stop', {});
      controller.close();
    },
  });

  return new Response(body, {
    headers: { 'content-type': 'text/event-stream' },
  });
}

function blockEvents(block: StreamedBlock, index: number): [string, object][] {
  const stop: [string, object] = ['content_block_stop', { index }];
  const delta = (value: object): [string, object] => [
    'content_block_delta',
    { index, delta: value },
  ];

  switch (block.type) {
    case 'thinking':
      return [
        [
          'content_block_start',
          { index, content_block: { type: 'thinking', thinking: '' } },
        ],
        delta({ type: 'thinking_delta', thinking: block.thinking }),
        delta({ type: 'signature_delta', signature: block.signature }),
        stop,
      ];
    case 'text':
      return [
        [
          'content_block_start',
          { index, content_block: { type: 'text', text: '' } },
        ],
        delta({ type: 'text_delta', text: block.text }),
        stop,
      ];
    case 'tool_use':
      return [
        [
          'content_block_start',
          {
            index,
            content_block: {
              type: 'tool_use',
              id: block.id,
              name: block.name,
              input: {},
            },
          },
        ],
        delta({
          type: 'input_json_delta',
          partial_json: JSON.stringify(block.input),
        }),
        stop,
      ];
    case 'compaction':
      return [
        [
          'content_block_start',
          {
            index,
            content_block: {
              type: 'compaction',
              content: block.content,
              signature: block.signature,
            },
          },
        ],
        stop,
      ];
  }
}

function structured(
  value: object,
  request: MessagesRequest,
  usage = DEFAULT_USAGE,
): Response {
  if (request.tools?.some((tool) => tool.name === JSON_TOOL)) {
    return message(
      [{ type: 'tool_use', id: 'toolu_test', name: JSON_TOOL, input: value }],
      'tool_use',
      usage,
    );
  }

  return message(
    [{ type: 'text', text: JSON.stringify(value) }],
    'end_turn',
    usage,
  );
}

function message(
  content: ContentBlock[],
  stopReason: string,
  usage = DEFAULT_USAGE,
): Response {
  return HttpResponse.json({
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: RESUME_PARSE_MODEL,
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    usage,
  });
}

export const fakeAnthropicApi = new FakeAnthropicApi();
