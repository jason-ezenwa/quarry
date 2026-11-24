import type { HostAddress, HostLookup } from '../guarded-fetch.types';

// A public address, so the address check lets a mocked host through.
export const PUBLIC_ADDRESS = '104.18.32.7';

export type FakeHostLookup = HostLookup & {
  // Points a hostname at the given addresses until reset.
  point(hostname: string, ...addresses: string[]): void;
  reset(): void;
};

// DNS is the one thing the network mock cannot fake: every host resolves to a
// public address unless a test points it somewhere else.
export function createFakeHostLookup(): FakeHostLookup {
  const records = new Map<string, string[]>();

  const lookup = async (hostname: string): Promise<HostAddress[]> =>
    (records.get(hostname) ?? [PUBLIC_ADDRESS]).map((address) => ({
      address,
      family: address.includes(':') ? 6 : 4,
    }));

  return Object.assign(lookup, {
    point: (hostname: string, ...addresses: string[]) => {
      records.set(hostname, addresses);
    },
    reset: () => records.clear(),
  });
}
