import http, { type IncomingMessage } from 'node:http';
import https from 'node:https';
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP, type LookupFunction } from 'node:net';
import { isPublicAddress } from './address.utils';

export type HostAddress = { address: string; family: 4 | 6 };

// Resolves a hostname to every address it points at.
export type HostLookup = (hostname: string) => Promise<HostAddress[]>;

export const lookupHost: HostLookup = async (hostname) =>
  (await dnsLookup(hostname, { all: true, verbatim: true })) as HostAddress[];

export type GuardedFetchLimits = {
  // For the whole fetch, redirects included.
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
};

export type GuardedFetchOptions = GuardedFetchLimits & {
  lookup: HostLookup;
  accept: string;
  // Checked on the link and on every redirect before it is requested.
  refuseUrl?: (url: URL) => boolean;
};

export type GuardedResponse = {
  status: number;
  // Where the response came from, after redirects.
  url: URL;
  contentType: string | undefined;
  body: Buffer;
};

export type GuardedFetchErrorReason =
  | 'invalid-url'
  | 'refused-address'
  | 'refused-url'
  | 'too-many-redirects'
  | 'too-large'
  | 'timeout'
  | 'network-error';

export class GuardedFetchError extends Error {
  constructor(
    readonly reason: GuardedFetchErrorReason,
    // The address it stopped at, for `refused-url`.
    readonly url?: URL,
  ) {
    super(`Guarded fetch failed: ${reason}`);
    this.name = 'GuardedFetchError';
  }
}

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

const USER_AGENT = 'Mozilla/5.0 (compatible; QuarryJobFetcher/1.0)';

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

// The one way the job fetcher reaches the network. Redirects are followed
// here, one hop at a time, so every address is checked before it is used.
export async function guardedFetch(
  url: URL,
  options: GuardedFetchOptions,
): Promise<GuardedResponse> {
  const deadline = AbortSignal.timeout(options.timeoutMs);

  try {
    return await followRedirects(url, options, deadline);
  } catch (error) {
    if (deadline.aborted) throw new GuardedFetchError('timeout');
    if (error instanceof GuardedFetchError) throw error;
    throw new GuardedFetchError('network-error');
  }
}

async function followRedirects(
  url: URL,
  { lookup, accept, maxBytes, maxRedirects, refuseUrl }: GuardedFetchOptions,
  deadline: AbortSignal,
): Promise<GuardedResponse> {
  let current = url;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    assertFetchableUrl(current);

    if (refuseUrl?.(current)) {
      throw new GuardedFetchError('refused-url', current);
    }

    const addresses = await withDeadline(
      resolvePublicAddresses(current.hostname, lookup),
      deadline,
    );
    const response = await send(current, addresses, accept, deadline);
    const status = response.statusCode ?? 0;
    const location = response.headers.location;

    if (!REDIRECT_STATUSES.has(status) || !location) {
      const body = await readBody(response, maxBytes);

      // A body cut off by the deadline can end without an error.
      deadline.throwIfAborted();

      return {
        status,
        url: current,
        contentType: response.headers['content-type'],
        body,
      };
    }

    response.resume();
    current = nextHop(location, current);
  }

  throw new GuardedFetchError('too-many-redirects');
}

function nextHop(location: string, from: URL): URL {
  const next = URL.parse(location, from);

  if (!next) throw new GuardedFetchError('invalid-url');

  return next;
}

// http(s) on the default port, with no credentials to send along.
function assertFetchableUrl(url: URL): void {
  if (
    !HTTP_PROTOCOLS.has(url.protocol) ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new GuardedFetchError('invalid-url');
  }
}

// DNS lookups cannot be cancelled, so the fetch stops waiting instead.
function withDeadline<T>(
  promise: Promise<T>,
  deadline: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(deadline.reason);

    if (deadline.aborted) return abort();

    deadline.addEventListener('abort', abort, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => deadline.removeEventListener('abort', abort));
  });
}

// Every address the host points at must be public, or none is used.
async function resolvePublicAddresses(
  hostname: string,
  lookup: HostLookup,
): Promise<HostAddress[]> {
  const literal = hostname.replace(/^\[(.*)\]$/, '$1');
  const family = isIP(literal);

  const addresses: HostAddress[] =
    family === 4 || family === 6
      ? [{ address: literal, family }]
      : await lookup(hostname).catch(() => {
          throw new GuardedFetchError('network-error');
        });

  if (
    addresses.length === 0 ||
    !addresses.every(({ address }) => isPublicAddress(address))
  ) {
    throw new GuardedFetchError('refused-address');
  }

  return addresses;
}

// Connects only to the addresses already checked, so a second DNS answer
// cannot point the request somewhere else.
function pinnedLookup(addresses: HostAddress[]): LookupFunction {
  return ((_hostname, options, callback) => {
    if (options.all) {
      callback(null, addresses);
    } else {
      callback(null, addresses[0].address, addresses[0].family);
    }
  }) as LookupFunction;
}

function send(
  url: URL,
  addresses: HostAddress[],
  accept: string,
  signal: AbortSignal,
): Promise<IncomingMessage> {
  // Looked up at call time, so the network mock in tests can intercept it.
  const request = url.protocol === 'https:' ? https.request : http.request;

  return new Promise((resolve, reject) => {
    request(url, {
      method: 'GET',
      agent: false,
      signal,
      lookup: pinnedLookup(addresses),
      headers: {
        accept,
        'accept-encoding': 'identity',
        'user-agent': USER_AGENT,
      },
    })
      .on('response', resolve)
      .on('error', reject)
      .end();
  });
}

async function readBody(
  response: IncomingMessage,
  maxBytes: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of response) {
    size += (chunk as Buffer).byteLength;

    if (size > maxBytes) {
      response.destroy();
      throw new GuardedFetchError('too-large');
    }

    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks);
}
