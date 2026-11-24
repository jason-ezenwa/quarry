import { Types } from 'mongoose';
import { OBJECT_ID_PATTERN } from './common.constants';

// An id from a URL; anything that isn't one can only be a 404.
export function parseObjectId(id: string): Types.ObjectId | null {
  return OBJECT_ID_PATTERN.test(id) ? new Types.ObjectId(id) : null;
}
