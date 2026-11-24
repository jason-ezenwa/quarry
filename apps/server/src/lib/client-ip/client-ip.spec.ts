import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getClientIp, resolveClientIp } from './client-ip';
import {
  RESOLVED_CLIENT_IP_HEADER,
  UNKNOWN_CLIENT_KEY,
} from './client-ip.constants';

const EDGE_HEADER = 'cf-connecting-ip';
const PROXY_PEER = '10.0.0.5';

const reqWith = (
  headers: Record<string, string | string[] | undefined>,
  remoteAddress: string | undefined = PROXY_PEER,
) => ({ headers, socket: { remoteAddress } });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getClientIp', () => {
  describe('with a trusted edge header configured', () => {
    beforeEach(() => {
      vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', 'CF-Connecting-IP');
    });

    it('uses the edge header', () => {
      expect(getClientIp(reqWith({ [EDGE_HEADER]: '102.88.168.221' }))).toBe(
        '102.88.168.221',
      );
    });

    it('ignores X-Forwarded-For', () => {
      const req = reqWith({
        [EDGE_HEADER]: '102.88.168.221',
        'x-forwarded-for': '203.0.113.7, 102.88.168.221',
      });

      expect(getClientIp(req)).toBe('102.88.168.221');
    });

    it('groups IPv6 addresses by /64', () => {
      const a = getClientIp(reqWith({ [EDGE_HEADER]: '2001:db8:abcd:12::1' }));
      const b = getClientIp(
        reqWith({ [EDGE_HEADER]: '2001:DB8:ABCD:12:ffff:eeee:dddd:cccc' }),
      );
      const otherPrefix = getClientIp(
        reqWith({ [EDGE_HEADER]: '2001:db8:abcd:13::1' }),
      );

      expect(b).toBe(a);
      expect(otherPrefix).not.toBe(a);
    });

    it('unwraps IPv4-mapped IPv6', () => {
      expect(getClientIp(reqWith({ [EDGE_HEADER]: '::ffff:192.0.2.1' }))).toBe(
        '192.0.2.1',
      );
    });

    it.each([
      ['a list of addresses', '203.0.113.7, 198.51.100.1'],
      ['a non-IP value', 'not-an-ip'],
      ['a repeated header', ['203.0.113.7', '198.51.100.1']],
      ['no header', undefined],
    ])('falls back to the socket peer for %s', (_label, value) => {
      expect(getClientIp(reqWith({ [EDGE_HEADER]: value }))).toBe(PROXY_PEER);
    });
  });

  describe('with no trusted header configured', () => {
    beforeEach(() => {
      vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', '');
    });

    it('ignores every header a caller can send and uses the socket peer', () => {
      const req = reqWith({
        [EDGE_HEADER]: '203.0.113.9',
        'x-forwarded-for': '203.0.113.7',
      });

      expect(getClientIp(req)).toBe(PROXY_PEER);
    });

    it('unwraps an IPv4-mapped socket address', () => {
      expect(getClientIp(reqWith({}, '::ffff:127.0.0.1'))).toBe('127.0.0.1');
    });

    it('returns a fixed key when no address is known', () => {
      expect(getClientIp({ headers: {}, socket: {} })).toBe(UNKNOWN_CLIENT_KEY);
    });
  });
});

describe('resolveClientIp', () => {
  it('overwrites a caller-supplied resolved header', () => {
    vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', EDGE_HEADER);
    const req = reqWith({
      [EDGE_HEADER]: '102.88.168.221',
      [RESOLVED_CLIENT_IP_HEADER]: '203.0.113.7',
    });
    const next = vi.fn();

    resolveClientIp(req as unknown as Request, {} as Response, next);

    expect(req.headers[RESOLVED_CLIENT_IP_HEADER]).toBe('102.88.168.221');
    expect(next).toHaveBeenCalledOnce();
  });
});
