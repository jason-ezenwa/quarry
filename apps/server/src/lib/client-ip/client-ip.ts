import { isIP } from 'node:net';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import ipaddr from 'ipaddr.js';
import { isDeployedEnv } from '../app-env';
import {
  IPV6_PREFIX_GROUPS,
  RESOLVED_CLIENT_IP_HEADER,
  UNKNOWN_CLIENT_KEY,
} from './client-ip.constants';
import type { RequestLike } from './client-ip.types';

// When unset, no header is trusted.
function trustedHeaderName(): string | undefined {
  return (
    process.env.TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase() || undefined
  );
}

// IPv4 as is, IPv4-mapped IPv6 unwrapped, other IPv6 reduced to its /64.
function toRateLimitKey(ip: string): string {
  const address = ipaddr.process(ip);

  if (address instanceof ipaddr.IPv4) {
    return address.toString();
  }

  const parts = address.parts.map((part, index) =>
    index < IPV6_PREFIX_GROUPS ? part : 0,
  );

  return new ipaddr.IPv6(parts).toNormalizedString();
}

// Never reads X-Forwarded-For, which any caller can set.
export function getClientIp(req: RequestLike): string {
  const headerName = trustedHeaderName();
  const header = headerName ? req.headers[headerName] : undefined;
  const fromHeader = typeof header === 'string' ? header.trim() : '';

  if (isIP(fromHeader)) {
    return toRateLimitKey(fromHeader);
  }

  const peer = req.socket?.remoteAddress ?? '';
  return isIP(peer) ? toRateLimitKey(peer) : UNKNOWN_CLIENT_KEY;
}

export function resolveClientIp(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  req.headers[RESOLVED_CLIENT_IP_HEADER] = getClientIp(req);
  next();
}

// Behind a proxy, the socket peer is the proxy, so every client would share it.
export function warnIfTrustedHeaderUnset(): void {
  if (isDeployedEnv() && !trustedHeaderName()) {
    new Logger('ClientIp').warn(
      'TRUSTED_CLIENT_IP_HEADER is not set, so rate limits key on the proxy address',
    );
  }
}
