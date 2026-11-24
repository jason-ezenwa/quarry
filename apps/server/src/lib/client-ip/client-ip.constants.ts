// Better Auth only reads headers; resolveClientIp overwrites whatever a caller sent.
export const RESOLVED_CLIENT_IP_HEADER = 'x-quarry-client-ip';

// Key for a request with no usable address, so it is still limited.
export const UNKNOWN_CLIENT_KEY = 'unknown';

// IPv6 clients are grouped by their /64, the usual allocation per subscriber.
export const IPV6_PREFIX_GROUPS = 4;
