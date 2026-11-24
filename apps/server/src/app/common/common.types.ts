import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { Types } from 'mongoose';
import type { auth } from '../../lib/auth';

export type SessionUser = UserSession<typeof auth>['user'];

// The user and agent session a request acts for, taken from the
// signed-in request, never from the model.
export type SessionContext = {
  userId: string;
  sessionId: string;
};

export type OwnedDocumentFilter = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  session: Types.ObjectId;
};
