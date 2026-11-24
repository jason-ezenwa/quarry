import type { INestApplication } from '@nestjs/common';
import { Types } from 'mongoose';
import request from 'supertest';
import { expect } from 'vitest';
import { TEST_ORIGIN } from '../../src/lib/__integration__/sign-up.fixture';
import { getTestDatabase } from './database';
import { fakeAnthropicApi } from './fake-anthropic-api';

export type ToolCall = { name: string; input: object };

// One turn where Claude calls the given tools, then says a line.
export async function runTools(
  app: INestApplication,
  cookie: string[],
  sessionId: string,
  calls: ToolCall[],
): Promise<void> {
  fakeAnthropicApi.reply(
    {
      kind: 'stream',
      blocks: calls.map(({ name, input }, index) => ({
        type: 'tool_use',
        id: `toolu_${index}`,
        name,
        input,
      })),
      stopReason: 'tool_use',
    },
    { kind: 'stream', blocks: [{ type: 'text', text: 'Done.' }] },
  );

  // The first turn answers the stored first message; later ones send one.
  const answered = await getTestDatabase()
    .collection('messages')
    .countDocuments({
      session: new Types.ObjectId(sessionId),
      role: 'assistant',
    });

  const body =
    answered === 0
      ? {}
      : { message: { id: new Types.ObjectId().toHexString(), text: 'Go.' } };

  const response = await request(app.getHttpServer())
    .post(`/api/sessions/${sessionId}/turns`)
    .set('Origin', TEST_ORIGIN)
    .set('Cookie', cookie)
    .send(body);

  expect(response.status).toBe(200);
}
