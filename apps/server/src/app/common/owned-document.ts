import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { SessionContext } from './common.types';
import { parseObjectId } from './object-id';

export type OwnedDocumentFilter = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  session: Types.ObjectId;
};

// Matches a document only in this user's session; null when either id from
// the URL can't be one.
export function ownedDocumentFilter(
  { userId, sessionId }: SessionContext,
  documentId: string,
): OwnedDocumentFilter | null {
  const id = parseObjectId(documentId);
  const session = parseObjectId(sessionId);

  return id && session
    ? { _id: id, user: new Types.ObjectId(userId), session }
    : null;
}

export function documentNotFound(): NotFoundException {
  return new NotFoundException('Document not found');
}
