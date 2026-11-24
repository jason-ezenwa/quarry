import { Types } from 'mongoose';

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

// An id from a URL; anything that isn't one can only be a 404.
export function parseObjectId(id: string): Types.ObjectId | null {
  return OBJECT_ID_PATTERN.test(id) ? new Types.ObjectId(id) : null;
}
