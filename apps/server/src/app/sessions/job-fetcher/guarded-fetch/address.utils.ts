import ipaddr from 'ipaddr.js';

// Only ordinary internet addresses: every private, loopback, link-local,
// unspecified, reserved or translated range is refused.
export function isPublicAddress(address: string): boolean {
  if (!ipaddr.isValid(address)) return false;

  return ipaddr.process(address).range() === 'unicast';
}
