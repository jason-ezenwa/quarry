import { setupServer } from 'msw/node';
import { fakeAnthropicApi } from './fake-anthropic-api';
import { fakeR2 } from './fake-r2';

// Specs add handlers with `mswServer.use()`; Anthropic and R2 are always mocked.
export const mswServer = setupServer(
  fakeAnthropicApi.handler,
  ...fakeR2.handlers,
);

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

// Requests to the app under test pass through; anything else is a test bug.
export function listenToNetwork(): void {
  mswServer.listen({
    onUnhandledRequest: (request, print) => {
      if (!LOCAL_HOSTS.has(new URL(request.url).hostname)) print.error();
    },
  });
}
