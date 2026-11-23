import type { Resume } from '@quarry/contracts';
import { delay, http, HttpResponse } from 'msw';
import {
  ANTHROPIC_BASE_URL,
  RESUME_PARSE_MODEL,
} from '../../src/app/resume/parser/parser.constants';

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
  | { kind: 'error'; status: number };

// What the app sent to the Messages API. Only the parts tests read are typed.
export type MessagesRequest = {
  model: string;
  max_tokens: number;
  tools?: { name: string }[];
  output_config?: { format?: { type: string } };
  messages: {
    role: string;
    content: (
      | { type: 'text'; text: string }
      | {
          type: 'document';
          source: { type: string; media_type: string; data: string };
        }
    )[];
  }[];
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
  private replies: AnthropicReply[] = [];

  readonly handler = http.post(ANTHROPIC_MESSAGES_URL, async ({ request }) => {
    const body = (await request.json()) as MessagesRequest;
    this.requests.push(body);

    const reply = this.replies.shift();
    if (!reply) return delay('infinite') as Promise<never>;

    return this.respond(reply, body);
  });

  reply(...replies: AnthropicReply[]): void {
    this.replies.push(...replies);
  }

  reset(): void {
    this.requests.length = 0;
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
    }
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
