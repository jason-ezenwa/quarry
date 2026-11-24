export type HostAddress = { address: string; family: 4 | 6 };

// Resolves a hostname to every address it points at.
export type HostLookup = (hostname: string) => Promise<HostAddress[]>;

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
