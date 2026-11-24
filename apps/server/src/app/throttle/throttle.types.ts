import type { RequestLike } from '../../lib/client-ip/client-ip.types';

export type SessionRequest = RequestLike & {
  session?: { user?: { id?: string } };
};
