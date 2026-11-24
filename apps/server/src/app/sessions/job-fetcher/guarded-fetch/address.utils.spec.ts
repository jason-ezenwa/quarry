import { describe, expect, it } from 'vitest';
import { isPublicAddress } from './address.utils';

describe('isPublicAddress', () => {
  it.each(['104.18.32.7', '8.8.8.8', '2606:4700::1111'])(
    'allows the public address %s',
    (address) => {
      expect(isPublicAddress(address)).toBe(true);
    },
  );

  it.each([
    ['loopback', '127.0.0.1'],
    ['IPv6 loopback', '::1'],
    ['IPv4-mapped loopback', '::ffff:127.0.0.1'],
    ['private', '10.0.0.5'],
    ['private', '192.168.1.1'],
    ['private', '172.16.0.1'],
    ['link-local (cloud metadata)', '169.254.169.254'],
    ['IPv6 link-local', 'fe80::1'],
    ['unique local', 'fd00::1'],
    ['unspecified', '0.0.0.0'],
    ['IPv6 unspecified', '::'],
    ['carrier-grade NAT', '100.64.0.1'],
    ['NAT64 of a private address', '64:ff9b::a00:1'],
    ['broadcast', '255.255.255.255'],
    ['multicast', '224.0.0.1'],
    ['not an address', 'example.com'],
  ])('refuses %s %s', (_label, address) => {
    expect(isPublicAddress(address)).toBe(false);
  });
});
