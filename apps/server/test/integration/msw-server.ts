import { setupServer } from 'msw/node';
import { fakeAnthropicApi } from './fake-anthropic-api';

// One network mock per test file. Specs add their own handlers with
// `mswServer.use()`; the Anthropic API is always mocked.
export const mswServer = setupServer(fakeAnthropicApi.handler);

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

// Requests to the app under test pass through; anything else is a test bug.
export function listenToNetwork(): void {
  mswServer.listen({
    onUnhandledRequest: (request, print) => {
      if (!LOCAL_HOSTS.has(new URL(request.url).hostname)) print.error();
    },
  });
}
